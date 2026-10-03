-- Incremental migration for the KosKu revision 2.0 schema. Run base/*.sql first on a NEW project only.
alter table public.owner_profiles add column address text not null default '';
alter table public.profiles add column push_enabled boolean not null default false;
alter table public.conversation_participants add column last_read_at timestamptz;
create table public.owner_requests (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 booking_id uuid not null references public.bookings(id), reason text not null check(length(trim(reason)) between 5 and 2000),
 status text not null default 'OPEN' check(status in ('OPEN','INVESTIGATING','RESOLVED','REJECTED')),
 resolution_note text, created_at timestamptz not null default now()
);
create unique index owner_request_open on public.owner_requests(booking_id) where status in ('OPEN','INVESTIGATING');
alter table public.owner_requests enable row level security;
create policy owner_requests_select on public.owner_requests for select to authenticated using(owner_id=auth.uid() or private.is_admin());
grant select on public.owner_requests to authenticated;

create function private.owner_actor() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and status='ACTIVE')
 then raise exception 'Sesi tidak aktif. Silakan masuk kembali.'; end if;
 return actor;
end $$;
create function private.owner_property(pid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.properties where id=pid and owner_id=private.owner_actor() and deleted_at is null)
 then raise exception 'Properti tidak ditemukan atau bukan milik Anda.';end if;
end $$;
create function private.owner_room(rid uuid) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin select property_id into pid from public.room_types where id=rid;perform private.owner_property(pid);end $$;
create function private.owner_audit(action_name text,target uuid,details jsonb default '{}'::jsonb) returns void language sql security definer set search_path='' as $$
 insert into public.audit_logs(actor_id,action,target_id,metadata) values(auth.uid(),action_name,target,details);
$$;
create function public.owner_bootstrap() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Login diperlukan.';end if;
 insert into public.profiles(id,full_name) values(actor,'Pemilik Kos') on conflict(id) do nothing;
 perform private.owner_actor();
 insert into public.user_roles(user_id,role) values(actor,'USER'),(actor,'OWNER') on conflict do nothing;
 insert into public.owner_profiles(user_id,display_name) values(actor,'Pemilik Kos') on conflict(user_id) do nothing;
end $$;

create function private.owner_properties() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('photos',coalesce((select jsonb_agg(m.storage_path order by m.sort_order) from public.property_media m where m.property_id=p.id),'[]'::jsonb),'facilities',coalesce((select jsonb_agg(f.name order by f.name) from public.property_facilities pf join public.facilities f on f.id=pf.facility_id where pf.property_id=p.id),'[]'::jsonb),'review_reason',(select v.review_reason from public.verification_submissions v where v.property_id=p.id order by v.submitted_at desc limit 1)) order by p.created_at desc),'[]'::jsonb) from public.properties p where p.owner_id=auth.uid() and p.deleted_at is null;
$$;
create function private.owner_rooms() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('facilities',coalesce((select jsonb_agg(f.name order by f.name) from public.room_type_facilities rf join public.facilities f on f.id=rf.facility_id where rf.room_type_id=r.id),'[]'::jsonb),'inventory',to_jsonb(i)||jsonb_build_object('hold',coalesce((select sum(a.quantity) from public.inventory_allocations a where a.room_type_id=r.id and a.kind='HOLD' and a.released_at is null and a.expires_at>now()),0),'reserved',coalesce((select sum(a.quantity) from public.inventory_allocations a where a.room_type_id=r.id and a.kind='RESERVED' and a.released_at is null),0)))),'[]'::jsonb) from public.room_types r join public.properties p on p.id=r.property_id join public.room_type_inventory i on i.room_type_id=r.id where p.owner_id=auth.uid() and p.deleted_at is null;
$$;
create function private.owner_bookings() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object('tenant',coalesce(u.full_name,'Akun dihapus'),'property_id',r.property_id,'payment_status',coalesce((select x.status::text from public.payments x where x.booking_id=b.id order by x.created_at desc limit 1),'BELUM ADA'),'refund_status',coalesce((select x.status::text from public.refunds x join public.payments y on y.id=x.payment_id where y.booking_id=b.id order by x.created_at desc limit 1),'—'),'events',coalesce((select jsonb_agg(jsonb_build_object('to_status',e.to_status,'reason',e.reason,'created_at',e.created_at) order by e.created_at desc) from public.booking_events e where e.booking_id=b.id),'[]'::jsonb)) order by b.created_at desc),'[]'::jsonb) from public.bookings b join public.room_types r on r.id=b.room_type_id join public.properties p on p.id=r.property_id left join public.profiles u on u.id=b.user_id where p.owner_id=auth.uid();
$$;
create function private.owner_finance() returns jsonb language sql stable security definer set search_path='' as $$
 with relevant as (select b.* from public.bookings b join public.room_types r on r.id=b.room_type_id join public.properties p on p.id=r.property_id where p.owner_id=auth.uid()),
 paid as (select x.* from public.payments x join relevant b on b.id=x.booking_id where x.status in ('SUCCESS','REFUND_PENDING','REFUNDED')),
 booked as (select b.* from relevant b where exists(select 1 from paid p where p.booking_id=b.id))
 select jsonb_build_object('rent_received',coalesce((select sum(down_payment_snapshot) from booked),0),'deposit_held',coalesce((select sum(security_deposit_snapshot) from booked),0),'refund_amount',coalesce((select sum(r.amount) from public.refunds r join paid p on p.id=r.payment_id where r.status='SUCCESS'),0),'payout_amount',coalesce((select sum(owner_amount) from public.payout_simulations where owner_id=auth.uid() and status='SIMULATED_PAID'),0),'items',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'label',p.order_id,'amount',p.gross_amount,'status',p.status)) from paid p),'[]'::jsonb));
$$;
create function public.owner_read(section text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.owner_actor(); result jsonb;
begin
 case section
 when 'profile' then select jsonb_build_object('id',p.id,'full_name',p.full_name,'phone',coalesce(p.phone,''),'email',u.email,'address',o.address,'verification_status',o.verification_status,'push_enabled',p.push_enabled,'review_reason',(select v.review_reason from public.verification_submissions v where v.owner_profile_id=o.id order by v.submitted_at desc limit 1)) into result from public.profiles p join auth.users u on u.id=p.id join public.owner_profiles o on o.user_id=p.id where p.id=actor;
 when 'properties' then result:=private.owner_properties();
 when 'rooms' then result:=private.owner_rooms();
 when 'plans' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from public.pricing_plans x where private.owns_room(x.room_type_id);
 when 'bookings' then result:=private.owner_bookings();
 when 'finance' then result:=private.owner_finance();
 when 'reviews' then select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('tenant',coalesce(p.full_name,'Penyewa'))),'[]'::jsonb) into result from public.reviews r left join public.profiles p on p.id=r.user_id where private.owns_property(r.property_id) and r.moderation_status='APPROVED';
 when 'dashboard' then result:=jsonb_build_object('properties',private.owner_properties(),'rooms',private.owner_rooms(),'bookings',private.owner_bookings(),'reviews',public.owner_read('reviews'),'finance',private.owner_finance(),'activities',public.owner_read('notices'));
 when 'notices' then select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) into result from (select * from public.notifications where recipient_id=actor order by created_at desc limit 100) n;
 when 'reports' then select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]'::jsonb) into result from (select to_jsonb(r) x from public.reports r where reporter_id=actor union all select to_jsonb(r)||jsonb_build_object('target_type','BOOKING','target_id',booking_id,'category','OWNER_EXCEPTION','description',reason) x from public.owner_requests r where owner_id=actor) q;
 when 'restrictions' then select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from public.user_restrictions r where owner_id=actor;
 when 'conversations' then select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('tenant',coalesce(u.full_name,'Akun dihapus'),'property_name',p.name,'last_message',coalesce((select coalesce(m.text_content,'Foto') from public.messages m where m.conversation_id=c.id order by m.created_at desc limit 1),''),'unread',(select count(*) from public.messages m where m.conversation_id=c.id and m.sender_id<>actor and m.created_at>coalesce(cp.last_read_at,'epoch'::timestamptz)))),'[]'::jsonb) into result from public.conversations c join public.conversation_participants cp on cp.conversation_id=c.id and cp.user_id=actor join public.properties p on p.id=c.property_id left join public.profiles u on u.id=c.user_id;
 when 'calls' then
 perform public.communication_expire();
 select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb) into result from (select * from public.calls where private.in_conversation(conversation_id) order by created_at desc limit 100) c;
 else raise exception 'Section tidak valid.';
 end case;return coalesce(result,'{}'::jsonb);
end $$;

create function public.owner_profile(action text,input jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.owner_actor(); oid uuid;
begin
 select id into oid from public.owner_profiles where user_id=actor;
 case action
 when 'save' then
 if coalesce(length(trim(input->>'full_name')),0) not between 2 and 150 or coalesce(length(trim(input->>'phone')),0) not between 5 and 25 then raise exception 'Nama dan telepon belum valid.';end if;
 update public.profiles set full_name=input->>'full_name',phone=input->>'phone' where id=actor;
 update public.owner_profiles set display_name=input->>'full_name',address=left(input->>'address',1000) where id=oid;
 when 'verify' then
 if not private.valid_owner_media(input->>'evidence','verification',null) then raise exception 'Bukti verifikasi tidak valid.';end if;
 update public.owner_profiles set verification_status='PENDING' where id=oid;
 insert into public.verification_submissions(target_type,owner_profile_id,submitted_by,evidence_path,description) values('OWNER',oid,actor,input->>'evidence','Bukti dummy untuk verifikasi administratif demo');
 when 'policies' then insert into public.policy_acceptances(user_id,policy_type,policy_version) values(actor,'PRIVACY_POLICY','demo-2.0'),(actor,'TERMS_AND_CONDITIONS','demo-2.0') on conflict do nothing;
 when 'delete' then
 if coalesce(length(trim(input->>'reason')),0)<5 then raise exception 'Tuliskan alasan minimal 5 karakter.';end if;
 if not exists(select 1 from public.deletion_requests where user_id=actor and status='REQUESTED') then insert into public.deletion_requests(user_id,reason) values(actor,left(input->>'reason',2000));end if;
 when 'push' then update public.profiles set push_enabled=(input->>'enabled')::boolean where id=actor;
 when 'device' then
 if (input->>'token') !~ '^Expo(nent)?PushToken\[' then raise exception 'Token push tidak valid.';end if;
 insert into public.device_tokens(user_id,token,platform,app_kind,installation_id) values(actor,input->>'token',(input->>'platform')::public.device_platform,'OWNER_APP',(input->>'installation')::uuid) on conflict(installation_id,app_kind) do update set user_id=actor,token=excluded.token,last_seen_at=now(),revoked_at=null;
 when 'logout' then update public.device_tokens set revoked_at=now() where user_id=actor and installation_id=(input->>'installation')::uuid and app_kind='OWNER_APP';
 when 'read' then update public.notifications set read_at=now() where id=(input->>'id')::uuid and recipient_id=actor;
 else raise exception 'Aksi tidak valid.';end case;
end $$;

create function private.owner_facilities(target uuid,names jsonb,kind text) returns void language plpgsql security definer set search_path='' as $$
declare label text; fid uuid;
begin
 if jsonb_array_length(coalesce(names,'[]'::jsonb))>20 then raise exception 'Maksimal 20 fasilitas.';end if;
 if kind='PROPERTY' then delete from public.property_facilities where property_id=target;else delete from public.room_type_facilities where room_type_id=target;end if;
 for label in select distinct trim(value) from jsonb_array_elements_text(coalesce(names,'[]'::jsonb)) loop
 if length(label) not between 1 and 80 then raise exception 'Nama fasilitas tidak valid.';end if;
 insert into public.facilities(name,category) values(label,kind::public.facility_category) on conflict(name,category) do update set name=excluded.name returning id into fid;
 if kind='PROPERTY' then insert into public.property_facilities values(target,fid);else insert into public.room_type_facilities values(target,fid);end if;
 end loop;
end $$;
create function public.owner_save_property(input jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.owner_actor(); pid uuid:=coalesce(nullif(input->>'id','')::uuid,gen_random_uuid()); existing public.properties; photo text; ord integer:=0;
begin
 if coalesce(length(trim(input->>'name')),0)<2 or coalesce(length(trim(input->>'address')),0)<5 or coalesce(length(trim(input->>'city')),0)<2 then raise exception 'Nama, alamat, dan kota wajib diisi.';end if;
 select * into existing from public.properties where id=pid for update;
 if found then perform private.owner_property(pid);if existing.publication_status in ('SUSPENDED','ARCHIVED') then raise exception 'Properti ditangguhkan/diarsipkan. Hubungi admin.';end if;end if;
 if input->>'publication_status' not in ('DRAFT','ACTIVE','INACTIVE') then raise exception 'Status tayang tidak diperbolehkan.';end if;
 insert into public.properties(id,owner_id,name,address,city,province,latitude,longitude,gender_type,description,rules,publication_status,verification_status)
 values(pid,actor,input->>'name',input->>'address',input->>'city',input->>'province',(input->>'latitude')::numeric,(input->>'longitude')::numeric,(input->>'gender_type')::public.gender_type,input->>'description',input->>'rules',(input->>'publication_status')::public.publication_status,'DRAFT')
 on conflict(id) do update set name=excluded.name,address=excluded.address,city=excluded.city,province=excluded.province,latitude=excluded.latitude,longitude=excluded.longitude,gender_type=excluded.gender_type,description=excluded.description,rules=excluded.rules,publication_status=excluded.publication_status,verification_status='PENDING';
 perform private.owner_facilities(pid,input->'facilities','PROPERTY');
 if jsonb_array_length(input->'photos')>12 then raise exception 'Maksimal 12 foto.';end if;
 delete from public.property_media where property_id=pid;
 for photo in select value from jsonb_array_elements_text(input->'photos') loop
 if not private.valid_owner_media(photo,'property',null) then raise exception 'Foto properti tidak valid.';end if;
 insert into public.property_media(property_id,storage_path,sort_order,is_cover) values(pid,photo,ord,ord=0);ord:=ord+1;
 end loop;
 perform private.owner_audit('OWNER_PROPERTY_SAVE',pid);return pid;
end $$;
create function public.owner_verify_property(pid uuid,evidence text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.owner_property(pid);
 if not private.valid_owner_media(evidence,'verification',null) then raise exception 'Bukti tidak valid.';end if;
 update public.properties set verification_status='PENDING' where id=pid;
 insert into public.verification_submissions(target_type,property_id,submitted_by,evidence_path) values('PROPERTY',pid,auth.uid(),evidence);
end $$;
create function public.owner_save_room(input jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(nullif(input->>'id','')::uuid,gen_random_uuid());pid uuid:=(input->>'property_id')::uuid;
begin
 perform private.owner_property(pid);
 if coalesce(length(trim(input->>'name')),0)<2 then raise exception 'Nama tipe wajib diisi.';end if;
 if exists(select 1 from public.room_types where id=rid) then perform private.owner_room(rid);if exists(select 1 from public.room_types where id=rid and property_id<>pid) then raise exception 'Tipe kamar tidak dapat dipindah.';end if;end if;
 insert into public.room_types(id,property_id,name,floor_label,room_size_m2,bathroom_type,description,is_active) values(rid,pid,input->>'name',input->>'floor_label',(input->>'room_size_m2')::numeric,(input->>'bathroom_type')::public.bathroom_type,input->>'description',(input->>'is_active')::boolean)
 on conflict(id) do update set name=excluded.name,floor_label=excluded.floor_label,room_size_m2=excluded.room_size_m2,bathroom_type=excluded.bathroom_type,description=excluded.description,is_active=excluded.is_active;
 insert into public.room_type_inventory(room_type_id,total) values(rid,coalesce((input#>>'{inventory,total}')::integer,0)) on conflict do nothing;
 perform private.owner_facilities(rid,input->'facilities','ROOM');perform private.owner_audit('OWNER_ROOM_SAVE',rid);return rid;
end $$;
create function public.owner_inventory(rid uuid,input jsonb,reason text) returns void language plpgsql security definer set search_path='' as $$
declare before_row public.room_type_inventory; active_count integer;
begin
 perform private.owner_room(rid);
 if coalesce(length(trim(reason)),0)<5 then raise exception 'Catatan penyesuaian minimal 5 karakter.';end if;
 select * into before_row from public.room_type_inventory where room_type_id=rid for update;
 if before_row.version<>(input->>'version')::integer then raise exception 'Data berubah. Muat ulang sebelum menyimpan.';end if;
 select count(*) into active_count from public.bookings where room_type_id=rid and status='ACTIVE';
 if (input->>'occupied')::integer<active_count then raise exception 'Penyewa aktif harus melalui checkout booking.';end if;
 update public.room_type_inventory set total=(input->>'total')::integer,occupied=(input->>'occupied')::integer,cleaning=(input->>'cleaning')::integer,maintenance=(input->>'maintenance')::integer,inactive=(input->>'inactive')::integer,version=version+1 where room_type_id=rid;
 insert into public.inventory_events(room_type_id,event_type,before_data,after_data,actor_id) values(rid,'OWNER_ADJUSTMENT',to_jsonb(before_row),input||jsonb_build_object('reason',left(reason,1000)),auth.uid());
end $$;
create function public.owner_save_plan(input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid:=coalesce(nullif(input->>'id','')::uuid,gen_random_uuid());rid uuid:=(input->>'room_type_id')::uuid;
begin
 perform private.owner_room(rid);
 if exists(select 1 from public.pricing_plans where id=pid and room_type_id<>rid) then raise exception 'Paket tidak dapat dipindah.';end if;
 if coalesce(length(trim(input->>'name')),0)<2 then raise exception 'Nama paket wajib diisi.';end if;
 insert into public.pricing_plans(id,room_type_id,name,duration_unit,duration_value,price,down_payment_type,down_payment_value,security_deposit_type,security_deposit_value,deposit_refundable,deposit_terms,is_active)
 values(pid,rid,input->>'name',(input->>'duration_unit')::public.duration_unit,(input->>'duration_value')::integer,(input->>'price')::bigint,(input->>'down_payment_type')::public.amount_type,(input->>'down_payment_value')::bigint,(input->>'security_deposit_type')::public.amount_type,(input->>'security_deposit_value')::bigint,(input->>'deposit_refundable')::boolean,input->>'deposit_terms',(input->>'is_active')::boolean)
 on conflict(id) do update set name=excluded.name,duration_unit=excluded.duration_unit,duration_value=excluded.duration_value,price=excluded.price,down_payment_type=excluded.down_payment_type,down_payment_value=excluded.down_payment_value,security_deposit_type=excluded.security_deposit_type,security_deposit_value=excluded.security_deposit_value,deposit_refundable=excluded.deposit_refundable,deposit_terms=excluded.deposit_terms,is_active=excluded.is_active;
 perform private.owner_audit('OWNER_PLAN_SAVE',pid);
end $$;
create function public.owner_booking(bid uuid,action text,reason text) returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; target public.booking_status; inv public.room_type_inventory;
begin
 select * into b from public.bookings where id=bid;
 perform private.owner_room(b.room_type_id);
 -- Same lock order as allocation and owner inventory updates: inventory, then booking.
 select * into inv from public.room_type_inventory where room_type_id=b.room_type_id for update;
 select * into b from public.bookings where id=bid for update;
 if coalesce(length(trim(reason)),0)<5 then raise exception 'Catatan minimal 5 karakter.';end if;
 if action='exception' then
 if b.status not in ('CONFIRMED','ACTIVE') then raise exception 'Permintaan khusus hanya untuk booking confirmed/active.';end if;
 insert into public.owner_requests(owner_id,booking_id,reason) values(auth.uid(),bid,reason) on conflict do nothing;return;
 end if;
 if action='checkin' then target:='ACTIVE';elsif action='checkout' then target:='COMPLETED';else raise exception 'Aksi booking tidak valid.';end if;
 if b.status=target then return;end if;
 if (action='checkin' and b.status<>'CONFIRMED') or (action='checkout' and b.status<>'ACTIVE') then raise exception 'Status booking telah berubah.';end if;
 if action='checkin' then
 update public.inventory_allocations set released_at=now() where booking_id=bid and kind='RESERVED' and released_at is null;
 if not found then raise exception 'Alokasi confirmed tidak ditemukan. Hubungi admin.';end if;
 update public.room_type_inventory set occupied=occupied+1,version=version+1 where room_type_id=b.room_type_id;
 update public.bookings set status=target,checked_in_at=now() where id=bid;
 else
 update public.room_type_inventory set occupied=occupied-1,cleaning=cleaning+1,version=version+1 where room_type_id=b.room_type_id;
 update public.bookings set status=target,checked_out_at=now() where id=bid;
 end if;
 insert into public.booking_events(booking_id,from_status,to_status,actor_id,reason) values(bid,b.status,target,auth.uid(),reason);
 insert into public.inventory_events(room_type_id,booking_id,event_type,before_data,actor_id) values(b.room_type_id,bid,upper(action),to_jsonb(inv),auth.uid());
 insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id)
 select actor,bid||':'||target,'BOOKING','Status booking diperbarui','Buka aplikasi untuk melihat detail.','BOOKING',bid from unnest(array[b.user_id,auth.uid()]) actor where actor is not null on conflict do nothing;
end $$;

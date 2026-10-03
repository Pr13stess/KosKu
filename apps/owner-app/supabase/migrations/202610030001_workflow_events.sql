-- Block only NEW holds. Existing checkout/confirmed/active rights are preserved.
create function private.check_new_hold_restriction() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='HOLD' and exists(select 1 from public.bookings b join public.room_types r on r.id=b.room_type_id join public.properties p on p.id=r.property_id join public.user_restrictions x on x.owner_id=p.owner_id and x.user_id=b.user_id where b.id=new.booking_id and x.status='ACTIVE' and x.block_booking) then raise exception 'Booking baru dibatasi oleh owner.';end if;
 return new;
end $$;
create trigger owner_block_new_hold before insert on public.inventory_allocations for each row execute function private.check_new_hold_restriction();
create function public.communication_open(pid uuid,target_user uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.owner_actor(); p public.properties; tenant uuid; cid uuid;
begin
 select * into p from public.properties where id=pid and deleted_at is null;
 if p.id is null then raise exception 'Kos tidak tersedia.';end if;
 if actor=p.owner_id then
 tenant:=target_user;
 if not exists(select 1 from public.bookings b join public.room_types r on r.id=b.room_type_id where b.user_id=tenant and r.property_id=pid) then raise exception 'Pengguna belum terkait dengan booking kos ini.';end if;
 else tenant:=actor;if not private.is_public_property(pid) then raise exception 'Kos tidak tersedia.';end if;end if;
 if tenant=p.owner_id or tenant is null then raise exception 'Peserta tidak valid.';end if;
 insert into public.conversations(property_id,user_id,owner_id) values(pid,tenant,p.owner_id) on conflict(property_id,user_id,owner_id) do update set updated_at=public.conversations.updated_at returning id into cid;
 insert into public.conversation_participants(conversation_id,user_id) values(cid,tenant),(cid,p.owner_id) on conflict do nothing;
 perform private.communication_allowed(cid);
 return (select value from jsonb_array_elements(public.owner_read('conversations')) where value->>'id'=cid::text);
end $$;
revoke all on function public.communication_open(uuid,uuid) from public,anon;
grant execute on function public.communication_open(uuid,uuid) to authenticated;

create function private.owner_status_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; owner_uuid uuid; object_id uuid; kind text; title_value text; event text;
begin
 if tg_table_name='verification_submissions' and new.status is distinct from old.status and new.status::text in('APPROVED','REJECTED') then recipient:=new.submitted_by;object_id:=coalesce(new.property_id,new.owner_profile_id);kind:=case when new.property_id is null then 'OWNER' else 'PROPERTY' end;title_value:='Hasil verifikasi diperbarui';event:='verification:'||new.id||':'||new.status;
 elsif tg_table_name='reports' and new.status is distinct from old.status then recipient:=new.reporter_id;object_id:=new.id;kind:='REPORT';title_value:='Status laporan diperbarui';event:='report:'||new.id||':'||new.status;
 elsif tg_table_name='owner_requests' and new.status is distinct from old.status then recipient:=new.owner_id;object_id:=new.booking_id;kind:='BOOKING';title_value:='Permintaan khusus diperbarui';event:='request:'||new.id||':'||new.status;
 elsif tg_table_name='bookings' and new.status is distinct from old.status and new.status::text in('CONFIRMED','CANCELLED') then
 select p.owner_id into owner_uuid from public.room_types r join public.properties p on p.id=r.property_id where r.id=new.room_type_id;
 insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) select x,'booking:'||new.id||':'||new.status,'BOOKING','Status booking diperbarui','Buka aplikasi untuk melihat detail.','BOOKING',new.id from unnest(array[new.user_id,owner_uuid]) x where x is not null on conflict do nothing;return new;
 end if;
 if recipient is not null then insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) values(recipient,event,kind,title_value,'Buka aplikasi untuk melihat detail.',kind,object_id) on conflict do nothing;end if;return new;
end $$;
create trigger owner_verification_notice after update on public.verification_submissions for each row execute function private.owner_status_notifications();
create trigger owner_report_notice after update on public.reports for each row execute function private.owner_status_notifications();
create trigger owner_request_notice after update on public.owner_requests for each row execute function private.owner_status_notifications();
create trigger owner_booking_notice after update on public.bookings for each row execute function private.owner_status_notifications();
revoke all on function private.owner_status_notifications(),private.check_new_hold_restriction() from public,anon,authenticated;

create function private.owner_financial_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare bid uuid; recipient uuid; owner_uuid uuid; event text;
begin
 if new.status is not distinct from old.status then return new;end if;
 if tg_table_name='refunds' then select booking_id into bid from public.payments where id=new.payment_id;else bid:=new.booking_id;end if;
 select b.user_id,p.owner_id into recipient,owner_uuid from public.bookings b join public.room_types r on r.id=b.room_type_id join public.properties p on p.id=r.property_id where b.id=bid;
 event:=tg_table_name||':'||new.id||':'||new.status;
 insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) select x,event,'PAYMENT','Transaksi simulasi diperbarui','Buka aplikasi untuk melihat detail.','BOOKING',bid from unnest(array[recipient,owner_uuid]) x where x is not null on conflict do nothing;
 return new;
end $$;
create trigger owner_payment_notice after update on public.payments for each row execute function private.owner_financial_notifications();
create trigger owner_refund_notice after update on public.refunds for each row execute function private.owner_financial_notifications();
create trigger owner_payout_notice after update on public.payout_simulations for each row execute function private.owner_financial_notifications();
revoke all on function private.owner_financial_notifications() from public,anon,authenticated;
grant all on public.owner_requests to service_role;

-- Profile fields may be initialized from signup metadata; metadata never controls roles or verification.
create or replace function public.owner_bootstrap() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();meta jsonb;
begin
 if actor is null then raise exception 'Login diperlukan.';end if;
 select raw_user_meta_data into meta from auth.users where id=actor;
 insert into public.profiles(id,full_name,phone) values(actor,coalesce(nullif(left(meta->>'full_name',120),''),'Pemilik Kos'),left(meta->>'phone',30)) on conflict(id) do nothing;
 perform private.owner_actor();
 insert into public.user_roles(user_id,role) values(actor,'USER'),(actor,'OWNER') on conflict do nothing;
 insert into public.owner_profiles(user_id,display_name) select actor,full_name from public.profiles where id=actor on conflict(user_id) do nothing;
 if meta->>'owner_demo_policy'='demo-2.0' then insert into public.policy_acceptances(user_id,policy_type,policy_version) values(actor,'PRIVACY_POLICY','demo-2.0'),(actor,'TERMS_AND_CONDITIONS','demo-2.0') on conflict do nothing;end if;
end $$;

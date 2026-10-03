alter table public.calls add column caller_seen_at timestamptz;
alter table public.calls add column receiver_seen_at timestamptz;
create function private.communication_allowed(cid uuid) returns public.conversations language plpgsql security definer set search_path='' as $$
declare c public.conversations; actor uuid:=private.owner_actor();
begin
 select * into c from public.conversations where id=cid;
 if c.id is null or not private.in_conversation(cid) then raise exception 'Bukan peserta percakapan.';end if;
 if exists(select 1 from public.profiles where id in(c.owner_id,c.user_id) and status<>'ACTIVE') or c.owner_id is null or c.user_id is null then raise exception 'Akun lawan bicara tidak aktif.';end if;
 if exists(select 1 from public.user_restrictions where owner_id=c.owner_id and user_id=c.user_id and status='ACTIVE' and block_communication) then raise exception 'Komunikasi dengan pengguna ini dibatasi.';end if;
 return c;
end $$;
create function private.call_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status not in ('RINGING','CONNECTED') and old.status in ('RINGING','CONNECTED') then
 insert into public.messages(conversation_id,sender_id,message_type,text_content,client_message_id) values(new.conversation_id,new.caller_id,'CALL_EVENT','Panggilan '||new.call_type||' • '||new.status||' • '||new.duration_seconds||' detik',new.id) on conflict do nothing;
 if new.status='MISSED' then insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) values(new.receiver_id,'missed:'||new.id,'CALL','Panggilan tak terjawab','Buka aplikasi untuk melihat riwayat.','CALL',new.id) on conflict do nothing;end if;
 end if;return new;
end $$;
create trigger communication_call_event after update on public.calls for each row execute function private.call_event();
create function public.communication_expire() returns void language sql security definer set search_path='' as $$
 update public.calls set status=case when status='RINGING' then 'MISSED'::public.call_status else 'FAILED'::public.call_status end,ended_at=now(),duration_seconds=case when answered_at is null then 0 else greatest(0,extract(epoch from now()-answered_at)::integer) end
 where (status='RINGING' and created_at<now()-interval '45 seconds') or (status='CONNECTED' and least(coalesce(caller_seen_at,answered_at),coalesce(receiver_seen_at,answered_at))<now()-interval '90 seconds');
$$;
create function public.communication_messages(cid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.owner_actor();if not private.in_conversation(cid) then raise exception 'Bukan peserta percakapan.';end if;
 update public.conversation_participants set last_read_at=now() where conversation_id=cid and user_id=auth.uid();
 select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at),'[]'::jsonb) into result from (select * from public.messages where conversation_id=cid order by created_at desc limit 300) m;return result;
end $$;
create function public.communication_send(cid uuid,content text,image_path text,client_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.conversations; recipient uuid; mid uuid;
begin
 c:=private.communication_allowed(cid);
 if exists(select 1 from public.messages where sender_id=auth.uid() and client_message_id=client_id) then return;end if;
 if (select count(*) from public.messages where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception 'Terlalu banyak pesan. Coba sebentar lagi.';end if;
 if nullif(image_path,'') is not null then
 if not private.valid_owner_media(image_path,'chat',cid) then raise exception 'Lampiran tidak valid.';end if;
 elsif coalesce(length(trim(content)),0) not between 1 and 4000 then raise exception 'Pesan harus berisi 1–4000 karakter.';end if;
 insert into public.messages(conversation_id,sender_id,message_type,text_content,storage_path,client_message_id) values(cid,auth.uid(),case when nullif(image_path,'') is null then 'TEXT'::public.message_type else 'IMAGE'::public.message_type end,nullif(content,''),nullif(image_path,''),client_id) on conflict do nothing returning id into mid;
 if mid is null then return;end if;
 recipient:=case when auth.uid()=c.owner_id then c.user_id else c.owner_id end;
 insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) values(recipient,'message:'||mid,'CHAT','Pesan baru','Buka percakapan untuk membaca pesan.','CHAT',cid) on conflict do nothing;
end $$;
create function public.communication_start(cid uuid,kind public.call_type) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.conversations; result public.calls; recipient uuid;
begin
 c:=private.communication_allowed(cid);recipient:=case when auth.uid()=c.owner_id then c.user_id else c.owner_id end;
 -- Serialize both participant identities in stable order to prevent simultaneous calls.
 perform pg_advisory_xact_lock(hashtextextended(least(c.owner_id::text,c.user_id::text),0));
 perform pg_advisory_xact_lock(hashtextextended(greatest(c.owner_id::text,c.user_id::text),0));
 perform public.communication_expire();
 if exists(select 1 from public.calls where status in ('RINGING','CONNECTED') and (caller_id in(c.owner_id,c.user_id) or receiver_id in(c.owner_id,c.user_id))) then raise exception 'Salah satu peserta sedang dalam panggilan.';end if;
 if (select count(*) from public.calls where caller_id=auth.uid() and created_at>now()-interval '1 minute')>=4 then raise exception 'Terlalu banyak percobaan panggilan.';end if;
 insert into public.calls(conversation_id,caller_id,receiver_id,call_type,agora_channel_id,started_at) values(cid,auth.uid(),recipient,kind,'kosku_'||replace(gen_random_uuid()::text,'-',''),now()) returning * into result;
 insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) values(recipient,'incoming:'||result.id,'CALL','Panggilan masuk','Buka aplikasi untuk menerima panggilan.','CALL',result.id) on conflict do nothing;
 return to_jsonb(result);
end $$;
create function public.communication_call(call_id uuid,action text) returns void language plpgsql security definer set search_path='' as $$
declare c public.calls; target public.call_status;
begin
 perform private.owner_actor();perform public.communication_expire();select * into c from public.calls where id=call_id for update;
 if c.id is null or auth.uid() not in(c.caller_id,c.receiver_id) then raise exception 'Bukan peserta panggilan.';end if;
 if c.status not in('RINGING','CONNECTED') then return;end if;
 if action='ping' then update public.calls set caller_seen_at=case when caller_id=auth.uid() then now() else caller_seen_at end,receiver_seen_at=case when receiver_id=auth.uid() then now() else receiver_seen_at end where id=call_id;return;end if;
 if action in ('accept','decline') and auth.uid()<>c.receiver_id then raise exception 'Hanya penerima dapat menerima/menolak.';end if;
 if action='accept' then
 perform private.communication_allowed(c.conversation_id);
 if c.status='CONNECTED' then return;end if;
 update public.calls set status='CONNECTED',answered_at=now(),caller_seen_at=now(),receiver_seen_at=now() where id=call_id;return;
 end if;
 if action='decline' then if c.status<>'RINGING' then raise exception 'Panggilan sudah terhubung.';end if;target:='DECLINED';
 elsif action='fail' then target:='FAILED';elsif action='end' then target:=case when c.status='CONNECTED' then 'COMPLETED'::public.call_status else 'CANCELLED'::public.call_status end;else raise exception 'Aksi tidak valid.';end if;
 update public.calls set status=target,ended_at=now(),duration_seconds=case when answered_at is null then 0 else greatest(0,extract(epoch from now()-answered_at)::integer) end where id=call_id;
end $$;
create function public.communication_restrict(input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.owner_actor(); target uuid:=(input->>'user_id')::uuid;
begin
 if not exists(select 1 from public.conversations where owner_id=actor and user_id=target) then raise exception 'Pengguna tidak terkait dengan kos Anda.';end if;
 if input->>'status'='REVOKED' then update public.user_restrictions set status='REVOKED' where owner_id=actor and user_id=target and status='ACTIVE';
 else
 insert into public.user_restrictions(owner_id,user_id,block_communication,block_booking,reason,notes) values(actor,target,(input->>'block_communication')::boolean,(input->>'block_booking')::boolean,(input->>'reason')::public.restriction_reason,left(input->>'notes',2000)) on conflict(owner_id,user_id) where status='ACTIVE' do update set block_communication=excluded.block_communication,block_booking=excluded.block_booking,reason=excluded.reason,notes=excluded.notes;
 end if;
 perform private.owner_audit('OWNER_RESTRICTION',target,jsonb_build_object('status',input->>'status'));
 insert into public.notifications(recipient_id,event_key,type,title,body,target_type,target_id) values(actor,gen_random_uuid()::text,'RESTRICTION','Pembatasan diperbarui','Booking yang sudah ada tetap berlaku.','RESTRICTION',target);
end $$;
create function public.owner_report(input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.owner_actor(); target uuid:=(input->>'target_id')::uuid; kind text:=input->>'target_type';
begin
 if kind='USER' then
 if not exists(select 1 from public.conversations where owner_id=actor and user_id=target) then raise exception 'Pengguna tidak terkait.';end if;
 elsif kind='MESSAGE' then
 if not exists(select 1 from public.messages where id=target and private.in_conversation(conversation_id)) then raise exception 'Pesan tidak dapat diakses.';end if;
 elsif kind='REVIEW' then
 if not exists(select 1 from public.reviews where id=target and private.owns_property(property_id)) then raise exception 'Ulasan tidak terkait.';end if;
 else raise exception 'Target laporan tidak didukung owner.';end if;
 if coalesce(length(trim(input->>'description')),0) not between 5 and 2000 then raise exception 'Uraian harus berisi 5–2000 karakter.';end if;
 if nullif(input->>'evidence_path','') is not null and not private.valid_owner_media(input->>'evidence_path','report',null) then raise exception 'Bukti tidak valid.';end if;
 insert into public.reports(reporter_id,target_type,target_id,category,description,evidence_path) values(actor,kind::public.report_target,target,(input->>'category')::public.report_category,input->>'description',nullif(input->>'evidence_path',''));
end $$;

-- Publish changes with RLS enforced by Realtime; polling is also used for reconnects.
do $$ declare t text;begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 foreach t in array array['messages','calls','notifications','bookings'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;end if;
end $$;

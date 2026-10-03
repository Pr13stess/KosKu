-- Only the validated upload Edge Function writes object metadata and objects.
create table public.owner_uploads (
 path text primary key, owner_id uuid not null references public.profiles(id),
 purpose text not null check(purpose in('property','verification','chat','report')),
 context_id uuid references public.conversations(id), created_at timestamptz not null default now()
);
alter table public.owner_uploads enable row level security;
create policy owner_uploads_select on public.owner_uploads for select to authenticated using(owner_id=auth.uid());
grant select on public.owner_uploads to authenticated;
create function private.valid_owner_media(path_value text,purpose_value text,context_value uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.owner_uploads where path=path_value and owner_id=auth.uid() and purpose=purpose_value and context_id is not distinct from context_value);
$$;
create function private.owner_media_read(path_value text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.owner_uploads u where u.path=path_value and (
 u.owner_id=auth.uid() or
 (u.purpose='chat' and private.in_conversation(u.context_id) and exists(select 1 from public.messages m where m.storage_path=u.path)) or
 (u.purpose='property' and exists(select 1 from public.property_media m where m.storage_path=u.path and private.is_public_property(m.property_id))) or
 (u.purpose='verification' and private.is_admin()) or
 (u.purpose='report' and private.is_admin() and exists(select 1 from public.reports r where r.evidence_path=u.path and r.handled_by=auth.uid()))));
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('owner-media','owner-media',false,5242880,array['image/jpeg','image/png']) on conflict(id) do nothing;
create policy owner_media_select on storage.objects for select to anon,authenticated using(bucket_id='owner-media' and private.owner_media_read('owner-media/'||name));

-- Push outbox: worker-only writes. Each notification/token pair is processed independently.
create table public.owner_push_deliveries (
 notification_id uuid not null references public.notifications(id) on delete cascade,
 device_token_id uuid not null references public.device_tokens(id) on delete cascade,
 ticket_id text, status text not null default 'PENDING', attempts integer not null default 0,
 last_attempt_at timestamptz, primary key(notification_id,device_token_id)
);
alter table public.owner_push_deliveries enable row level security;
create policy owner_push_deliveries_select on public.owner_push_deliveries for select to authenticated using(private.is_admin());
grant select on public.owner_push_deliveries to authenticated;
create function public.owner_push_queue() returns table(notification_id uuid,device_token_id uuid,token text,title text,body text,target_type text,target_id uuid) language plpgsql security definer set search_path='' as $$
begin
 insert into public.owner_push_deliveries(notification_id,device_token_id)
 select n.id,d.id from public.notifications n join public.device_tokens d on d.user_id=n.recipient_id join public.profiles p on p.id=n.recipient_id
 where p.push_enabled and p.status='ACTIVE' and d.revoked_at is null and n.created_at>now()-interval '1 day' on conflict do nothing;
 return query with picked as (
 select x.notification_id,x.device_token_id from public.owner_push_deliveries x where x.status in ('PENDING','RETRY') and x.attempts<5 and (x.last_attempt_at is null or x.last_attempt_at<now()-interval '2 minutes') order by x.last_attempt_at nulls first for update skip locked limit 50
 ), updated as (
 update public.owner_push_deliveries x set status='RETRY',attempts=attempts+1,last_attempt_at=now() from picked q where x.notification_id=q.notification_id and x.device_token_id=q.device_token_id returning x.notification_id,x.device_token_id
 ) select x.notification_id,x.device_token_id,d.token,n.title,n.body,n.target_type,n.target_id from updated x join public.notifications n on n.id=x.notification_id join public.device_tokens d on d.id=x.device_token_id where d.revoked_at is null and exists(select 1 from public.profiles p where p.id=d.user_id and p.push_enabled and p.status='ACTIVE');
end $$;

-- No direct client writes. Only narrow RPCs receive EXECUTE; secrets remain server-side.
revoke all on function public.owner_push_queue() from public,anon,authenticated;
grant execute on function public.owner_push_queue() to service_role;
do $$ declare f record;begin
 for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and (proname like 'owner_%' or proname like 'communication_%') and proname<>'owner_push_queue' loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
 for f in select oid::regprocedure signature from pg_proc where pronamespace='private'::regnamespace and (proname like 'owner_%' or proname in ('valid_owner_media','communication_allowed','call_event')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function private.owner_media_read(text) to anon,authenticated;
grant all on public.owner_uploads, public.owner_push_deliveries to service_role;
grant execute on function public.communication_expire() to service_role;

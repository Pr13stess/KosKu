-- Must return zero rows. Run in Supabase SQL Editor after migrations.
select c.relname as missing_select_policy from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and
(not c.relrowsecurity or not exists(select 1 from pg_policy p where p.polrelid=c.oid and p.polcmd in ('r','*')));

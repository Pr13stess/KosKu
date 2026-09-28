-- ============================================================
-- 22. AUTH PROVISIONING
--
-- First commit shipped Auth as an identity source only
-- (auth.users / auth.uid()) with no signup UI and no client
-- write grants. This migration adds the minimum needed for a
-- real signup/login flow without widening write access beyond
-- a user's own row:
--   1. A trigger that provisions profiles/user_roles rows the
--      moment a new auth.users row appears, so every signed-up
--      user has a matching profile without a client-side write.
--   2. A narrow security-definer RPC that lets a signed-in user
--      edit their own display fields, instead of granting a
--      blanket UPDATE policy on public.profiles.
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.profiles(id)
  values (new.id)
  on conflict (id) do nothing;
  insert into public.user_roles(user_id, role)
  values (new.id, 'USER')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create function public.update_own_profile(
  p_full_name varchar(120) default null,
  p_phone varchar(30) default null,
  p_campus_or_company varchar(150) default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
  set
    full_name = coalesce(p_full_name, full_name),
    phone = coalesce(p_phone, phone),
    campus_or_company = coalesce(p_campus_or_company, campus_or_company)
  where id = auth.uid();
end;
$$;
grant execute on function public.update_own_profile(varchar, varchar, varchar)
to authenticated;

-- Invoker views obey table RLS. Narrow definer helpers expose only approved
-- display data/counts, never profiles, booking identities or allocation rows.
create function private.public_owner_label(pid uuid) returns text language sql stable security definer set search_path='' as $$
 select o.display_name from public.owner_profiles o join public.properties p on p.owner_id=o.user_id
 where p.id=pid and private.is_public_property(pid);
$$;
create function private.public_available(rid uuid) returns integer language sql stable security definer set search_path='' as $$
 select greatest(0, i.total-i.occupied-i.cleaning-i.maintenance-i.inactive-coalesce((
 select sum(a.quantity) from public.inventory_allocations a where a.room_type_id=rid and a.released_at is null
 and (a.kind='RESERVED' or a.expires_at>now())),0))::integer
 from public.room_type_inventory i join public.room_types r on r.id=i.room_type_id
 where i.room_type_id=rid and r.is_active and private.is_public_property(r.property_id);
$$;
revoke all on function private.public_owner_label(uuid),private.public_available(uuid) from public;
grant execute on function private.public_owner_label(uuid),private.public_available(uuid) to anon,authenticated;

create view public.plan_catalog with (security_invoker=true) as
select p.id,p.room_type_id,p.name,p.duration_unit,p.duration_value,p.price,p.currency,
 case p.down_payment_type when 'NONE' then 0 when 'FIXED' then p.down_payment_value
 else round(p.price*p.down_payment_value/100.0)::bigint end as down_payment,
 case p.security_deposit_type when 'NONE' then 0 when 'FIXED' then p.security_deposit_value
 else round(p.price*p.security_deposit_value/100.0)::bigint end as security_deposit,
 p.deposit_refundable,p.deposit_terms
from public.pricing_plans p join public.room_types r on r.id=p.room_type_id
where p.is_active and r.is_active and private.is_public_property(r.property_id);

create view public.room_catalog with (security_invoker=true) as
select r.id,r.property_id,r.name,r.floor_label,r.room_size_m2,r.bathroom_type,r.description,
 coalesce(private.public_available(r.id),0) as available,
 coalesce((select jsonb_agg(f.name order by f.name) from public.room_type_facilities rf
 join public.facilities f on f.id=rf.facility_id where rf.room_type_id=r.id and f.is_active),'[]'::jsonb) as facilities,
 coalesce((select jsonb_agg(to_jsonb(p) order by p.duration_unit,p.duration_value,p.id)
 from public.plan_catalog p where p.room_type_id=r.id),'[]'::jsonb) as plans
from public.room_types r where r.is_active and private.is_public_property(r.property_id);

create view public.property_catalog with (security_invoker=true) as
select p.id,p.name,p.description,p.address,p.city,p.latitude,p.longitude,p.gender_type,p.rules,
 private.public_owner_label(p.id) as owner_name,
 coalesce((select jsonb_agg(m.storage_path order by m.sort_order,m.id) from public.property_media m where m.property_id=p.id),'[]'::jsonb) as images,
 coalesce((select jsonb_agg(f.name order by f.name) from public.property_facilities pf
 join public.facilities f on f.id=pf.facility_id where pf.property_id=p.id and f.is_active),'[]'::jsonb) as facilities,
 coalesce((select avg(r.rating)::numeric(3,2) from public.reviews r where r.property_id=p.id and r.moderation_status='APPROVED'),0) as rating,
 (select count(*)::integer from public.reviews r where r.property_id=p.id and r.moderation_status='APPROVED') as review_count,
 coalesce((select sum(r.available)::integer from public.room_catalog r where r.property_id=p.id),0) as available
from public.properties p where private.is_public_property(p.id);

grant select on public.plan_catalog,public.room_catalog,public.property_catalog to anon,authenticated;

create function public.haversine_km(lat1 double precision,lon1 double precision,lat2 double precision,lon2 double precision)
returns double precision language sql immutable strict set search_path='' as $$
 select 6371.0*2*asin(sqrt(least(1.0,greatest(0.0,
 power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lon2-lon1)/2),2)))));
$$;
-- Filter a single matching room and price period BEFORE aggregation: facilities,
-- availability and minimum price never come from unrelated room types.
create function public.search_properties(
 q text default '', period_unit public.duration_unit default 'MONTH', period_value integer default 1,
 gender public.gender_type default null, min_price bigint default 0, max_price bigint default 1000000000,
 min_rating numeric default 0, room_facilities text[] default '{}', property_facilities text[] default '{}',
 ref_lat double precision default null, ref_lon double precision default null,
 max_distance double precision default null, sort_by text default 'recommended', page_number integer default 0)
returns table(data jsonb) language sql stable security invoker set search_path='' as $$
 with matching as (
 select r.property_id,min(p.price) as starting_price,sum(r.available)::integer as matching_available
 from public.room_catalog r join public.plan_catalog p on p.room_type_id=r.id
 where p.duration_unit=period_unit and p.duration_value=period_value
 and p.price between min_price and max_price and r.facilities @> to_jsonb(room_facilities)
 -- One active plan per duration per room is enforced below, avoiding double counts.
 group by r.property_id
 ), candidates as (
 select c.*,m.starting_price,m.matching_available,
 public.haversine_km(ref_lat,ref_lon,c.latitude::double precision,c.longitude::double precision) as distance_km
 from public.property_catalog c join matching m on m.property_id=c.id
 where (q='' or c.name ilike '%'||q||'%' or c.address ilike '%'||q||'%' or c.city ilike '%'||q||'%')
 and (gender is null or c.gender_type=gender) and c.rating>=min_rating
 and c.facilities @> to_jsonb(property_facilities)
 )
 select to_jsonb(c) from candidates c
 where max_distance is null or c.distance_km<=max_distance
 order by case when sort_by='nearest' then c.distance_km end asc nulls last,
 case when sort_by='price' then c.starting_price end asc,
 case when sort_by in ('rating','recommended') then c.rating end desc,c.id
 limit 20 offset greatest(page_number,0)*20;
$$;
create unique index unique_active_room_period on public.pricing_plans(room_type_id,duration_unit,duration_value) where is_active;
revoke all on function public.haversine_km(double precision,double precision,double precision,double precision) from public;
revoke all on function public.search_properties from public;
grant execute on function public.haversine_km(double precision,double precision,double precision,double precision) to anon,authenticated;
grant execute on function public.search_properties to anon,authenticated;

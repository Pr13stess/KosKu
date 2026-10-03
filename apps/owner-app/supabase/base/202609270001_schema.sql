-- ============================================================
-- KOS APP DATABASE SCHEMA
-- PostgreSQL / Supabase
-- Version: 2.0
-- ============================================================
-- gen_random_uuid() is built into PostgreSQL 15+.

-- ============================================================
-- 1. ENUMS
-- ============================================================
create type public.user_role as enum (
  'USER',
  'OWNER',
  'ADMIN'
);
create type public.account_status as enum (
  'ACTIVE',
  'SUSPENDED',
  'DELETED'
);
create type public.verification_status as enum (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED'
);
create type public.publication_status as enum (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);
create type public.gender_type as enum (
  'MALE',
  'FEMALE',
  'MIXED'
);
create type public.bathroom_type as enum (
  'PRIVATE',
  'SHARED'
);
create type public.facility_category as enum (
  'PROPERTY',
  'ROOM'
);
create type public.duration_unit as enum (
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR'
);
create type public.amount_type as enum (
  'NONE',
  'FIXED',
  'PERCENTAGE'
);
create type public.booking_status as enum (
  'DRAFT',
  'HELD',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED'
);
create type public.booking_cancel_reason as enum (
  'USER_CANCELLED',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
  'HOLD_EXPIRED',
  'OWNER_EXCEPTION',
  'ADMIN_CANCELLED',
  'LATE_PAYMENT',
  'OTHER'
);
create type public.allocation_kind as enum (
  'HOLD',
  'RESERVED'
);
create type public.payment_status as enum (
  'PENDING',
  'SUCCESS',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED'
);
create type public.payment_provider as enum (
  'MIDTRANS_SANDBOX'
);
create type public.refund_status as enum (
  'PENDING',
  'SUCCESS',
  'FAILED'
);
create type public.payout_status as enum (
  'PENDING',
  'SIMULATED_PAID',
  'CANCELLED'
);
create type public.media_type as enum (
  'IMAGE'
);
create type public.message_type as enum (
  'TEXT',
  'IMAGE',
  'CALL_EVENT'
);
create type public.call_type as enum (
  'VOICE',
  'VIDEO'
);
create type public.call_status as enum (
  'RINGING',
  'CONNECTED',
  'COMPLETED',
  'MISSED',
  'DECLINED',
  'CANCELLED',
  'FAILED'
);
create type public.moderation_status as enum (
  'PENDING',
  'APPROVED',
  'HIDDEN',
  'REJECTED'
);
create type public.restriction_reason as enum (
  'SPAM',
  'BAD_BEHAVIOR',
  'OTHER'
);
create type public.restriction_status as enum (
  'ACTIVE',
  'REVOKED'
);
create type public.verification_target as enum (
  'OWNER',
  'PROPERTY'
);
create type public.report_target as enum (
  'PROPERTY',
  'USER',
  'MESSAGE',
  'REVIEW'
);
create type public.report_category as enum (
  'FALSE_INFORMATION',
  'WRONG_ADDRESS',
  'FRAUD',
  'SPAM',
  'HARASSMENT',
  'OTHER'
);
create type public.report_status as enum (
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'REJECTED'
);
create type public.device_platform as enum (
  'ANDROID',
  'IOS',
  'WEB'
);
create type public.app_kind as enum (
  'USER_APP',
  'OWNER_APP',
  'ADMIN_WEB'
);
create type public.policy_type as enum (
  'PRIVACY_POLICY',
  'TERMS_AND_CONDITIONS'
);
create type public.deletion_status as enum (
  'REQUESTED',
  'NEEDS_RESOLUTION',
  'PROCESSING',
  'COMPLETED',
  'FAILED_RETRYABLE'
);
-- ============================================================
-- 2. COMMON FUNCTION: UPDATED_AT
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- ============================================================
-- 3. PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(120),
  phone varchar(30),
  avatar_path text,
  campus_or_company varchar(150),
  status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
-- ============================================================
-- 4. USER ROLES
-- ============================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
-- ============================================================
-- 5. OWNER PROFILE
-- ============================================================
create table public.owner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique
    references public.profiles(id)
    on delete cascade,
  display_name varchar(120),
  description text,
  verification_status public.verification_status
    not null default 'DRAFT',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_owner_profiles_updated_at
before update on public.owner_profiles
for each row
execute function public.set_updated_at();
-- ============================================================
-- 6. PROPERTIES
-- ============================================================
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid
    references public.profiles(id) on delete set null,
  name varchar(160) not null,
  description text,
  address text not null,
  city varchar(100),
  province varchar(100),
  latitude numeric(9,6),
  longitude numeric(9,6),
  gender_type public.gender_type not null default 'MIXED',
  rules text,
  verification_status public.verification_status
    not null default 'DRAFT',
  publication_status public.publication_status
    not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chk_property_latitude
    check (latitude is null or latitude between -90 and 90),
  constraint chk_property_longitude
    check (longitude is null or longitude between -180 and 180)
);
create index idx_properties_owner
on public.properties(owner_id);
create index idx_properties_publication
on public.properties(publication_status);
create index idx_properties_verification
on public.properties(verification_status);
create trigger trg_properties_updated_at
before update on public.properties
for each row
execute function public.set_updated_at();
-- ============================================================
-- 7. PROPERTY MEDIA
-- ============================================================
create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null
    references public.properties(id)
    on delete cascade,
  storage_path text not null,
  media_type public.media_type not null default 'IMAGE',
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_property_media_property
on public.property_media(property_id);
-- ============================================================
-- 8. FACILITIES
-- ============================================================
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  category public.facility_category not null,
  icon_key varchar(80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name, category)
);
-- ============================================================
-- 9. PROPERTY FACILITIES
-- ============================================================
create table public.property_facilities (
  property_id uuid not null
    references public.properties(id)
    on delete cascade,
  facility_id uuid not null
    references public.facilities(id)
    on delete cascade,
  primary key(property_id, facility_id)
);
-- ============================================================
-- 10. ROOM TYPES
-- ============================================================
create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null
    references public.properties(id)
    on delete cascade,
  name varchar(120) not null,
  floor_label varchar(50),
  room_size_m2 numeric(6,2),
  bathroom_type public.bathroom_type not null default 'SHARED',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_room_size
    check (room_size_m2 is null or room_size_m2 > 0)
);
create index idx_room_types_property
on public.room_types(property_id);
create trigger trg_room_types_updated_at
before update on public.room_types
for each row
execute function public.set_updated_at();
-- ============================================================
-- 11. ROOM TYPE FACILITIES
-- ============================================================
create table public.room_type_facilities (
  room_type_id uuid not null
    references public.room_types(id)
    on delete cascade,
  facility_id uuid not null
    references public.facilities(id)
    on delete cascade,
  primary key(room_type_id, facility_id)
);
-- ============================================================
-- 12. ROOM TYPE INVENTORY
-- ============================================================
create table public.room_type_inventory (
  room_type_id uuid primary key
    references public.room_types(id)
    on delete cascade,
  total integer not null default 0,
  occupied integer not null default 0,
  cleaning integer not null default 0,
  maintenance integer not null default 0,
  inactive integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_inventory_total
    check (total >= 0),
  constraint chk_inventory_occupied
    check (occupied >= 0),
  constraint chk_inventory_cleaning
    check (cleaning >= 0),
  constraint chk_inventory_maintenance
    check (maintenance >= 0),
  constraint chk_inventory_inactive
    check (inactive >= 0),
  constraint chk_inventory_owner_allocations
    check (
      occupied
      + cleaning
      + maintenance
      + inactive
      <= total
    )
);
create trigger trg_inventory_updated_at
before update on public.room_type_inventory
for each row
execute function public.set_updated_at();
-- ============================================================
-- 13. PRICING PLANS
-- ============================================================
create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null
    references public.room_types(id)
    on delete cascade,
  name varchar(100) not null,
  duration_unit public.duration_unit not null,
  duration_value integer not null,
  price bigint not null,
  currency char(3) not null default 'IDR',
  down_payment_type public.amount_type
    not null default 'NONE',
  down_payment_value bigint
    not null default 0,
  security_deposit_type public.amount_type
    not null default 'NONE',
  security_deposit_value bigint
    not null default 0,
  deposit_refundable boolean not null default true,
  deposit_terms text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_pricing_duration
    check (duration_value > 0),
  constraint chk_pricing_price
    check (price >= 0),
  constraint chk_down_payment_value
    check (down_payment_value >= 0),
  constraint chk_security_deposit_value
    check (security_deposit_value >= 0)
);
create index idx_pricing_room_type
on public.pricing_plans(room_type_id);
create trigger trg_pricing_plans_updated_at
before update on public.pricing_plans
for each row
execute function public.set_updated_at();
-- ============================================================
-- 14. BOOKINGS
-- ============================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code varchar(30) not null unique,
  user_id uuid
    references public.profiles(id) on delete set null,
  room_type_id uuid not null
    references public.room_types(id),
  pricing_plan_id uuid not null
    references public.pricing_plans(id),
  quantity smallint not null default 1,
  status public.booking_status
    not null default 'DRAFT',
  cancel_reason public.booking_cancel_reason,
  cancel_note text,
  planned_move_in_date date,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  cancelled_at timestamptz,
  -- snapshot
  property_name_snapshot varchar(160),
  room_type_name_snapshot varchar(120),
  pricing_plan_name_snapshot varchar(100),
  rent_price_snapshot bigint not null default 0,
  down_payment_snapshot bigint not null default 0,
  security_deposit_snapshot bigint not null default 0,
  pay_now_snapshot bigint not null default 0,
  remaining_rent_snapshot bigint not null default 0,
  deposit_refundable_snapshot boolean,
  deposit_terms_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_booking_quantity
    check (quantity = 1),
  constraint chk_booking_money
    check (
      rent_price_snapshot >= 0
      and down_payment_snapshot >= 0
      and security_deposit_snapshot >= 0
      and pay_now_snapshot >= 0
      and remaining_rent_snapshot >= 0
    )
);
create index idx_bookings_user_status
on public.bookings(user_id, status);
create index idx_bookings_room_type
on public.bookings(room_type_id);
create trigger trg_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();
-- ============================================================
-- 15. INVENTORY ALLOCATIONS
--
-- HELD is a booking status; HOLD is the allocation kind (spec 2.0).
-- ============================================================
create table public.inventory_allocations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null
    references public.bookings(id)
    on delete cascade,
  room_type_id uuid not null
    references public.room_types(id),
  kind public.allocation_kind not null,
  quantity integer not null default 1,
  expires_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_allocation_quantity
    check (quantity > 0)
);
create unique index ux_inventory_allocation_active_booking
on public.inventory_allocations(booking_id)
where released_at is null;
create index idx_inventory_alloc_room
on public.inventory_allocations(
  room_type_id,
  kind,
  released_at
);
create trigger trg_inventory_allocations_updated_at
before update on public.inventory_allocations
for each row
execute function public.set_updated_at();
-- ============================================================
-- 17. PAYMENTS
-- ============================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null
    references public.bookings(id),
  order_id varchar(100) not null unique,
  provider_transaction_id varchar(150),
  provider public.payment_provider
    not null default 'MIDTRANS_SANDBOX',
  gross_amount bigint not null,
  dp_amount bigint not null default 0,
  deposit_amount bigint not null default 0,
  platform_fee bigint not null default 0,
  owner_amount bigint not null default 0,
  payment_method varchar(80),
  status public.payment_status
    not null default 'PENDING',
  provider_status varchar(80),
  paid_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_payment_amount
    check (
      gross_amount >= 0
      and dp_amount >= 0
      and deposit_amount >= 0
      and platform_fee >= 0
      and owner_amount >= 0
    )
);
create index idx_payments_booking
on public.payments(booking_id);
create index idx_payments_status
on public.payments(status);
create trigger trg_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();
-- ============================================================
-- 18. PAYMENT EVENTS / WEBHOOK LOG
-- ============================================================
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid
    references public.payments(id),
  provider_event_key varchar(180) unique,
  provider_status varchar(80),
  payload jsonb,
  signature_valid boolean not null default false,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
-- ============================================================
-- 19. REFUNDS
-- ============================================================
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null
    references public.payments(id),
  amount bigint not null,
  reason text,
  status public.refund_status
    not null default 'PENDING',
  provider_refund_id varchar(150),
  idempotency_key varchar(150)
    not null unique,
  requested_by uuid
    references public.profiles(id),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint chk_refund_amount
    check (amount > 0)
);
-- ============================================================
-- 20. PAYOUT SIMULATION
-- ============================================================
create table public.payout_simulations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null
    references public.bookings(id),
  owner_id uuid
    references public.profiles(id) on delete set null,
  gross_amount bigint not null default 0,
  platform_fee bigint not null default 0,
  deposit_amount bigint not null default 0,
  owner_amount bigint not null default 0,
  status public.payout_status
    not null default 'PENDING',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
-- ============================================================
-- 21. FAVORITES
-- ============================================================
create table public.favorites (
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  property_id uuid not null
    references public.properties(id)
    on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, property_id)
);
-- ============================================================
-- 22. CONVERSATIONS
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null
    references public.properties(id),
  user_id uuid
    references public.profiles(id) on delete set null,
  owner_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, user_id, owner_id)
);
create trigger trg_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();
-- ============================================================
-- 23. CONVERSATION PARTICIPANTS
-- ============================================================
create table public.conversation_participants (
  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);
-- ============================================================
-- 24. MESSAGES
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,
  sender_id uuid
    references public.profiles(id) on delete set null,
  message_type public.message_type not null,
  text_content text,
  storage_path text,
  client_message_id uuid not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  unique(sender_id, client_message_id),
  constraint chk_message_content
    check (
      (message_type = 'TEXT' and text_content is not null)
      or
      (message_type = 'IMAGE' and storage_path is not null)
      or
      (message_type = 'CALL_EVENT')
    )
);
create index idx_messages_conversation_time
on public.messages(conversation_id, created_at desc);
-- ============================================================
-- 25. CALLS
-- ============================================================
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id),
  caller_id uuid
    references public.profiles(id) on delete set null,
  receiver_id uuid
    references public.profiles(id) on delete set null,
  call_type public.call_type not null,
  agora_channel_id varchar(160) not null unique,
  status public.call_status not null default 'RINGING',
  created_at timestamptz not null default now(),
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  constraint chk_call_duration
    check (duration_seconds >= 0)
);
-- ============================================================
-- 26. NOTES
-- satu user + satu property = satu note
-- ============================================================
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  property_id uuid not null
    references public.properties(id)
    on delete cascade,
  content text not null default '',
  last_call_id uuid
    references public.calls(id)
    on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, property_id)
);
create trigger trg_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();
-- ============================================================
-- 27. REVIEWS
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique
    references public.bookings(id),
  user_id uuid
    references public.profiles(id) on delete set null,
  property_id uuid not null
    references public.properties(id),
  rating smallint not null,
  review_text text,
  moderation_status public.moderation_status
    not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_review_rating
    check (rating between 1 and 5)
);
create trigger trg_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();
-- ============================================================
-- 28. REVIEW MEDIA
-- ============================================================
create table public.review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null
    references public.reviews(id)
    on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
-- ============================================================
-- 29. USER RESTRICTIONS
-- ============================================================
create table public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid
    references public.profiles(id) on delete set null,
  user_id uuid
    references public.profiles(id) on delete set null,
  block_communication boolean not null default false,
  block_booking boolean not null default false,
  reason public.restriction_reason not null,
  notes text,
  status public.restriction_status
    not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, user_id)
);
create trigger trg_restrictions_updated_at
before update on public.user_restrictions
for each row
execute function public.set_updated_at();
-- ============================================================
-- 30. VERIFICATION SUBMISSIONS
-- ============================================================
create table public.verification_submissions (
  id uuid primary key default gen_random_uuid(),
  target_type public.verification_target not null,
  owner_profile_id uuid
    references public.owner_profiles(id)
    on delete cascade,
  property_id uuid
    references public.properties(id)
    on delete cascade,
  submitted_by uuid not null
    references public.profiles(id),
  evidence_path text not null,
  description text,
  status public.verification_status
    not null default 'PENDING',
  reviewed_by uuid
    references public.profiles(id),
  review_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint chk_verification_target
    check (
      (
        target_type = 'OWNER'
        and owner_profile_id is not null
        and property_id is null
      )
      or
      (
        target_type = 'PROPERTY'
        and property_id is not null
        and owner_profile_id is null
      )
    )
);
-- ============================================================
-- 31. REPORTS
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid
    references public.profiles(id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  category public.report_category not null,
  description text not null,
  evidence_path text,
  status public.report_status
    not null default 'OPEN',
  handled_by uuid
    references public.profiles(id),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index idx_reports_status
on public.reports(status, created_at desc);
-- ============================================================
-- 32. NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null
    references public.profiles(id)
    on delete cascade,
  event_key varchar(150),
  type varchar(80) not null,
  title varchar(160) not null,
  body text not null,
  target_type varchar(50),
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index ux_notification_event_recipient
on public.notifications(recipient_id, event_key)
where event_key is not null;
create index idx_notifications_user_time
on public.notifications(recipient_id, created_at desc);
-- ============================================================
-- 33. DEVICE TOKENS
-- ============================================================
create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  token text not null unique,
  platform public.device_platform not null,
  app_kind public.app_kind not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
-- ============================================================
-- 34. POLICY ACCEPTANCES
-- ============================================================
create table public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  policy_type public.policy_type not null,
  policy_version varchar(30) not null,
  accepted_at timestamptz not null default now(),
  unique(
    user_id,
    policy_type,
    policy_version
  )
);
-- ============================================================
-- 35. DELETE ACCOUNT REQUESTS
-- ============================================================
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
    references public.profiles(id) on delete set null,
  status public.deletion_status
    not null default 'REQUESTED',
  reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);
-- ============================================================
-- 36. SEARCH HISTORY
-- ============================================================
create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id)
    on delete cascade,
  label varchar(200) not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now()
);
create index idx_search_history_user
on public.search_history(user_id, created_at desc);
-- ============================================================
-- 37. BOOKING EVENTS
-- ============================================================
create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null
    references public.bookings(id),
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor_id uuid
    references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
-- ============================================================
-- 38. INVENTORY EVENTS
-- ============================================================
create table public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null
    references public.room_types(id),
  booking_id uuid
    references public.bookings(id),
  event_type varchar(80) not null,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
-- ============================================================
-- 39. AUDIT LOG
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid
    references public.profiles(id) on delete set null,
  action varchar(120) not null,
  target_type varchar(80),
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Additions and corrections required by the authoritative revision 2.0 document.
alter table public.properties add constraint owner_is_registered
 foreign key(owner_id) references public.owner_profiles(user_id) on delete set null;
alter table public.properties add constraint coordinate_pair check ((latitude is null) = (longitude is null));
alter table public.notes add constraint note_length check (char_length(content) <= 10000);
alter table public.pricing_plans add constraint idr_only check (currency = 'IDR');
alter table public.pricing_plans add constraint valid_dp check (
 (down_payment_type='NONE' and down_payment_value=0) or
 (down_payment_type='FIXED' and down_payment_value<=price) or
 (down_payment_type='PERCENTAGE' and down_payment_value<=100));
alter table public.pricing_plans add constraint valid_deposit check (
 (security_deposit_type='NONE' and security_deposit_value=0) or
 security_deposit_type='FIXED' or
 (security_deposit_type='PERCENTAGE' and security_deposit_value<=100));
alter table public.pricing_plans add constraint plan_room_unique unique(id,room_type_id);
alter table public.bookings add constraint matching_plan_room foreign key(pricing_plan_id,room_type_id)
 references public.pricing_plans(id,room_type_id);
alter table public.bookings add constraint booking_room_unique unique(id,room_type_id);
alter table public.bookings add constraint snapshot_totals check (
 down_payment_snapshot<=rent_price_snapshot and
 pay_now_snapshot=down_payment_snapshot+security_deposit_snapshot and
 remaining_rent_snapshot=rent_price_snapshot-down_payment_snapshot);
alter table public.bookings add column idempotency_key uuid unique;
alter table public.inventory_allocations add constraint allocation_matches_booking
 foreign key(booking_id,room_type_id) references public.bookings(id,room_type_id);
alter table public.inventory_allocations add constraint one_unit check(quantity=1);
alter table public.inventory_allocations add constraint hold_expiry check(kind<>'HOLD' or expires_at is not null);
alter table public.refunds add column simulation_source text not null default 'INTERNAL_SIMULATION'
 check(simulation_source in ('INTERNAL_SIMULATION','MIDTRANS_SANDBOX'));
alter table public.payout_simulations add column idempotency_key uuid not null default gen_random_uuid() unique;
alter table public.payout_simulations add constraint payout_nonnegative check (
 gross_amount>=0 and platform_fee>=0 and deposit_amount>=0 and owner_amount>=0);
alter table public.device_tokens add column installation_id uuid not null default gen_random_uuid();
alter table public.device_tokens add constraint installation_app_unique unique(installation_id,app_kind);
alter table public.search_history add constraint search_coordinates check (
 (latitude is null)=(longitude is null) and latitude between -90 and 90 and longitude between -180 and 180);
alter table public.user_restrictions drop constraint user_restrictions_owner_id_user_id_key;
create unique index one_active_restriction on public.user_restrictions(owner_id,user_id) where status='ACTIVE';
create index idx_alloc_expiry on public.inventory_allocations(expires_at) where released_at is null and kind='HOLD';
create index idx_reviews_public on public.reviews(property_id,moderation_status);
create index idx_conversations_owner on public.conversations(owner_id);
create index idx_conversations_user on public.conversations(user_id);
create index idx_booking_events_booking on public.booking_events(booking_id,created_at);
create index idx_inventory_events_room on public.inventory_events(room_type_id,created_at);
create index idx_refunds_payment on public.refunds(payment_id);
create index idx_review_media_review on public.review_media(review_id);
create index idx_verification_submitter on public.verification_submissions(submitted_by);

-- Integrity only: no checkout, payment or communication execution is implemented.
create function public.validate_review() returns trigger language plpgsql set search_path='' as $$
begin
 -- ON DELETE SET NULL preserves review history during backend anonymization.
 if tg_op='UPDATE' and new.user_id is null and old.user_id is not null then return new; end if;
 if not exists(select 1 from public.bookings b join public.room_types rt on rt.id=b.room_type_id
 where b.id=new.booking_id and b.user_id=new.user_id and b.status='COMPLETED' and rt.property_id=new.property_id)
 then raise exception 'Review requires own completed booking for this property'; end if;
 return new;
end $$;
create trigger validate_review before insert or update on public.reviews for each row execute function public.validate_review();

create function public.validate_report_target() returns trigger language plpgsql set search_path='' as $$
declare valid boolean;
begin
 case new.target_type
 when 'PROPERTY' then select exists(select 1 from public.properties where id=new.target_id) into valid;
 when 'USER' then select exists(select 1 from public.profiles where id=new.target_id) into valid;
 when 'MESSAGE' then select exists(select 1 from public.messages where id=new.target_id) into valid;
 when 'REVIEW' then select exists(select 1 from public.reviews where id=new.target_id) into valid;
 end case;
 if not valid then raise exception 'Report target does not exist'; end if;
 return new;
end $$;
create trigger validate_report_target before insert or update of target_type,target_id on public.reports for each row execute function public.validate_report_target();

-- Lock the same inventory row on every allocation change. Deferred validation also
-- allows reserved -> occupied within one future backend transaction.
create function public.lock_allocation_inventory() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.room_type_id<>old.room_type_id then raise exception 'Allocation room is immutable'; end if;
 perform 1 from public.room_type_inventory where room_type_id=coalesce(new.room_type_id,old.room_type_id) for update;
 return coalesce(new,old);
end $$;
create trigger lock_allocation_inventory before insert or update or delete on public.inventory_allocations
 for each row execute function public.lock_allocation_inventory();
create function public.check_inventory_capacity() returns trigger language plpgsql set search_path='' as $$
declare rid uuid; capacity public.room_type_inventory; allocated bigint;
begin
 rid:=coalesce(new.room_type_id,old.room_type_id);
 select * into capacity from public.room_type_inventory where room_type_id=rid for update;
 select coalesce(sum(quantity),0) into allocated from public.inventory_allocations
 where room_type_id=rid and released_at is null and (kind='RESERVED' or expires_at>now());
 if not found or capacity.total is null then
   if allocated>0 then raise exception 'Inventory is required'; end if;
 elsif capacity.occupied+capacity.cleaning+capacity.maintenance+capacity.inactive+allocated>capacity.total
 then raise exception 'Inventory capacity exceeded'; end if;
 return null;
end $$;
create constraint trigger check_inventory_capacity after insert or update or delete on public.room_type_inventory
 deferrable initially deferred for each row execute function public.check_inventory_capacity();
create constraint trigger check_allocation_capacity after insert or update or delete on public.inventory_allocations
 deferrable initially deferred for each row execute function public.check_inventory_capacity();

create function public.check_refund_total() returns trigger language plpgsql set search_path='' as $$
declare paid bigint; refunded bigint;
begin
 if tg_op='UPDATE' and new.payment_id<>old.payment_id then raise exception 'Refund payment is immutable'; end if;
 select gross_amount into paid from public.payments where id=new.payment_id for update;
 select coalesce(sum(amount),0) into refunded from public.refunds where payment_id=new.payment_id and status<>'FAILED' and id<>new.id;
 if new.status<>'FAILED' and refunded+new.amount>paid then raise exception 'Refund exceeds payment'; end if;
 return new;
end $$;
create trigger check_refund_total before insert or update on public.refunds for each row execute function public.check_refund_total();

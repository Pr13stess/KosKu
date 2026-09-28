# Matriks policy SELECT

Semua tabel memiliki RLS aktif. Hak INSERT/UPDATE/DELETE client belum diberikan pada first commit.

| Tabel | Predicate SELECT |
| --- | --- |
| `profiles` | `id=auth.uid() or private.is_admin()` |
| `user_roles` | `user_id=auth.uid() or private.is_admin()` |
| `owner_profiles` | `user_id=auth.uid() or private.is_admin()` |
| `properties` | `private.is_public_property(id) or owner_id=auth.uid() or private.is_admin()` |
| `property_media` | `private.can_read_property(property_id)` |
| `facilities` | `is_active` |
| `property_facilities` | `private.can_read_property(property_id)` |
| `room_types` | `(is_active and private.is_public_property(property_id)) or private.owns_property(property_id) or private.is_admin()` |
| `room_type_facilities` | `private.can_read_room(room_type_id)` |
| `room_type_inventory` | `private.owns_room(room_type_id) or private.is_admin()` |
| `pricing_plans` | `(is_active and private.can_read_room(room_type_id)) or private.owns_room(room_type_id) or private.is_admin()` |
| `bookings` | `private.can_read_booking(id)` |
| `inventory_allocations` | `private.can_read_booking(booking_id)` |
| `payments` | `private.can_read_booking(booking_id)` |
| `payment_events` | `private.is_admin()` |
| `refunds` | `private.can_read_payment(payment_id)` |
| `payout_simulations` | `owner_id=auth.uid() or private.is_admin()` |
| `favorites` | `user_id=auth.uid()` |
| `conversations` | `private.in_conversation(id)` |
| `conversation_participants` | `private.in_conversation(conversation_id)` |
| `messages` | `private.in_conversation(conversation_id)` |
| `calls` | `private.in_conversation(conversation_id)` |
| `notes` | `user_id=auth.uid()` |
| `reviews` | `(moderation_status='APPROVED' and private.is_public_property(property_id)) or user_id=auth.uid() or private.is_admin()` |
| `review_media` | `exists(select 1 from public.reviews r where r.id=review_id)` |
| `user_restrictions` | `owner_id=auth.uid() or user_id=auth.uid() or private.is_admin()` |
| `verification_submissions` | `submitted_by=auth.uid() or private.is_admin()` |
| `reports` | `reporter_id=auth.uid() or private.is_admin()` |
| `notifications` | `recipient_id=auth.uid()` |
| `device_tokens` | `user_id=auth.uid()` |
| `policy_acceptances` | `user_id=auth.uid()` |
| `deletion_requests` | `user_id=auth.uid() or private.is_admin()` |
| `search_history` | `user_id=auth.uid()` |
| `booking_events` | `private.can_read_booking(booking_id)` |
| `inventory_events` | `private.owns_room(room_type_id) or private.is_admin()` |
| `audit_logs` | `private.is_admin()` |

Helper `private.*` memakai fixed search_path dan identitas Auth. Helper definer tidak mengembalikan baris profil/booking. `public_available` hanya mengembalikan angka untuk tipe aktif pada listing publik. `public_owner_label` hanya mengembalikan display_name owner untuk listing publik.

Seluruh view katalog memakai security_invoker; fungsi pencarian juga security invoker. Inventory mentah tetap privat, sehingga hitungan global memakai helper agregat dengan cakupan publik yang dibatasi.

Pemeriksaan cakupan SQL: `supabase/tests/rls_coverage.sql`. Uji peran: `tests/database.test.mjs`.

## Auth (migrasi `202609270004_auth.sql`)

Hak tulis client tetap nol pada semua tabel. Dua tambahan sempit:

- Trigger `on_auth_user_created` (security definer) membuat baris `profiles` dan role `USER` saat baris `auth.users` baru muncul, tanpa tulis dari client. Idempotent (`on conflict do nothing`), sehingga `seed.sql` tetap aman.
- RPC `update_own_profile(full_name, phone, campus_or_company)` (security definer, hanya `authenticated`) hanya mengubah baris milik `auth.uid()`; anon ditolak. Kolom `status`/`deleted_at` tidak bisa disentuh client.

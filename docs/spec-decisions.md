# Keputusan berdasarkan spesifikasi revisi 2.0

Seluruh bagian 1–21 dokumen ditelaah sebelum implementasi. Dokumen revisi 2.0 menjadi acuan ketika rancangan SQL tambahan berbeda. Scope implementasi mengikuti instruksi first commit; schema menyiapkan entitas untuk keseluruhan sistem.

## Penyesuaian SQL lampiran

1. Tambah `HELD` pada booking dan `HOLD_EXPIRED` pada alasan pembatalan. `HOLD` tetap jenis alokasi.
2. Status deletion mengikuti `REQUESTED`, `NEEDS_RESOLUTION`, `PROCESSING`, `COMPLETED`, `FAILED_RETRYABLE`.
3. Aktifkan RLS pada seluruh 36 tabel, termasuk booking_events, inventory_events, audit_logs, dengan policy SELECT eksplisit. Semua hak tulis anon/authenticated dicabut untuk first commit.
4. Publikasi memerlukan owner approved/akun aktif, property approved, status ACTIVE, dan belum soft delete. Kos penuh tetap ditampilkan.
5. Policy participant memakai helper definer dalam schema `private`, sehingga tidak mereferensikan tabel RLS yang sama secara rekursif. Admin tidak dapat membaca seluruh chat atau notes.
6. Ganti view availability lampiran dengan helper agregat terbatasi: pengunjung menerima angka total tersedia untuk tipe pada listing publik, tanpa akses ke inventory mentah atau identitas booking. Semua view publik menggunakan `security_invoker=true`.
7. Harga minimum dihitung setelah filter tipe, fasilitas kamar, periode, dan rentang harga. Satu plan aktif per kombinasi tipe/unit/nilai durasi mencegah duplikasi penjumlahan available. Sorting memakai ID sebagai pemutus seri dan 20 baris per halaman.
8. DP/deposit memiliki validasi NONE/FIXED/PERCENTAGE, mata uang IDR, durasi positif, serta konsistensi snapshot. DP adalah bagian sewa; deposit bukan bagian sewa.
9. Foreign key gabungan mengikat pricing plan dan alokasi pada room type booking yang sama. Review harus berasal dari booking COMPLETED milik reviewer pada property yang sesuai. Target laporan divalidasi.
10. Trigger inventory mengunci satu baris per tipe dan memvalidasi kapasitas tertunda di akhir transaksi. Tipe alokasi HOLD wajib punya expiry; quantity=1; satu alokasi aktif per booking. Constraint ini bukan implementasi alur checkout, expiry scheduler, atau transisi pembayaran.
11. Referensi identitas historis dapat menjadi NULL saat identitas dihapus, sedangkan notes/favorites/token bersifat cascade. Review mengizinkan anonimisasi user oleh backend. Alur hapus akun, anonimisasi isi chat/bukti, dan pembersihan Storage belum dibuat.
12. Refund kumulatif non-FAILED tidak melebihi gross payment, idempotency payout tersedia, restriction aktif unik per pasangan, note dibatasi 10.000 karakter, dan token dibedakan per instalasi/aplikasi.

## Entitas

Identitas: profiles, user_roles, owner_profiles.

Katalog: properties, property_media, facilities, property_facilities, room_types, room_type_facilities, room_type_inventory, pricing_plans.

Transaksi: bookings, inventory_allocations, payments, payment_events, refunds, payout_simulations, booking_events, inventory_events.

Privat dan komunikasi: favorites, notes, conversations, conversation_participants, messages, calls.

Pendukung: reviews, review_media, user_restrictions, verification_submissions, reports, notifications, device_tokens, policy_acceptances, deletion_requests, search_history, audit_logs.

Tidak ada tabel nomor kamar individual. Status transaksi dan snapshot disimpan untuk tahap berikutnya, tanpa implementasi booking/payment.

## Batas seed

Seed katalog dan fixture keamanan mencakup beberapa kota, kos penuh, unit terakhir, owner belum approved, property pending/suspended/soft-deleted, dua user, dua owner, admin, catatan privat, percakapan, serta review dengan booking completed. Hold aktif/reserved/expired dibuat sementara oleh test untuk memeriksa agregat. Seed ini bukan dataset semua fitur atau bukti keberhasilan Midtrans/Agora.

## Arsitektur monorepo

Hanya `apps/user-app` diimplementasikan. `packages/database-types` menyiapkan kontrak status bersama. Owner app dan admin web belum dibuat, mengikuti batas eksplisit first commit.

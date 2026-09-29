# Checkout & pembayaran (Xendit, Test Mode)

## 1. Migrasi database
Jalankan `supabase/migrations/202609270005_checkout.sql` di SQL Editor,
setelah migrasi 1-4. Isinya fungsi `create_checkout`, `get_checkout`,
`cancel_checkout` (dipanggil user lewat RPC/Edge Function) dan
`attach_payment`, `apply_payment_event`, `expire_holds` (hanya
`service_role`, dipanggil dari Edge Function).

## 2. Akun dan key Xendit
1. Daftar di `dashboard.xendit.co/register`, isi email dan jawab
   pertanyaan dasar tentang "bisnis" (untuk demo akademik, isi apa
   adanya). Kamu langsung masuk ke **Test Mode**, tanpa perlu upload
   dokumen apa pun.
2. Ambil **Secret API Key** (Test Mode) di **Settings → Developers →
   API Keys**. Formatnya `xnd_development_...`.
3. Ambil **Webhook Verification Token** di **Settings → Developers →
   Webhooks**.

## 3. Secret untuk Edge Functions
Di **Project Settings → Edge Functions → Secrets** (atau `supabase secrets set`):

```
XENDIT_SECRET_KEY=xnd_development_xxxxx
XENDIT_CALLBACK_TOKEN=isi-dari-dashboard-Xendit
XENDIT_API_URL=https://api.xendit.co
```
`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah tersedia otomatis di
setiap Edge Function, tidak perlu diisi manual.

**Jangan** pernah menaruh `XENDIT_SECRET_KEY` di `.env` aplikasi
(awalan `EXPO_PUBLIC_...`). Key itu hanya boleh ada di secret Edge Function.

## 4. Deploy tiga Edge Function
```
supabase functions deploy create-payment
supabase functions deploy cancel-payment
supabase functions deploy xendit-webhook --no-verify-jwt
```
`--no-verify-jwt` khusus untuk webhook, karena yang memanggilnya adalah
server Xendit, bukan pengguna yang login. Keasliannya diperiksa lewat
header `x-callback-token`, bukan lewat sesi login.

## 5. Daftarkan URL webhook di Xendit
Ambil URL function: dashboard Supabase → **Edge Functions** →
`xendit-webhook` → salin URL-nya. Paste di dashboard Xendit →
**Settings → Developers → Webhooks**, bagian **Invoice Paid** (dan
idealnya juga **Invoice Expired**), lalu Save.

## 6. Jadwalkan pelepasan hold kedaluwarsa
`expire_holds()` juga otomatis dipanggil setiap kali user membuka layar
checkout, jadi sistem tetap benar walau tanpa jadwal. Untuk kebersihan data
lebih cepat, atur **Database → Cron Jobs** memanggil:
```sql
select public.expire_holds();
```
setiap 1-5 menit.

## 7. Uji coba
Di halaman checkout Xendit (Test Mode), gunakan tombol simulasi
pembayaran yang tersedia langsung di halaman itu — tidak perlu transfer
bank sungguhan. Semua transaksi berlabel "DEMO / TEST MODE PAYMENT
(XENDIT)" di aplikasi.

## Catatan migrasi dari Midtrans
Proyek ini semula dirancang dengan Midtrans Sandbox (lihat draf
spesifikasi). Karena pendaftaran akun Midtrans menuntut dokumen bisnis
(KTP/NPWP) bahkan untuk Sandbox, integrasi dipindah ke Xendit yang
memberi akses Test Mode langsung setelah pendaftaran. Perbedaan teknis
utama:
- Verifikasi webhook: Midtrans memakai signature SHA512 per notifikasi;
  Xendit memakai token statis di header `x-callback-token`, dicek sekali
  oleh Edge Function sebelum payload diproses.
- Idempotensi webhook: Midtrans tidak mengirim ID unik per notifikasi,
  jadi kunci idempotensi disusun dari beberapa field; Xendit mengirim
  header `webhook-id` yang unik per pengiriman, dipakai langsung.
- ID transaksi provider tersedia sejak invoice dibuat (Xendit), tidak
  perlu menunggu webhook pertama seperti pada Midtrans.

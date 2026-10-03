# Validasi owner app

## Dijalankan lokal

- TypeScript strict: `tsc --noEmit`, **lolos tanpa error**.
- ESLint dengan konfigurasi Expo, **lolos**.
- **15 tes lolos** (domain dan integrasi PostgreSQL/PGlite): schema dasar + seluruh migrasi owner, RLS/SELECT coverage, isolasi dua owner, verifikasi, harga, inventory, retry check-in/out, chat, restriction, panggilan, laporan, push preferences, serta notifikasi status.
- Expo Doctor: **21/21 pemeriksaan lolos**.
- Export web serta bundel Hermes Android/iOS berhasil. Ini adalah export bundel, bukan build APK/IPA.
- Deno typecheck untuk tiga Edge Functions berhasil: `agora-token`, `owner-upload`, `owner-maintenance`.

## Pemeriksaan antarmuka yang dilakukan

Pratinjau web dijalankan dari Expo. Beranda diperiksa secara visual pada ukuran layar 390×844 dan 320×740.

- Beranda → detail kos → tab kamar.
- Perubahan kondisi kamar dibersihkan, alasan penyesuaian, simpan; ketersediaan berubah sesuai.
- Membuat paket tiga bulanan dan memastikan nilai/DP tampil pada daftar paket.
- Membuka chat, mengirim teks lokal, memastikan pesan muncul.
- Memulai panggilan video **demo**, menerima simulasi, mengubah kontrol mic, mengakhiri panggilan, memastikan CALL_EVENT muncul.
- Booking confirmed → check-in ACTIVE → checkout COMPLETED, dengan catatan dan riwayat status yang terlihat.

Data yang diubah saat uji UI hanya berada pada penyimpanan lokal browser pengujian. Fixture awal pada ZIP tidak ikut berubah.

## Belum diverifikasi dengan layanan/perangkat nyata

- Auth email dan deep link pemulihan pada perangkat fisik.
- Deployment Supabase cloud, Storage upload/signed URL, serta Realtime lintas dua instalasi.
- Agora audio/video antara Android dan iOS, pergantian jaringan, background/terminated.
- FCM/APNs/Expo Push delivery dan receipt menggunakan kredensial proyek.
- Build APK/IPA, emulator, dan pengujian kamera/perizinan native.

Tidak ada kredensial akun tersebut dalam sesi ini. Implementasi adapter/backend disertakan; ikuti checklist di `SETUP-BACKEND.md` untuk validasi deployment.

## Audit dependensi

Audit npm pada 3 Oktober 2026 melaporkan **23 temuan (16 high, 7 moderate; 0 critical)**, termasuk propagasi advisory transitif melalui dependensi alat Expo. Advisory akar yang teridentifikasi:

- `braces`: stack exhaustion pada pola bersarang, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `node-forge`: verifikasi signature RSA, [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
- `uuid` melalui `xcode`: pemeriksaan batas buffer, [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

Perbaikan otomatis yang ditawarkan menurunkan Expo ke SDK 44; tidak diterapkan karena merusak stack yang digunakan. Versi terbaru `node-forge` dan `xcode` yang diperiksa masih berada pada jalur terdampak. Jangan memakai temuan ini sebagai klaim keamanan produksi; audit ulang saat dependensi memperoleh patch.

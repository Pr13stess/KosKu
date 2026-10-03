# KosKu Owner

Aplikasi owner terpisah untuk spesifikasi **Aplikasi Pencarian Kos, revisi 2.0 (22 September 2026)**. Tampilan memakai warna navy, oranye, krem, kartu putih, dan navigasi bawah mengambang sesuai referensi owner serta aplikasi KosKu sebelumnya.

## Mulai mencoba

Prasyarat: Node.js **22.13+**, npm, dan Expo Go yang mendukung SDK 57 untuk mencoba UI demo. Panggilan Agora dan push asli membutuhkan **Expo Development Build**, bukan Expo Go.

```sh
npm ci
npm start
# Tekan w untuk browser, atau pindai QR untuk perangkat.
```

Tanpa konfigurasi `.env`, aplikasi langsung membuka dashboard demo. Perubahan kos, harga, inventory, pesan, dan status booking disimpan lokal dengan AsyncStorage. Data hanya contoh. Untuk mencoba onboarding owner tanpa properti, buka **Profil → Mulai demo owner baru**.

```sh
npm run web
npm run typecheck
npm run lint
npm test
npm run export:mobile
```

ZIP ini hanya berisi source owner app, aset, lockfile, dokumentasi, tes, dan backend terkait. Aplikasi user/admin, `node_modules`, kredensial, serta hasil build tidak dikemas.

## Fitur

- Login/daftar email, verifikasi email, pemulihan password lewat deep link, ubah profil/password, logout.
- Onboarding bukti dummy → identitas → tambah kos; verifikasi owner dan kos terpisah, alasan penolakan, pengajuan ulang.
- Dashboard, daftar/detail kos, foto galeri/kamera, sampul, fasilitas umum, lokasi koordinat, peraturan, status tayang.
- Tipe kamar, luas/lantai/kamar mandi/fasilitas, aktif/nonaktif, paket hari/minggu/bulan/tahun, DP dan deposit.
- Inventory per kondisi dengan versi dan penguncian database. Hold/reserved/available tidak dapat ditulis bebas oleh owner.
- Booking berdasarkan status, snapshot biaya, status pembayaran/refund, check-in dan checkout atomik, permintaan pembatalan khusus ke admin.
- Laporan keuangan berlabel simulasi; deposit terpisah dari penerimaan sewa. Tidak ada perpindahan dana nyata.
- Chat teks/gambar, foto kamera/galeri, retry dengan ID pesan, Realtime dengan pemulihan polling, unread count.
- Voice/video call Agora pada native build: accept/decline/end, mic, kamera, ganti kamera, speaker, token server, timeout, riwayat metadata. Demo mensimulasikan panggilan tanpa menghubungi orang lain.
- Pembatasan komunikasi/booking baru per owner, cabut pembatasan, laporan pengguna/ulasan dan bukti privat.
- Ulasan penyewa yang lolos moderasi, notifikasi aplikasi/push, pengaturan izin, permintaan penghapusan akun, Privacy Policy/Terms/FAQ demo.

Owner tidak dapat mengubah ulasan, menyetujui verifikasi sendiri, membaca catatan pribadi pencari kos, menetapkan pembayaran sukses, atau membatalkan booking confirmed secara sepihak. Admin tetap menangani verifikasi, moderasi, permintaan khusus, dan penghapusan akun.

## Supabase

1. Salin `.env.example` menjadi `.env`, isi URL dan publishable key (anon key lama juga didukung). Jangan memasukkan service role ke aplikasi.
2. **Database baru:** jalankan tiga file `supabase/base/*.sql` berurutan, lalu semua `supabase/migrations/*.sql` berurutan, melalui SQL Editor.
3. **Database KosKu sebelumnya:** schema dasar yang sama sudah ada; jalankan **hanya** empat file incremental di `supabase/migrations`. Jangan menjalankan ulang `base`.
4. Aktifkan Email Auth dan konfirmasi email. Tambahkan redirect URL `kosku-owner://auth` dan `kosku-owner://reset` pada Auth URL Configuration. Gunakan development build agar deep link aplikasi terdaftar pada OS.
5. Deploy Edge Functions dan isi secret backend seperti dijelaskan di [SETUP-BACKEND.md](docs/SETUP-BACKEND.md).
6. Hentikan dan mulai ulang Expo setelah mengubah `.env`.

Provider memilih Supabase hanya jika URL **dan** key terisi. Konfigurasi separuh lengkap menampilkan error. Gangguan Supabase tidak diam-diam diganti data demo.

Saat pertama masuk, `owner_bootstrap` membuat profil dan mendaftarkan peran OWNER untuk akun itu sendiri. Tidak pernah menetapkan ADMIN atau status approved. Data nama/HP dari registrasi disalin ke profil; peran dan verifikasi tidak diambil dari metadata client.

Bucket `owner-media` privat. Gambar divalidasi serta dikompresi ulang oleh backend; akses gambar memakai URL sementara. Jika aplikasi user sebelumnya akan menampilkan foto owner baru, tambahkan resolver signed URL untuk path `owner-media/...` pada aplikasi user. Backend SELECT untuk foto properti yang approved/aktif telah tersedia; aplikasi user awal belum menyertakan chat/panggilan sehingga memerlukan layar komunikasi sendiri untuk menjadi lawan bicara.

## Struktur & SOLID

```text
App.tsx                         Native stack navigation
src/domain/models.ts            Model dan aturan nominal/inventory
src/domain/repositories/         Interface per domain
src/data/mock/                   Repository demo + transaksi penyimpanan lokal
src/data/supabase/               Repository RPC/Auth/Storage/Realtime asli
src/application/                 Composition root, React Context, sesi
src/presentation/components/    Komponen manual React Native + StyleSheet
src/presentation/screens/       Layar menurut tanggung jawab
supabase/base/                   Schema/RLS/view dari aplikasi sebelumnya
supabase/migrations/             Operasi owner, komunikasi, Storage, notifikasi
supabase/functions/              Upload, token Agora, worker notifikasi
tests/                          Integrasi PostgreSQL/PGlite dan aturan domain
docs/                           Setup, pemetaan spesifikasi, hasil validasi
```

Layar menggunakan interface melalui Context. Implementasi repository dapat diganti tanpa mengubah layar. Interface Auth/Profile/Property/Room/Pricing/Booking/Communication/Support dipisah menurut domain; tidak ada interface tunggal untuk seluruh tabel. MockStore menyediakan transaksi salin–validasi–simpan agar perubahan gagal tidak merusak data demo.

Database menggunakan RPC sempit dengan identitas `auth.uid()`, kepemilikan, penguncian inventory, dan `search_path` tetap. Client tidak memperoleh hak tulis langsung ke tabel sensitif. Setiap tabel publik yang memakai RLS memiliki SELECT policy; tes memeriksa cakupannya.

## Build native

```sh
npm run start:dev
# Atau bangun native secara lokal:
npx expo run:android
# macOS + Xcode:
npx expo run:ios
# Atau setelah menghubungkan proyek ke akun EAS sendiri:
npx eas-cli build --profile development --platform android
```

Untuk push, atur EAS project ID pada `.env`, konfigurasi FCM/APNs milik proyek, lalu bangun ulang. Untuk Agora, aktifkan App Certificate dan simpan di secret Edge Function. Tidak ada App Certificate dalam client.

## Status pengujian dan batas validasi

Lihat [VALIDATION.md](docs/VALIDATION.md). Bundel JavaScript/Hermes dapat diperiksa lokal; APK/IPA, push FCM/APNs, email, Storage cloud, dan panggilan dua perangkat memerlukan konfigurasi layanan serta perangkat nyata. ZIP ini tidak menyertakan akun layanan atau menjamin pengujian perangkat yang belum dilakukan.

Incoming call foreground memakai Realtime/polling. Push saat background/terminated membuka kotak notifikasi setelah diketuk. Tampilan panggilan sistem/CallKit/Android ConnectionService dan jaminan membangunkan aplikasi yang dihentikan tidak termasuk implementasi ini; panggilan kedaluwarsa tetap menjadi missed call oleh worker. Ini adalah batas integrasi perangkat, bukan panggilan native yang sudah diuji end-to-end.

Audit dependensi saat pembuatan melaporkan advisory transitif pada alat Expo (`braces`, `node-forge`, dan `uuid`/`xcode`). Versi perbaikan yang kompatibel belum tersedia dalam jalur yang diperiksa; saran `npm audit fix --force` menurunkan Expo ke SDK 44 dan tidak diterapkan. Periksa ulang advisory sebelum distribusi di luar demo; jangan menyatakan paket ini bebas seluruh kerentanan.

## Sumber teknis

- [Expo Development Build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Supabase Auth React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Agora token server](https://docs.agora.io/en/realtime-media/rtc/build/authenticate-users/deploy-token-server)
- [Jimp image processing](https://jimp-dev.github.io/jimp/api/jimp/classes/jimp/)

# Hasil validasi

Diperiksa pada 27 September 2026 di Windows, Node 24.21, Expo SDK 57.

## Pemeriksaan otomatis

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript `tsc --noEmit` (strict) | Lulus, tanpa error |
| ESLint | Lulus, tanpa error/peringatan |
| `npm test` | 16 pengujian lulus |
| `expo-doctor` | 21 dari 21 pemeriksaan lulus |
| Expo export Android/iOS | Bundle Hermes berhasil dibuat |
| Expo export web | Bundle browser berhasil dibuat |

Pengujian database menjalankan ketiga migrasi dan seed utuh dalam PostgreSQL melalui PGlite. Memeriksa 36 tabel dengan RLS+SELECT, listing tersembunyi, isolasi dua user/dua owner/admin, notes yang tidak terbaca admin, percakapan tanpa policy rekursif, penolakan penulisan client, harga/periode/fasilitas, Haversine, alokasi privat, constraint kapasitas/DP/relasi booking/review, dan pelestarian riwayat saat identitas dihapus.

Pengujian adapter menggunakan SDK `@supabase/supabase-js` asli dengan respons HTTP fixture: memastikan encoding RPC, filter ID, mapping view, serta penanganan error. Uji domain memeriksa DP/deposit, filter pada kamar yang sama, kos penuh, Haversine, dan pagination stabil.

## Pemeriksaan antarmuka

Preview Expo web dibuka pada ukuran 390 × 844. Diperiksa Home, foto/kartu, Detail Kos, Pilih Tipe Kamar, Pilih Paket Sewa, rincian biaya, dan ringkasan akhir. Tombol lanjut nonaktif sebelum pemilihan; tipe penuh tidak bisa dipilih. Filter AC + harga terendah mengubah harga Kos Griya Seturan menjadi Rp2.200.000 dan ketersediaan menjadi 1 unit, sesuai tipe Deluxe yang cocok. Paket bulanan Standard menghasilkan bayar saat booking Rp1.000.000 dan sisa sewa Rp1.000.000.

## Batas bukti

Belum terhubung ke project Supabase hosted milik user karena URL/kunci belum diberikan. SQL diuji pada PostgreSQL PGlite; Auth/JWT, Data API/PostgREST, serta konfigurasi Storage hosted tetap perlu diperiksa dengan `npm run check:supabase` setelah setup. Pengujian adapter fixture bukan klaim koneksi ke server hosted.

Android/iOS berhasil dibundel, tetapi belum diluncurkan pada emulator/perangkat nyata; bukan hasil APK/IPA atau bukti pengujian perangkat. Pengujian race dua koneksi untuk booking belum dilakukan dan berada di luar implementasi checkout. Uji keseluruhan MVP AC01–AC25 belum menjadi cakupan first commit.

Audit npm saat validasi melaporkan 10 temuan moderate yang diturunkan dari `uuid` lama pada rantai alat build `xcode`/Expo; tidak ada high/critical. Solusi otomatis yang ditawarkan audit adalah menurunkan Expo ke SDK 46, sehingga tidak diterapkan. Dependensi dipertahankan sesuai SDK 57 dan lockfile; periksa pembaruan upstream sebelum rilis di luar demo.

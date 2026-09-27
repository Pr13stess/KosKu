# KosKu — first commit

Aplikasi pencarian kos untuk demo akademik. Empat layar: **Home → Detail Kos → Pilih Tipe Kamar → Pilih Paket Sewa**. UI mengikuti wireframe lampiran: kartu dua kolom, latar krem, warna utama navy `#2A2D45`, dan aksen oranye. Semua komponen ditulis dengan React Native dan StyleSheet, tanpa UI library.

## Jalankan cepat

Prasyarat: Node.js **22.13+** (diuji dengan Node 24), npm, dan Expo Go yang mendukung SDK 57 atau development build.

```sh
npm ci
npm start
```

Pindai QR melalui Expo Go. Android dan komputer perlu berada pada jaringan yang sama. Bila LAN diblokir, jalankan `npx expo start --tunnel` dari `apps/user-app` (Expo dapat meminta paket tunnel). Untuk emulator Android: `npm run android`. Simulator iOS membutuhkan macOS/Xcode: `npm run ios`. Preview browser: `npm run web`.

Aplikasi langsung berfungsi dengan **mock** tanpa `.env`, akun, atau koneksi Supabase. Foto demo sudah dibundel secara lokal. Internet diperlukan saat instalasi dependensi dan membuka peta eksternal.

Stack yang dikunci dalam lockfile: Expo 57, React Native 0.86, React 19.2, TypeScript strict, `@react-navigation/native-stack` 7, `@supabase/supabase-js` 2. Gunakan `npm ci` agar versi sama dengan pengujian.

## Menghubungkan Supabase

Gunakan project Supabase baru untuk demo. SQL ini merupakan migrasi awal, bukan patch untuk database lama yang tabelnya sudah ada.

1. Buka Supabase Dashboard → SQL Editor. Jalankan file secara berurutan:
   - `supabase/migrations/202609270001_schema.sql`
   - `supabase/migrations/202609270002_rls.sql`
   - `supabase/migrations/202609270003_catalog.sql`
2. Opsional: jalankan `supabase/seed.sql` **sekali** pada database demo baru. Seed berisi identitas fiktif tanpa password, enam listing publik, empat listing tersembunyi untuk verifikasi, tipe/plan, serta fixture privat untuk pengujian. Identitas tersebut bukan akun login siap pakai.
3. Jalankan `supabase/tests/rls_coverage.sql`: hasil harus **0 baris**.
4. Salin `apps/user-app/.env.example` menjadi `apps/user-app/.env`.
5. Isi URL project dan **publishable key** dari Dashboard. Kunci `anon` legacy juga didukung melalui variabel alternatif. Jangan masukkan secret key atau `service_role` ke aplikasi.

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

6. Jalankan `npm run check:supabase` dari root untuk memeriksa tiga view dan RPC pencarian menggunakan kunci client. Script tidak mencetak kunci.
7. Restart Expo: dari `apps/user-app`, jalankan `npx expo start --clear`.

Provider otomatis memilih Supabase saat **URL dan salah satu kunci publik** terisi; jika salah satunya belum diisi, memakai mock. Setelah memilih Supabase, kegagalan query ditampilkan dengan tombol coba lagi dan tidak disamarkan sebagai mock. Data kosong pada Supabase benar-benar ditampilkan kosong. Data dari database melewati mapper dengan validasi respons.

`property_media.storage_path` pada first commit menerima URL HTTPS yang bisa dibaca publik atau alias `demo://kos-1` hingga `demo://kos-3` untuk aset lokal. Untuk foto nyata, isi URL publik bucket listing. Bucket privat chat/verifikasi, unggahan, dan signed URL berada di luar implementasi first commit; jangan taruh bukti identitas di jalur media listing.

## Struktur dan SOLID

```text
apps/user-app/
  App.tsx
  src/domain/
    models.ts                 Model katalog dan kontrak filter
    repositories/             PropertyRepository, RoomRepository, PricingRepository
    search.ts                 Pencarian mock/Haversine, tanpa React
    pricing.ts                Rincian biaya tanpa efek samping
  src/data/
    mock/                     Implementasi mock dan fixture lokal
    supabase/                 Implementasi Supabase melalui view/RPC
    mappers/                  Validasi respons katalog bersama
  src/providers/              Composition root/React Context
  src/navigation/             Native stack dan parameter route bertipe
  src/presentation/
    screens/                  Empat layar sesuai scope
    components/               Kartu, bottom sheet, foto, tombol, filter
    hooks/                    Loading/error/retry dan proteksi respons usang
    theme.ts                  Palet referensi
packages/database-types/      Kontrak status backend untuk tahap berikutnya
supabase/migrations/          Schema, RLS, katalog agregat
supabase/seed.sql              Data demo
supabase/tests/               Audit cakupan RLS
scripts/check-supabase.mjs     Pemeriksaan koneksi project Supabase milikmu
tests/                        Pengujian domain dan database PostgreSQL via PGlite
docs/                         Keputusan spesifikasi, RLS, validasi
```

- **Single Responsibility:** satu layar untuk satu langkah; komponen, perhitungan biaya, mapper, dan akses data dipisahkan.
- **Open/Closed:** adapter baru dapat ditambahkan tanpa mengubah layar.
- **Liskov:** implementasi mock dan Supabase mengikuti kontrak hasil yang sama; pencarian mock diuji terhadap SQL.
- **Interface Segregation:** tiga interface kecil sesuai domain, bukan satu interface semua tabel.
- **Dependency Inversion:** layar mendapatkan interface lewat Context; hanya `RepositoryProvider` mengimpor implementasi konkret. Untuk pengujian, Provider menerima `repositories` alternatif.

## Perilaku dalam scope

- Home: pencarian nama/area/kota setelah Cari, pilihan lokasi acuan, filter harga/periode/gender/fasilitas/rating/jarak, pengurutan, pagination 20 item, state loading/error/kosong.
- Lokasi acuan: titik demo yang diberi label atau input label + koordinat manual. Haversine dihitung server pada mode Supabase. Tidak ada geocoding publik per karakter atau izin lokasi otomatis.
- Detail: galeri, foto diperbesar, alamat, tautan peta OpenStreetMap, fasilitas, peraturan, owner publik, rating agregat, dan tipe kamar. Kartu peta adalah shortcut ilustratif; peta geografis dibuka pada OpenStreetMap. Zoom pinch memakai dukungan ScrollView iOS; platform lain tetap memiliki tampilan foto besar.
- Pilihan kamar: tipe penuh terlihat tetapi tidak dapat dipilih. Pilihan paket menampilkan harga per periode, DP, deposit, sisa sewa, dan ketentuan.
- Tombol akhir membuka ringkasan pilihan. Tidak menahan unit, membuat booking, ataupun menerima pembayaran.
- Data schema mencakup **36 tabel**, seluruhnya RLS aktif dan memiliki policy SELECT. Detail perbaikan dari lampiran ada di `docs/spec-decisions.md`.

## Di luar first commit

Tidak ada login/registrasi, owner app, admin web, eksekusi checkout/hold/payment/refund, Midtrans, chat/call/Agora, editor notes, favorit persisten, notifikasi, penghapusan akun, geocoding/GPS, ataupun upload Storage. Tombol fitur lanjutan pada referensi membuka pemberitahuan singkat. Tabel, enum dan constraint untuk fitur tersebut tersedia; client belum diberi hak tulis. Pemrosesan backend tetap wajib dibuat dan diuji pada tahap berikutnya.

Auth dipakai sebagai sumber identitas schema (`auth.users`/`auth.uid()`); UI autentikasi dan provisioning profil baru sengaja belum dibuat. Ketentuan dokumen untuk keseluruhan MVP dan AC01–AC25 tidak diklaim selesai oleh first commit ini.

## Periksa kualitas

```sh
npm run typecheck
npm run lint
npm test
npm run export:web --workspace=@kosku/user-app
npm run export:mobile --workspace=@kosku/user-app
cd apps/user-app
npx expo-doctor
```

Pengujian database menggunakan PostgreSQL WASM (PGlite), membuat role anon/authenticated dan stub minimal `auth.uid()`, lalu menjalankan migrasi/seed yang sama. Ini menguji SQL/RLS, bukan menggantikan uji JWT/PostgREST pada Supabase live. Rincian bukti dan batas pengujian ada di `docs/validation.md`.

## Git dan ZIP

ZIP mencakup source, aset, SQL, README, lockfile, dan direktori tersembunyi `.git` dengan **satu commit** di branch `main`. `node_modules`, `.env`, cache Expo, serta hasil build tidak dimasukkan. Setelah ekstrak:

```sh
git log --oneline
git remote add origin <URL_REPOSITORY_KAMU>
git push -u origin main
```

Nama penulis commit lokal menggunakan identitas netral `KosKu Project`; tidak ada remote atau akun GitHub yang dikonfigurasi.

## Referensi teknis

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [React Navigation Native Stack](https://reactnavigation.org/docs/native-stack-navigator/)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase views dan security_invoker](https://supabase.com/docs/guides/database/views)

Foto demo diambil dari bagian foto pada referensi UI yang disediakan user. Resolusinya mengikuti sumber; ganti dengan foto asli beresolusi lebih tinggi untuk presentasi akhir. Tidak ada klaim kepemilikan atas foto referensi.

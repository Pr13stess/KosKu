# Setup layanan owner

## Migrasi

Gunakan **backend Supabase yang sama** dengan aplikasi user. Ini bukan pembuatan backend kedua.

- `base/202609270001_schema.sql`: 36 tabel dasar, enum, constraint, trigger integritas.
- `base/202609270002_rls.sql`: akses SELECT minimum.
- `base/202609270003_catalog.sql`: proyeksi katalog/agregat aplikasi user.
- `migrations/202610020001_owner.sql`: owner CRUD/RPC, aggregate dashboard, inventory, check-in/out, permintaan khusus.
- `migrations/202610020002_communication.sql`: chat/call/restriction/report, timeout, Realtime.
- `migrations/202610020003_storage_permissions.sql`: bucket privat, metadata upload, outbox push, grants RPC.
- `migrations/202610030001_workflow_events.sql`: pembatasan hold baru, buka percakapan, notifikasi perubahan status, bootstrap profil.

Jalankan manual berurutan di SQL Editor seperti petunjuk README. File base dipisahkan agar tidak ikut diterapkan kembali saat menghubungkan ke database lama. Jika memakai CLI migration tracking, tandai migrasi yang sudah diterapkan dengan `supabase migration repair` sesuai riwayat proyek; jangan menjalankan `db reset` pada database yang berisi data.

## Edge Functions

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy owner-upload
npx supabase functions deploy agora-token
npx supabase functions deploy owner-maintenance
```

Salin `supabase/functions/.env.example` menjadi `.env` dalam folder yang sama. Isi `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, dan `WORKER_SECRET` acak panjang. `EXPO_ACCESS_TOKEN` digunakan jika keamanan token Expo Push diaktifkan. Supabase menyediakan secret URL/anon/service role untuk runtime Edge Functions. Jangan commit `.env` mana pun.

`verify_jwt=false` digunakan agar publishable key modern dapat dipakai: `owner-upload` dan `agora-token` memvalidasi token bearer lewat `auth.getUser()` sendiri. Worker memerlukan secret terpisah. Tidak ada endpoint user yang mempercayai user ID dari payload.

### Unggahan

JPG/PNG maksimal 5 MB. Client mengecilkan foto dan backend memeriksa signature, melakukan decode, resize, serta encode JPEG baru untuk membuang EXIF. Metadata upload ditulis server; client tidak dapat memalsukan bukti verifikasi atau memakai gambar milik akun lain. Hanya peserta percakapan dapat melihat gambar chat yang sudah dikirim. Bukti laporan privat untuk pelapor dan admin penanganan.

### Worker setiap menit

Jadwalkan HTTPS POST ke:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/owner-maintenance
Authorization: Bearer YOUR_WORKER_SECRET
Content-Type: application/json
Body: {}
```

Gunakan Supabase Cron + Vault/pg_net atau scheduler server lain. Secret harus berada di Vault/server, bukan di query yang dibagikan ke client. Worker menutup panggilan tidak terjawab (>45 detik), menutup koneksi tanpa heartbeat (>90 detik), mengirim push dari outbox, memeriksa receipt, dan menonaktifkan token invalid. Foreground read juga menjalankan expiry sebagai pemulihan, tetapi worker tetap diperlukan saat kedua aplikasi ditutup.

Push bersifat retry dengan kemungkinan pengiriman ulang setelah kegagalan jaringan; notification inbox sendiri menggunakan event key unik. Worker tidak mengirim teks chat, bukti, atau rincian pembayaran ke layar kunci. Batas percobaan 5 per pasangan notifikasi/token; periksa baris RETRY/FAILED pada outbox dengan akun backend jika perlu.

## Integrasi dengan aplikasi user

RPC shared tersedia untuk client user yang telah login:

- `communication_open(pid, null)` membuka chat untuk dirinya pada listing publik.
- `communication_messages(cid)` mengambil 300 pesan terakhir dan memperbarui read timestamp.
- `communication_send(cid, content, image_path, client_id)` memakai UUID client tetap untuk retry.
- `communication_start(cid, 'VOICE'|'VIDEO')`, `communication_call(call_id, 'accept'|'decline'|'end'|'fail'|'ping')`.
- `owner_read('calls')` dan `owner_read('conversations')` mengembalikan hanya percakapan yang diikuti akun, meski namanya berawalan owner.
- `agora-token` memberi UID 1 untuk caller dan 2 untuk receiver; channel berasal dari record panggilan, tidak dipilih client.
- Pemanggilan `ping` tiap 20 detik selama tersambung. Token berlaku 300 detik dan perlu diperbarui saat callback Agora meminta.

Owner dapat membuka percakapan dengan penyewa terkait booking melalui tombol **Chat penyewa**. Chat tidak mensyaratkan pembayaran bagi user yang memulai dari listing publik. Pembatasan komunikasi diperiksa saat mengirim pesan/memulai/menerima call. Pembatasan booking diperiksa oleh trigger sebelum alokasi HOLD baru; hold lama tidak dibatalkan diam-diam.

Foto path `owner-media/...` harus diubah menjadi URL dengan `storage.from('owner-media').createSignedUrl(path.slice(12), 1800)`. Untuk aplikasi user anonim, policy hanya mengizinkan foto yang sudah terhubung ke listing publik approved/aktif.

## Tanggung jawab layanan lain

Owner app membaca hasil pembayaran, refund, payout dari backend bersama. Endpoint Midtrans checkout/webhook, proses refund admin, approval verifikasi, moderasi, dan eksekusi penghapusan akun bukan endpoint yang dijalankan owner. Paket ini tidak mengganti implementasi admin/user tersebut. Semua financial data memakai skema Sandbox sebelumnya; tidak ada tombol owner untuk memalsukan transaksi sukses.

Sisa sewa saat check-in dicatat dalam alasan/riwayat booking sebagai koordinasi demo; tidak membuat tagihan gateway atau klaim uang diterima otomatis. Penerimaan di dashboard berasal dari snapshot booking yang memiliki payment sukses, bukan harga listing saat ini.

## Uji penerimaan di layanan nyata

1. Buat dua akun owner dan dua akun user lewat Auth. Jangan memakai service role di aplikasi.
2. Buat kos masing-masing; pastikan owner lain tidak dapat membaca data privat/mengubahnya.
3. Ajukan bukti dummy. Approve melalui admin/backend yang berwenang; verifikasi owner dan property secara terpisah.
4. Pastikan foto privat dan chat tidak dapat diakses akun ketiga, dan listing draft tidak muncul ke publik.
5. Hubungkan dua development build dengan Agora. Uji voice/video, izin ditolak, ganti kamera, putus jaringan, sibuk, reject, end, dan timeout.
6. Uji notifikasi foreground/background/terminated. Ketuk push, pastikan call yang expired tidak dapat diterima lagi.
7. Uji logout mencabut token instalasi owner dan tidak mencabut instalasi aplikasi user.
8. Uji check-in/out dengan booking sandbox yang confirmed; pastikan reserved→occupied→cleaning, retry tidak menggandakan efek.

Tes lokal tidak menggantikan delapan langkah uji layanan/perangkat ini.

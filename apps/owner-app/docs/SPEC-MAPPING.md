# Pemetaan spesifikasi revisi 2.0

| Bagian dokumen             | Implementasi owner                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 2: aplikasi/peran/Auth     | Owner app mandiri, identitas Supabase bersama, native stack, profil dan login email                             |
| 4: properti & inventory    | Kos, room type, fasilitas, kondisi kapasitas, optimistic version + row lock                                     |
| 5–6: booking               | Daftar/detail, snapshot, check-in/out, permintaan pembatalan khusus; tanpa persetujuan booking normal           |
| 7–8: pembayaran/harga      | Paket fleksibel, DP/deposit, status payment/refund, laporan Sandbox; eksekusi transaksi oleh backend user/admin |
| 9: komunikasi              | Chat TEXT/IMAGE/CALL_EVENT, Realtime, private images, Agora token server + native media                         |
| 10: notes/bookmark         | Fitur pencari kos; owner tidak membaca notes user dan tidak mendapat editor notes user                          |
| 11: owner & moderasi       | Onboarding, bukti dummy, dua status verifikasi, CRUD kos, restriction, report, antrean admin                    |
| 12: notifikasi/ulasan/akun | Inbox, push worker, read status, ulasan approved readonly, profil/password, kebijakan, permintaan penghapusan   |
| 13–15: keamanan/data       | Schema dasar lengkap, SELECT RLS semua tabel, narrow RPC, tiga tabel tambahan, Storage privat, audit/events     |

## Keputusan UI

- Warna mengikuti aplikasi terdahulu: `#2A2D45`, `#F58A00`, `#FAF7F1`.
- Beranda: sapaan, kapasitas, properti, penerimaan simulasi, aktivitas, tombol tambah tengah.
- Detail kos: foto, informasi, tab Ringkasan/Kamar/Booking/Ulasan.
- Onboarding: bukti uji, identitas, data kos. Tombol menambahkan tipe kamar dapat digunakan berulang; tidak membatasi kos pada satu tipe.
- Kolom “Jumlah tersedia” pada gambar dijadikan hasil hitung sesuai aturan dokumen, bukan input bebas.
- Data rekening pada wireframe tidak diminta: Model A demo di dokumen tidak memerlukan akun submerchant/rekening owner dan tidak memindahkan dana nyata.
- “Scan KTP” adalah label tahapan wireframe; implementasi menyebut bukti dummy dan tidak mengklaim OCR/validasi identitas otomatis.

## Batas paket owner

Paket ini berisi sisi owner dan kontrak backend yang dibutuhkannya. Admin web, UI pencari kos, checkout Midtrans user, serta sistem panggilan native tingkat OS tidak ditambahkan ke ZIP owner. Dokumen sumber tetap menjadi acuan untuk pengembangan komponen-komponen itu secara terpisah. Integrasi call/push native disertakan, tetapi validasi end-to-end memerlukan kredensial dan dua perangkat.

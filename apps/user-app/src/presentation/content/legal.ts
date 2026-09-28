export const POLICY_VERSION = "2026-09-28-mockup-1";

export const ACADEMIC_NOTICE =
  "MOCKUP AKADEMIK. Dokumen ini dibuat untuk prototipe aplikasi pencarian kos dalam proyek kuliah. Lingkungan ini memakai data uji dan pembayaran sandbox. Dokumen ini bukan kebijakan layanan komersial.";

export interface LegalSection {
  title: string;
  body: string;
}

export const LEGAL: Record<
  "privacy" | "terms",
  { title: string; sections: LegalSection[] }
> = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        title: "Tujuan pemrosesan",
        body: "Aplikasi menggunakan data akun untuk autentikasi, profil untuk komunikasi, lokasi pilihan untuk pencarian kos, serta data booking dan pembayaran uji untuk menjalankan demonstrasi. Catatan pribadi digunakan hanya untuk membantu pengguna mencatat pertimbangan kos.",
      },
      {
        title: "Data yang diproses",
        body: "Data dapat meliputi nama, email, nomor HP, foto profil, lokasi yang dipilih atau diizinkan, chat dan gambar, catatan pribadi, favorit, metadata panggilan, booking, transaksi sandbox, laporan, dan bukti verifikasi uji. Gunakan data dummy untuk dokumen identitas selama demonstrasi.",
      },
      {
        title: "Akses dan layanan pendukung",
        body: "Owner menerima data yang diperlukan untuk percakapan dan booking terkait. Catatan hanya tersedia bagi pembuat melalui aplikasi. Supabase memproses penyimpanan dan autentikasi, Agora memproses media panggilan, Midtrans memproses transaksi uji, dan layanan notifikasi mengirim pemberitahuan. Audio dan video panggilan tidak direkam oleh fitur aplikasi.",
      },
      {
        title: "Izin perangkat",
        body: "Lokasi, kamera, mikrofon, galeri, dan notifikasi diminta sesuai kebutuhan fitur. Kamu dapat menolak atau mencabut izin melalui pengaturan perangkat. Pencarian manual tetap tersedia ketika lokasi ditolak.",
      },
      {
        title: "Kontrol data",
        body: "Kamu dapat mengubah profil, menghapus catatan dan favorit, mengatur notifikasi, serta mengajukan hapus akun. Riwayat transaksi atau kasus yang belum selesai ditangani sebelum identitas akun dilepas.",
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    sections: [
      {
        title: "Penggunaan demo",
        body: "Layanan dipakai untuk pembelajaran dan pengujian terbatas. Listing serta identitas uji tidak menjadi penawaran sewa nyata. Pengguna harus menjaga kredensial, memberikan data uji yang sesuai, dan tidak menggunakan layanan untuk spam, penipuan, atau perilaku mengganggu.",
      },
      {
        title: "Booking dan biaya",
        body: "Pengguna memilih tipe kamar dan paket, membaca DP serta security deposit, lalu mengikuti masa berlaku hold. Konfirmasi booking bergantung pada ketersediaan dan hasil pembayaran yang diverifikasi backend.",
      },
      {
        title: "Pembayaran dan verifikasi",
        body: "Semua pembayaran memakai simulator sandbox, tanpa dana nyata. Badge verifikasi menunjukkan pemeriksaan administratif pada demo. Pengelola dapat meninjau laporan dan membatasi akun atau listing dengan alasan yang dicatat. Jika prototipe dikembangkan menjadi layanan publik, kebijakan operasional dan dokumen legal harus ditinjau kembali sebelum peluncuran.",
      },
    ],
  },
};

export const FAQ: LegalSection[] = [
  {
    title: "Bagaimana cara mencari kos dekat kampus?",
    body: "Di Home, pilih lokasi acuan (misalnya kampus), lalu urutkan berdasarkan Terdekat. Jarak yang tampil adalah jarak garis lurus, bukan jarak rute.",
  },
  {
    title: "Apakah pembayaran di aplikasi ini nyata?",
    body: "Tidak. Semua pembayaran adalah simulasi sandbox dan tidak ada uang nyata yang berpindah.",
  },
  {
    title: "Apa arti badge terverifikasi?",
    body: "Badge menunjukkan pemeriksaan administratif pada demo, bukan jaminan kualitas kos.",
  },
  {
    title: "Kenapa harga di kartu berbeda dengan harga di detail?",
    body: "Kartu menampilkan harga mulai dari untuk periode sewa yang sedang kamu filter. Harga tiap tipe kamar dan paket ada di halaman detail.",
  },
  {
    title: "Bagaimana mengubah data akun?",
    body: "Buka Profil, lalu pilih Ubah profil atau Ubah password.",
  },
];

export const ABOUT_TEXT =
  "KosKu adalah aplikasi pencarian kos untuk proyek kuliah. Semua data listing, akun, dan transaksi adalah data uji.";

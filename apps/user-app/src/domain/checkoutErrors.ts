const messages: Record<string, string> = {
  SOLD_OUT: "Unit terakhir baru saja diambil pengguna lain. Coba tipe atau paket lain.",
  ACTIVE_CHECKOUT_EXISTS:
    "Kamu masih punya checkout aktif untuk tipe kamar ini. Selesaikan atau batalkan dulu.",
  BOOKING_RESTRICTED: "Pemilik kos membatasi booking dari akunmu.",
  PLAN_UNAVAILABLE: "Paket ini sudah tidak tersedia.",
  NO_UPFRONT_PAYMENT:
    "Paket ini tidak memiliki DP atau deposit, sehingga belum bisa dibayar lewat checkout.",
  INVALID_PRICING: "Konfigurasi harga paket tidak valid. Hubungi pemilik kos.",
  OWN_PROPERTY: "Kamu tidak bisa memesan kos milikmu sendiri.",
  BOOKING_NOT_FOUND: "Booking tidak ditemukan.",
  CANNOT_CANCEL_HERE:
    "Pembayaran sudah berhasil. Pembatalan booking terkonfirmasi diproses lewat refund.",
  HOLD_EXPIRED: "Waktu checkout sudah habis.",
  BOOKING_NOT_PAYABLE: "Booking ini tidak bisa dibayar lagi.",
  PAYMENT_PROVIDER_ERROR:
    "Layanan pembayaran sedang bermasalah. Kamarmu masih ditahan, coba lagi sebentar.",
  UNAUTHENTICATED: "Sesi habis. Silakan masuk lagi.",
};
export class CheckoutError extends Error {
  constructor(readonly code: string) {
    super(messages[code] ?? "Checkout gagal. Coba lagi.");
  }
}
/** Business errors are matched by their stable code, never by free text. */
export function toCheckoutError(input: unknown): CheckoutError {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : "";
  const code = Object.keys(messages).find((c) => raw.includes(c));
  return new CheckoutError(code ?? "UNKNOWN");
}

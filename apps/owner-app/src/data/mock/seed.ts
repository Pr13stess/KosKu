import {
  Booking,
  Call,
  Conversation,
  Finance,
  Message,
  Notice,
  Plan,
  Profile,
  Property,
  Report,
  Restriction,
  Review,
  Room,
} from "../../domain/models";
export interface State {
  profile: Profile;
  properties: Property[];
  rooms: Room[];
  plans: Plan[];
  bookings: Booking[];
  reviews: Review[];
  conversations: Conversation[];
  messages: Message[];
  calls: Call[];
  restrictions: Restriction[];
  notices: Notice[];
  reports: Report[];
  finance: Finance;
  policies: boolean;
  deletion: boolean;
}
export const ownerId = "11111111-1111-4111-8111-111111111111";
export const uid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
export function seed(): State {
  const properties: Property[] = ["Green Living", "Senja Residence"].map(
    (name, i) => ({
      id: `p${i + 1}`,
      name: `Kos ${name}`,
      address: i
        ? "Jl. Kaliurang Km 5, Sleman"
        : "Jl. Gejayan No. 27, Depok, Sleman",
      city: "Yogyakarta",
      province: "DI Yogyakarta",
      latitude: -7.76 + i * 0.008,
      longitude: 110.39,
      gender_type: i ? "FEMALE" : "MIXED",
      description:
        "Hunian nyaman dengan lingkungan tenang, dekat kampus dan tempat makan. Cocok untuk mahasiswa dan pekerja.",
      rules:
        "Tidak merokok di dalam kamar. Jam tenang mulai pukul 22.00. Tamu wajib lapor.",
      verification_status: "APPROVED",
      publication_status: "ACTIVE",
      photos: [`demo://kos-${i + 1}`],
      facilities: ["Wi-Fi", "Parkir", "Dapur bersama"],
    }),
  );
  const rooms: Room[] = properties.flatMap((p, i) =>
    [0, 1].map((n) => ({
      id: `r${i * 2 + n + 1}`,
      property_id: p.id,
      name: n ? "Deluxe" : "Standard",
      floor_label: n ? "Lantai 2" : "Lantai 1",
      room_size_m2: n ? 16 : 12,
      bathroom_type: n ? "PRIVATE" : "SHARED",
      description: "Kamar terang dengan ventilasi baik.",
      is_active: true,
      facilities: n
        ? ["AC", "Kasur", "Meja", "Lemari"]
        : ["Kasur", "Meja", "Lemari"],
      inventory: {
        total: 10,
        occupied: n ? 5 : 6,
        cleaning: 1,
        maintenance: 0,
        inactive: 0,
        hold: 0,
        reserved: i === 0 && n === 0 ? 1 : 0,
        version: 1,
      },
    })),
  );
  const plans: Plan[] = rooms.map((r) => ({
    id: `plan-${r.id}`,
    room_type_id: r.id,
    name: "Bulanan",
    duration_unit: "MONTH",
    duration_value: 1,
    price: r.name === "Deluxe" ? 1800000 : 1250000,
    down_payment_type: "PERCENTAGE",
    down_payment_value: 50,
    security_deposit_type: "FIXED",
    security_deposit_value: 500000,
    deposit_refundable: true,
    deposit_terms:
      "Dikembalikan setelah pemeriksaan kondisi kamar dan pengurangan kerusakan jika ada.",
    is_active: true,
  }));
  const bookings: Booking[] = ["CONFIRMED", "ACTIVE", "COMPLETED"].map(
    (status, i) => ({
      id: `b${i + 1}`,
      booking_code: `KK-260${i + 1}`,
      user_id: `tenant${i + 1}`,
      tenant: ["Nadia Putri", "Raka Pratama", "Dina Amelia"][i],
      property_id: "p1",
      property_name_snapshot: properties[0].name,
      room_type_id: "r1",
      room_type_name_snapshot: "Standard",
      pricing_plan_name_snapshot: "Bulanan",
      status: status as Booking["status"],
      planned_move_in_date: "2026-10-05",
      rent_price_snapshot: 1250000,
      down_payment_snapshot: 625000,
      security_deposit_snapshot: 500000,
      remaining_rent_snapshot: 625000,
      payment_status: "SUCCESS",
      refund_status: "—",
      cancel_note: "",
      events: [
        {
          to_status: status,
          reason: "Data contoh demonstrasi",
          created_at: "2026-10-02T03:00:00Z",
        },
      ],
    }),
  );
  return {
    profile: {
      id: ownerId,
      full_name: "Chasan Myunda",
      phone: "081234567890",
      email: "owner@kosku.demo",
      address: "Yogyakarta",
      verification_status: "APPROVED",
      push_enabled: false,
    },
    properties,
    rooms,
    plans,
    bookings,
    reviews: [
      {
        id: "review1",
        property_id: "p1",
        tenant: "Dina Amelia",
        rating: 5,
        review_text: "Kosnya nyaman, bersih, dan pemilik sangat membantu.",
        created_at: "2026-10-01T04:00:00Z",
      },
    ],
    conversations: [
      {
        id: "c1",
        property_id: "p1",
        property_name: properties[0].name,
        user_id: "tenant1",
        tenant: "Nadia Putri",
        last_message: "Boleh survei kamar sore ini, Pak?",
        unread: 1,
      },
    ],
    messages: [
      {
        id: "m1",
        conversation_id: "c1",
        sender_id: "tenant1",
        message_type: "TEXT",
        text_content: "Halo Pak, boleh survei kamar sore ini?",
        storage_path: "",
        created_at: new Date().toISOString(),
      },
    ],
    calls: [],
    restrictions: [],
    notices: [
      {
        id: "n1",
        title: "Booking baru terkonfirmasi",
        body: "Nadia Putri • Kos Green Living",
        created_at: new Date().toISOString(),
        read_at: null,
        target_type: "BOOKING",
        target_id: "b1",
      },
    ],
    reports: [],
    finance: {
      rent_received: 1875000,
      deposit_held: 1500000,
      refund_amount: 0,
      payout_amount: 625000,
      items: [
        {
          id: "pay1",
          label: "KK-2601 • DP sewa",
          amount: 625000,
          status: "SUCCESS",
        },
        {
          id: "pay2",
          label: "Payout contoh",
          amount: 625000,
          status: "SIMULATED_PAID",
        },
      ],
    },
    policies: false,
    deletion: false,
  };
}

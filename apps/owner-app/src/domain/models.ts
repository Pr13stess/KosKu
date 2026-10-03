export type Verification = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  verification_status: Verification;
  review_reason?: string;
  push_enabled: boolean;
}
export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  gender_type: "MALE" | "FEMALE" | "MIXED";
  description: string;
  rules: string;
  verification_status: Verification;
  publication_status:
    "DRAFT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ARCHIVED";
  photos: string[];
  facilities: string[];
  review_reason?: string;
}
export type PropertyInput = Omit<
  Property,
  "verification_status" | "review_reason"
>;
export interface Inventory {
  total: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  inactive: number;
  hold: number;
  reserved: number;
  version: number;
}
export interface Room {
  id: string;
  property_id: string;
  name: string;
  floor_label: string;
  room_size_m2: number;
  bathroom_type: "PRIVATE" | "SHARED";
  description: string;
  is_active: boolean;
  facilities: string[];
  inventory: Inventory;
}
export interface Plan {
  id: string;
  room_type_id: string;
  name: string;
  duration_unit: "DAY" | "WEEK" | "MONTH" | "YEAR";
  duration_value: number;
  price: number;
  down_payment_type: "NONE" | "FIXED" | "PERCENTAGE";
  down_payment_value: number;
  security_deposit_type: "NONE" | "FIXED" | "PERCENTAGE";
  security_deposit_value: number;
  deposit_refundable: boolean;
  deposit_terms: string;
  is_active: boolean;
}
export interface Booking {
  id: string;
  booking_code: string;
  user_id: string;
  tenant: string;
  property_id: string;
  property_name_snapshot: string;
  room_type_id: string;
  room_type_name_snapshot: string;
  pricing_plan_name_snapshot: string;
  status:
    | "DRAFT"
    | "HELD"
    | "PENDING_PAYMENT"
    | "CONFIRMED"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED";
  planned_move_in_date: string;
  rent_price_snapshot: number;
  down_payment_snapshot: number;
  security_deposit_snapshot: number;
  remaining_rent_snapshot: number;
  payment_status: string;
  refund_status: string;
  cancel_note: string;
  events: { to_status: string; reason: string; created_at: string }[];
}
export interface Review {
  id: string;
  property_id: string;
  tenant: string;
  rating: number;
  review_text: string;
  created_at: string;
}
export interface Conversation {
  id: string;
  property_id: string;
  property_name: string;
  user_id: string;
  tenant: string;
  last_message: string;
  unread: number;
}
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: "TEXT" | "IMAGE" | "CALL_EVENT";
  text_content: string;
  storage_path: string;
  created_at: string;
}
export interface Call {
  id: string;
  answered_at?: string;
  ended_at?: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "VOICE" | "VIDEO";
  status:
    | "RINGING"
    | "CONNECTED"
    | "COMPLETED"
    | "MISSED"
    | "DECLINED"
    | "CANCELLED"
    | "FAILED";
  agora_channel_id: string;
  created_at: string;
  duration_seconds: number;
}
export interface Restriction {
  id: string;
  user_id: string;
  block_communication: boolean;
  block_booking: boolean;
  reason: "SPAM" | "BAD_BEHAVIOR" | "OTHER";
  notes: string;
  status: "ACTIVE" | "REVOKED";
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  target_type: string;
  target_id: string;
}
export interface Report {
  id: string;
  target_type: string;
  target_id: string;
  category: string;
  description: string;
  status: string;
  resolution_note: string;
  created_at: string;
}
export interface Finance {
  rent_received: number;
  deposit_held: number;
  refund_amount: number;
  payout_amount: number;
  items: { id: string; label: string; amount: number; status: string }[];
}
export interface Dashboard {
  properties: Property[];
  rooms: Room[];
  bookings: Booking[];
  reviews: Review[];
  finance: Finance;
  activities: { id: string; title: string; body: string; created_at: string }[];
}
export interface MediaInput {
  base64: string;
  mime: "image/jpeg" | "image/png";
  purpose: "property" | "verification" | "chat" | "report";
  context_id?: string;
}
export interface Session {
  id: string;
  email: string;
}
export const available = (i: Inventory) =>
  i.total -
  i.occupied -
  i.cleaning -
  i.maintenance -
  i.inactive -
  i.hold -
  i.reserved;
export function validateInventory(i: Inventory, activeBookings = 0) {
  if (
    Object.values(i).some((n) => !Number.isSafeInteger(n) || n < 0) ||
    available(i) < 0
  )
    throw new Error(
      "Jumlah kondisi dan alokasi melebihi kapasitas, atau bukan bilangan bulat.",
    );
  if (i.occupied < activeBookings)
    throw new Error(
      "Penyewa aktif harus dikeluarkan melalui checkout booking.",
    );
}
export function validatePlan(p: Plan) {
  if (
    !p.name.trim() ||
    !Number.isSafeInteger(p.duration_value) ||
    p.duration_value < 1 ||
    ![p.price, p.down_payment_value, p.security_deposit_value].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  )
    throw new Error("Nama, durasi, dan nominal paket belum valid.");
  for (const [type, value] of [
    [p.down_payment_type, p.down_payment_value],
    [p.security_deposit_type, p.security_deposit_value],
  ] as const)
    if (
      (type === "PERCENTAGE" && value > 100) ||
      (type === "NONE" && value !== 0)
    )
      throw new Error("Persentase maksimal 100; tanpa biaya harus bernilai 0.");
  if (p.down_payment_type === "FIXED" && p.down_payment_value > p.price)
    throw new Error("DP tidak boleh melebihi harga sewa.");
}
export function costs(p: Plan) {
  const amount = (t: Plan["down_payment_type"], v: number, fallback: number) =>
    t === "NONE"
      ? fallback
      : t === "FIXED"
        ? v
        : Math.round((p.price * v) / 100);
  const dp = amount(p.down_payment_type, p.down_payment_value, p.price);
  const deposit = amount(p.security_deposit_type, p.security_deposit_value, 0);
  return { dp, deposit, pay_now: dp + deposit, remaining: p.price - dp };
}

export type Gender = "MALE" | "FEMALE" | "MIXED";
export type DurationUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";
export interface Plan {
  id: string;
  room_type_id: string;
  name: string;
  duration_unit: DurationUnit;
  duration_value: number;
  price: number;
  currency: string;
  down_payment: number;
  security_deposit: number;
  deposit_refundable: boolean;
  deposit_terms: string | null;
}
export interface Room {
  id: string;
  property_id: string;
  name: string;
  floor_label: string | null;
  room_size_m2: number;
  bathroom_type: "PRIVATE" | "SHARED";
  description: string | null;
  available: number;
  facilities: string[];
  plans: Plan[];
}
export interface Property {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  gender_type: Gender;
  rules: string;
  owner_name: string;
  images: string[];
  facilities: string[];
  rating: number;
  review_count: number;
  available: number;
}
export interface Listing extends Property {
  starting_price: number;
  matching_available: number;
  distance_km: number | null;
}
export interface ReferenceLocation {
  label: string;
  latitude: number;
  longitude: number;
}
export interface SearchQuery {
  text: string;
  durationUnit: DurationUnit;
  durationValue: number;
  gender: Gender | null;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  roomFacilities: string[];
  propertyFacilities: string[];
  reference: ReferenceLocation | null;
  maxDistance: number | null;
  sort: "recommended" | "price" | "rating" | "nearest";
  page: number;
}
export interface AuthUser {
  id: string;
  email: string | null;
}
export interface Session {
  user: AuthUser;
}
export type MessageType = "TEXT" | "IMAGE" | "CALL_EVENT";
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: MessageType;
  text_content: string | null;
  image_url: string | null;
  client_message_id: string;
  created_at: string;
}
export interface Conversation {
  id: string;
  property_id: string;
  property_name: string;
  user_id: string | null;
  owner_id: string | null;
  updated_at: string;
  last_message: Message | null;
}
export type BookingStatus =
  | "DRAFT"
  | "HELD"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";
export interface Checkout {
  bookingId: string;
  bookingCode: string;
  status: BookingStatus;
  cancelReason: string | null;
  propertyName: string;
  roomTypeName: string;
  planName: string;
  rent: number;
  downPayment: number;
  securityDeposit: number;
  payNow: number;
  remainingRent: number;
  holdExpiresAt: string | null;
  serverNow: string;
  paymentStatus: string | null;
  redirectUrl: string | null;
}
export const defaultQuery: SearchQuery = {
  text: "",
  durationUnit: "MONTH",
  durationValue: 1,
  gender: null,
  minPrice: 0,
  maxPrice: 1000000000,
  minRating: 0,
  roomFacilities: [],
  propertyFacilities: [],
  reference: null,
  maxDistance: null,
  sort: "recommended",
  page: 0,
};

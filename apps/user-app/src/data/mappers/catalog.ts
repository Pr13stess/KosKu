import type {
  Property,
  Room,
  Plan,
  Listing,
  Gender,
  DurationUnit,
} from "../../domain/models";
function record(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new Error("Format data katalog tidak valid.");
  return x as Record<string, unknown>;
}
function str(x: unknown): string {
  if (typeof x !== "string") throw new Error("Kolom teks katalog tidak valid.");
  return x;
}
function num(x: unknown): number {
  if (typeof x !== "number" || !Number.isFinite(x))
    throw new Error("Kolom angka katalog tidak valid.");
  return x;
}
function strings(x: unknown): string[] {
  if (!Array.isArray(x)) throw new Error("Daftar fasilitas tidak valid.");
  return x.map(str);
}
export function array<T>(x: unknown, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(x)) throw new Error("Respons katalog tidak valid.");
  return x.map(parse);
}
function optional(x: unknown): string | null {
  return x == null ? null : str(x);
}
export function parsePlan(x: unknown): Plan {
  const p = record(x);
  const unit = str(p.duration_unit);
  if (!["DAY", "WEEK", "MONTH", "YEAR"].includes(unit))
    throw new Error("Periode tidak valid.");
  if (typeof p.deposit_refundable !== "boolean")
    throw new Error("Kebijakan deposit tidak valid.");
  return {
    id: str(p.id),
    room_type_id: str(p.room_type_id),
    name: str(p.name),
    duration_unit: unit as DurationUnit,
    duration_value: num(p.duration_value),
    price: num(p.price),
    currency: str(p.currency),
    down_payment: num(p.down_payment),
    security_deposit: num(p.security_deposit),
    deposit_refundable: p.deposit_refundable,
    deposit_terms: optional(p.deposit_terms),
  };
}
export function parseRoom(x: unknown): Room {
  const r = record(x);
  const bath = str(r.bathroom_type);
  if (bath !== "PRIVATE" && bath !== "SHARED")
    throw new Error("Jenis kamar mandi tidak valid.");
  return {
    id: str(r.id),
    property_id: str(r.property_id),
    name: str(r.name),
    floor_label: optional(r.floor_label),
    room_size_m2: r.room_size_m2 == null ? 0 : num(r.room_size_m2),
    bathroom_type: bath,
    description: optional(r.description),
    available: num(r.available),
    facilities: strings(r.facilities),
    plans: array(r.plans, parsePlan),
  };
}
export function parseProperty(x: unknown): Property {
  const p = record(x);
  const gender = str(p.gender_type);
  if (!["MALE", "FEMALE", "MIXED"].includes(gender))
    throw new Error("Tipe kos tidak valid.");
  return {
    id: str(p.id),
    name: str(p.name),
    description: optional(p.description) ?? "",
    address: str(p.address),
    city: optional(p.city) ?? "",
    latitude: p.latitude == null ? null : num(p.latitude),
    longitude: p.longitude == null ? null : num(p.longitude),
    gender_type: gender as Gender,
    rules: optional(p.rules) ?? "",
    owner_name: optional(p.owner_name) ?? "Pemilik kos",
    images: strings(p.images),
    facilities: strings(p.facilities),
    rating: num(p.rating),
    review_count: num(p.review_count),
    available: num(p.available),
  };
}
export function parseListing(x: unknown): Listing {
  const p = record(x);
  return {
    ...parseProperty(x),
    starting_price: num(p.starting_price),
    matching_available: num(p.matching_available),
    distance_km: p.distance_km == null ? null : num(p.distance_km),
  };
}
export function parseSearchRow(x: unknown): Listing {
  return parseListing(record(x).data);
}

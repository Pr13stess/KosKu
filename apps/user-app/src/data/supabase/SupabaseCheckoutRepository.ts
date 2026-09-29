import { FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import type { CheckoutRepository } from "../../domain/repositories/CheckoutRepository";
import type { BookingStatus, Checkout } from "../../domain/models";
import { toCheckoutError } from "../../domain/checkoutErrors";
const statuses: BookingStatus[] = [
  "DRAFT", "HELD", "PENDING_PAYMENT", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED",
];
const text = (v: unknown, name: string) => {
  if (typeof v !== "string") throw new Error(`Respons checkout tidak valid: ${name}`);
  return v;
};
const num = (v: unknown, name: string) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Respons checkout tidak valid: ${name}`);
  return n;
};
const orNull = (v: unknown) => (typeof v === "string" ? v : null);
export function parseCheckout(raw: unknown): Checkout {
  const r = (raw ?? {}) as Record<string, unknown>;
  const status = text(r.status, "status") as BookingStatus;
  if (!statuses.includes(status)) throw new Error("Respons checkout tidak valid: status");
  return {
    bookingId: text(r.booking_id, "booking_id"),
    bookingCode: text(r.booking_code, "booking_code"),
    status,
    cancelReason: orNull(r.cancel_reason),
    propertyName: text(r.property_name, "property_name"),
    roomTypeName: text(r.room_type_name, "room_type_name"),
    planName: text(r.plan_name, "plan_name"),
    rent: num(r.rent, "rent"),
    downPayment: num(r.down_payment, "down_payment"),
    securityDeposit: num(r.security_deposit, "security_deposit"),
    payNow: num(r.pay_now, "pay_now"),
    remainingRent: num(r.remaining_rent, "remaining_rent"),
    holdExpiresAt: orNull(r.hold_expires_at),
    serverNow: text(r.server_now, "server_now"),
    paymentStatus: orNull(r.payment_status),
    redirectUrl: orNull(r.redirect_url),
  };
}
async function failure(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    throw toCheckoutError(body?.error ?? "");
  }
  throw toCheckoutError(error);
}
export class SupabaseCheckoutRepository implements CheckoutRepository {
  constructor(private readonly client: SupabaseClient) {}
  async start(planId: string) {
    const { data, error } = await this.client.functions.invoke("create-payment", {
      body: { plan_id: planId },
    });
    if (error) return failure(error);
    return { bookingId: text(data?.booking_id, "booking_id") };
  }
  async get(bookingId: string) {
    const { data, error } = await this.client.rpc("get_checkout", { p_booking_id: bookingId });
    if (error) return failure(error.message);
    return parseCheckout(data);
  }
  async cancel(bookingId: string) {
    const { error } = await this.client.functions.invoke("cancel-payment", {
      body: { booking_id: bookingId },
    });
    if (error) return failure(error);
  }
}

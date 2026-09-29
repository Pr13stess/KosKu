import type { CheckoutRepository } from "../../domain/repositories/CheckoutRepository";
import type { Checkout } from "../../domain/models";
import { CheckoutError } from "../../domain/checkoutErrors";
import { summarizeCost } from "../../domain/pricing";
import { mockProperties, mockRooms } from "./fixtures";
const HOLD_MS = 15 * 60 * 1000;
/** In-memory stand-in with the same rules as the SQL functions. */
export class MockCheckoutRepository implements CheckoutRepository {
  private readonly bookings = new Map<string, Checkout & { roomId: string }>();
  constructor(private readonly now: () => number = Date.now) {}
  private settle(b: Checkout & { roomId: string }) {
    if (
      (b.status === "HELD" || b.status === "PENDING_PAYMENT") &&
      b.holdExpiresAt &&
      Date.parse(b.holdExpiresAt) <= this.now()
    ) {
      b.status = "CANCELLED";
      b.cancelReason = "HOLD_EXPIRED";
      b.holdExpiresAt = null;
      b.paymentStatus = "EXPIRED";
    }
  }
  private find(id: string) {
    const b = this.bookings.get(id);
    if (!b) throw new CheckoutError("BOOKING_NOT_FOUND");
    this.settle(b);
    return b;
  }
  async start(planId: string) {
    const room = mockRooms.find((r) => r.plans.some((p) => p.id === planId));
    const plan = room?.plans.find((p) => p.id === planId);
    if (!room || !plan) throw new CheckoutError("PLAN_UNAVAILABLE");
    const cost = summarizeCost(plan);
    if (cost.payNow <= 0) throw new CheckoutError("NO_UPFRONT_PAYMENT");
    for (const b of this.bookings.values()) {
      this.settle(b);
      if (b.roomId === room.id && ["HELD", "PENDING_PAYMENT"].includes(b.status)) {
        if (b.planName === plan.name) return { bookingId: b.bookingId };
        throw new CheckoutError("ACTIVE_CHECKOUT_EXISTS");
      }
    }
    const taken = [...this.bookings.values()].filter(
      (b) => b.roomId === room.id && ["HELD", "PENDING_PAYMENT", "CONFIRMED"].includes(b.status),
    ).length;
    if (room.available - taken < 1) throw new CheckoutError("SOLD_OUT");
    const bookingId = `mock-booking-${this.bookings.size + 1}`;
    this.bookings.set(bookingId, {
      roomId: room.id,
      bookingId,
      bookingCode: `KSK-MOCK${this.bookings.size + 1}`,
      status: "PENDING_PAYMENT",
      cancelReason: null,
      propertyName: mockProperties.find((p) => p.id === room.property_id)?.name ?? "",
      roomTypeName: room.name,
      planName: plan.name,
      rent: cost.rent,
      downPayment: cost.downPayment,
      securityDeposit: cost.deposit,
      payNow: cost.payNow,
      remainingRent: cost.remainingRent,
      holdExpiresAt: new Date(this.now() + HOLD_MS).toISOString(),
      serverNow: "",
      paymentStatus: "PENDING",
      redirectUrl: null,
    });
    return { bookingId };
  }
  async get(bookingId: string) {
    const b = this.find(bookingId);
    return { ...b, serverNow: new Date(this.now()).toISOString() };
  }
  async cancel(bookingId: string) {
    const b = this.find(bookingId);
    if (b.status === "CANCELLED") return;
    if (b.status === "CONFIRMED") throw new CheckoutError("CANNOT_CANCEL_HERE");
    b.status = "CANCELLED";
    b.cancelReason = "USER_CANCELLED";
    b.holdExpiresAt = null;
    b.paymentStatus = "CANCELLED";
  }
  async simulatePayment(bookingId: string) {
    const b = this.find(bookingId);
    if (b.status !== "PENDING_PAYMENT") throw new CheckoutError("BOOKING_NOT_PAYABLE");
    b.status = "CONFIRMED";
    b.holdExpiresAt = null;
    b.paymentStatus = "SUCCESS";
  }
}

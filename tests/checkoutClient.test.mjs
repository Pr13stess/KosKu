import { test } from "node:test";
import assert from "node:assert/strict";
import { MockCheckoutRepository } from "../apps/user-app/src/data/mock/MockCheckoutRepository.ts";
import { isAllowedPaymentUrl } from "../apps/user-app/src/domain/paymentUrl.ts";
import { parseCheckout } from "../apps/user-app/src/data/supabase/SupabaseCheckoutRepository.ts";

test("Mock checkout: hold, sold out, simulate, cancel, expiry", async () => {
  let clock = 1_000_000;
  const repo = new MockCheckoutRepository(() => clock);
  const room = (await import("../apps/user-app/src/data/mock/fixtures.ts")).mockRooms.find(
    (r) => r.plans.some((p) => p.down_payment + p.security_deposit > 0),
  );
  const plan = room.plans.find((p) => p.down_payment + p.security_deposit > 0);
  const { bookingId } = await repo.start(plan.id);
  const c1 = await repo.get(bookingId);
  assert.equal(c1.status, "PENDING_PAYMENT");
  assert.equal(c1.payNow, plan.down_payment + plan.security_deposit);
  assert.equal((await repo.start(plan.id)).bookingId, bookingId);
  await assert.rejects(repo.cancel("nope"), { code: "BOOKING_NOT_FOUND" });
  await repo.simulatePayment(bookingId);
  assert.equal((await repo.get(bookingId)).status, "CONFIRMED");
  await assert.rejects(repo.cancel(bookingId), { code: "CANNOT_CANCEL_HERE" });
  const other = await repo.start(plan.id);
  clock += 16 * 60 * 1000;
  const expired = await repo.get(other.bookingId);
  assert.equal(expired.status, "CANCELLED");
  assert.equal(expired.cancelReason, "HOLD_EXPIRED");
});

test("Payment WebView only allows Xendit domains", () => {
  assert.equal(isAllowedPaymentUrl("https://checkout.xendit.co/web/x"), true);
  assert.equal(isAllowedPaymentUrl("https://checkout-staging.xendit.co/web/x"), true);
  assert.equal(isAllowedPaymentUrl("about:blank"), true);
  assert.equal(isAllowedPaymentUrl("https://evil-xendit.co/x"), false);
  assert.equal(isAllowedPaymentUrl("http://checkout.xendit.co/x"), false);
  assert.equal(isAllowedPaymentUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedPaymentUrl("not a url"), false);
});

test("parseCheckout validates the RPC shape defensively", () => {
  const good = {
    booking_id: "b1", booking_code: "KSK-1", status: "HELD", cancel_reason: null,
    property_name: "P", room_type_name: "R", plan_name: "Bulanan",
    rent: "1500000", down_payment: 500000, security_deposit: 500000,
    pay_now: 1000000, remaining_rent: 1000000, hold_expires_at: "2026-01-01T00:00:00Z",
    server_now: "2026-01-01T00:00:00Z", payment_status: null, redirect_url: null,
  };
  const parsed = parseCheckout(good);
  assert.equal(parsed.rent, 1500000);
  assert.equal(parsed.status, "HELD");
  assert.throws(() => parseCheckout({ ...good, status: "BOGUS" }), /status/);
  assert.throws(() => parseCheckout({ ...good, rent: "abc" }), /rent/);
  assert.throws(() => parseCheckout(null), /status/);
});

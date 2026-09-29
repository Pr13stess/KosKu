export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}
/** Business errors raised by SQL functions carry a stable code in the message. */
const known: Record<string, number> = {
  SOLD_OUT: 409, ACTIVE_CHECKOUT_EXISTS: 409, BOOKING_RESTRICTED: 403,
  PLAN_UNAVAILABLE: 404, NO_UPFRONT_PAYMENT: 422, INVALID_PRICING: 422,
  OWN_PROPERTY: 403, BOOKING_NOT_FOUND: 404, CANNOT_CANCEL_HERE: 409,
  HOLD_EXPIRED: 410, BOOKING_NOT_PAYABLE: 409,
};
export function businessError(message: string): Response | null {
  const code = Object.keys(known).find((c) => message.includes(c));
  return code ? json({ error: code }, known[code]) : null;
}

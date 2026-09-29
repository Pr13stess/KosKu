// Pure helpers shared by the Edge Functions and the Node tests.
export function basicAuth(secretKey: string): string {
  return "Basic " + btoa(secretKey + ":");
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
/**
 * Xendit authenticates a webhook with a single shared token in the
 * `x-callback-token` header (set once in the dashboard), not a
 * per-request signature computed from the body like Midtrans.
 */
export function verifyCallbackToken(
  headerValue: string | null,
  expected: string,
): boolean {
  if (!headerValue || !expected) return false;
  return safeEqual(headerValue, expected);
}

/** Only Xendit's checkout pages may load inside the payment WebView. */
export function isAllowedPaymentUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol === "about:") return raw === "about:blank";
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "xendit.co" || host.endsWith(".xendit.co");
  } catch {
    return false;
  }
}

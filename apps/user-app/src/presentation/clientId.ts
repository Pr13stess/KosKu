/**
 * UUID v4 tanpa dependency native: cukup untuk client_message_id, yang
 * hanya perlu unik per pengirim (constraint unique(sender_id,
 * client_message_id)), bukan untuk keperluan kriptografis.
 */
export function clientMessageId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Build https://wa.me/&lt;digits&gt; for a stored phone string. */
export function whatsappChatUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}`;
}

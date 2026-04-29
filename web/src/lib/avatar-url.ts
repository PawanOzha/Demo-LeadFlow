/** Map legacy public `/uploads/…` URLs to protected `/api/avatar` URLs. */
export function normalizeAvatarSrc(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("/api/avatar")) return u;
  const m = u.match(/^\/uploads\/[^.]+\.(jpg|jpeg|png)$/i);
  if (m) {
    const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
    return `/api/avatar?ext=${ext}`;
  }
  return u;
}

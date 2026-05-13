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

export function isDiceBearAvatarUrl(url: string | null | undefined): boolean {
  const u = url?.trim() ?? "";
  return u.includes("api.dicebear.com/");
}

/**
 * Stable illustrated avatar URL (legacy). Prefer initials in UI via {@link portalUserPhotoSrc}.
 * @see https://www.dicebear.com — style Notionists (CC0 1.0).
 */
export function diceBearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
}

/** Uploaded/custom photo URL only; null when user has no photo (show initials). Ignores DiceBear URLs. */
export function portalUserPhotoSrc(
  stored: string | null | undefined,
): string | null {
  const normalized = normalizeAvatarSrc(stored);
  if (normalized) {
    if (isDiceBearAvatarUrl(normalized)) return null;
    return normalized;
  }
  const raw = stored?.trim();
  if (!raw || isDiceBearAvatarUrl(raw)) return null;
  return raw;
}

/**
 * Resolved image src for `<img>` when the user uploaded a photo.
 * When null, render {@link displayInitials} in a circle instead.
 */
export function resolvePortalAvatarDisplayUrl(
  _userId: string,
  stored: string | null | undefined,
): string | null {
  return portalUserPhotoSrc(stored);
}

/** Two letters for avatar circles: first + last name, or first two of one word; fallback from user id. */
export function displayInitials(
  name: string | null | undefined,
  fallbackUserId: string,
): string {
  const t = name?.trim() ?? "";
  if (t.length > 0) {
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]!.charAt(0);
      const b = parts[parts.length - 1]!.charAt(0);
      return (a + b).toUpperCase();
    }
    const one = parts[0]!;
    if (one.length >= 2) return one.slice(0, 2).toUpperCase();
    return one.charAt(0).toUpperCase();
  }
  const id = fallbackUserId.replace(/[^a-zA-Z0-9]/g, "");
  if (id.length >= 2) return id.slice(0, 2).toUpperCase();
  if (id.length === 1) return id.toUpperCase();
  return "?";
}

const INITIALS_PALETTE = [
  "bg-indigo-600 text-white dark:bg-indigo-500",
  "bg-teal-600 text-white dark:bg-teal-500",
  "bg-violet-600 text-white dark:bg-violet-500",
  "bg-rose-600 text-white dark:bg-rose-500",
  "bg-amber-600 text-white dark:bg-amber-600",
  "bg-cyan-600 text-white dark:bg-cyan-600",
  "bg-emerald-600 text-white dark:bg-emerald-500",
  "bg-sky-600 text-white dark:bg-sky-500",
  "bg-fuchsia-600 text-white dark:bg-fuchsia-500",
  "bg-orange-600 text-white dark:bg-orange-600",
] as const;

/** Deterministic background so the same user always gets the same color. */
export function initialsAvatarPaletteClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  const idx = Math.abs(h) % INITIALS_PALETTE.length;
  return INITIALS_PALETTE[idx]!;
}
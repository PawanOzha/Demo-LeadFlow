/**
 * Tab-scoped plaintext hints so managers see a password they just chose for a managed
 * user (create/update). Keyed only by portal user id.
 */
const KEY_PREFIX = "lf_managed_member_pw_sess:v1:";

export function rememberManagedMemberPassword(userId: string, password: string) {
  if (typeof window === "undefined" || !userId || !password) return;
  try {
    sessionStorage.setItem(KEY_PREFIX + userId, password);
  } catch {
    /* quota / private mode */
  }
}

export function readManagedMemberPassword(userId: string): string | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return sessionStorage.getItem(KEY_PREFIX + userId);
  } catch {
    return null;
  }
}

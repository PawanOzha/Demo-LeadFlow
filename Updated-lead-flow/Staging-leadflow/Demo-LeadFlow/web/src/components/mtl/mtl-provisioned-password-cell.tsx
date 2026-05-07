"use client";

/** Passwords are never stored after creation; shown once in the creation flow only. */
export function MtlProvisionedPasswordCell() {
  return (
    <span className="text-xs text-lf-muted">Password shown at creation only</span>
  );
}

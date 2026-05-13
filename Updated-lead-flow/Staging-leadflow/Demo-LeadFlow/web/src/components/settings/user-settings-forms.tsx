"use client";

import { UserMiniAvatar } from "@/components/user-mini-avatar";
import { PasswordInputWithToggle } from "@/components/ui/password-input-with-toggle";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Tab = "profile" | "password" | "notifications";

export type SettingsFormActionResult =
  | { error: string; ok?: undefined }
  | { ok: true; error?: undefined; image?: string | null };

type UserSettingsFormsProps = {
  userId: string;
  defaultName: string;
  avatarUrl?: string | null;
  fetchProfileUrl: string;
  fetchPasswordUrl: string;
  /** Refetch profile from GET /api/me/settings so header + form stay in sync after save */
  onProfileSaved?: () => void | Promise<void>;
};

function UserSettingsFormsInner({
  userId,
  defaultName,
  avatarUrl,
  fetchProfileUrl,
  fetchPasswordUrl,
  onProfileSaved,
}: UserSettingsFormsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  /**
   * After save, mirrors server `image`. `undefined` means use `avatarUrl` prop from parent.
   */
  const [imageOverride, setImageOverride] = useState<string | null | undefined>(
    undefined,
  );

  const effectiveStored =
    imageOverride === undefined ? avatarUrl ?? null : imageOverride;

  const hasUploadedPhoto = Boolean(
    effectiveStored != null && String(effectiveStored).trim() !== "",
  );

  const [profileState, setProfileState] = useState<
    SettingsFormActionResult | undefined
  >(undefined);
  const [passState, setPassState] = useState<
    SettingsFormActionResult | undefined
  >(undefined);
  const [profilePending, setProfilePending] = useState(false);
  const [passPending, setPassPending] = useState(false);

  async function submitProfile(formData: FormData) {
    try {
      const res = await fetch(fetchProfileUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      if (res.status === 401) {
        router.replace("/login");
        return { error: "Unauthorized." };
      }
      const data = (await res.json()) as SettingsFormActionResult;
      return data;
    } catch {
      return {
        error:
          "Could not save (network or server error). Try again or restart the dev server.",
      };
    }
  }

  async function submitPassword(formData: FormData) {
    try {
      const res = await fetch(fetchPasswordUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      if (res.status === 401) {
        router.replace("/login");
        return { error: "Unauthorized." };
      }
      return (await res.json()) as SettingsFormActionResult;
    } catch {
      return {
        error:
          "Could not update password (network or server error). Try again.",
      };
    }
  }

  async function onProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfilePending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitProfile(fd);
      setProfileState(result);
      if ("ok" in result && result.ok) {
        if (result.image !== undefined) {
          setImageOverride(result.image);
        }
        await onProfileSaved?.();
        router.refresh();
      }
    } finally {
      setProfilePending(false);
    }
  }

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPassPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitPassword(fd);
      setPassState(result);
    } finally {
      setPassPending(false);
    }
  }

  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(true);
  const [n4, setN4] = useState(false);

  const navBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 lg:w-full ${
        tab === id
          ? "bg-lf-sidebar-active font-semibold text-lf-cyan shadow-sm shadow-lf-brand/10"
          : "text-lf-muted hover:bg-lf-row-hover hover:text-lf-text"
      }`}
    >
      {label}
    </button>
  );

  const panelClass =
    "rounded-2xl border border-lf-border/80 bg-lf-surface p-6 shadow-sm sm:p-8";

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
      <nav
        className="flex shrink-0 flex-row gap-1 overflow-x-auto pb-1 lg:w-52 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
        aria-label="Settings sections"
      >
        {navBtn("profile", "Profile")}
        {navBtn("password", "Password")}
        {navBtn("notifications", "Notifications")}
      </nav>

      <div className="min-w-0 flex-1">
        {tab === "profile" ? (
          <div className={panelClass}>
            <div className="border-b border-lf-border/60 pb-6">
              <h2 className="text-xl font-semibold tracking-tight text-lf-text">
                Profile
              </h2>
              <p className="mt-1.5 text-sm text-lf-muted">
                Your name and photo appear in the app header and exports.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center sm:items-start">
                <UserMiniAvatar
                  userId={userId}
                  image={effectiveStored}
                  name={defaultName}
                  size={112}
                />
                {hasUploadedPhoto ? (
                  <p className="mt-3 max-w-[12rem] text-center text-xs text-lf-subtle sm:text-left">
                    Custom photo — shown everywhere in LeadFlow.
                  </p>
                ) : (
                  <p className="mt-3 max-w-[12rem] text-center text-xs leading-relaxed text-lf-subtle sm:text-left">
                    Upload a photo below to personalize your profile.
                  </p>
                )}
              </div>

              <form
                onSubmit={onProfileSubmit}
                className="min-w-0 flex-1 space-y-5"
              >
                <label className="block text-sm font-medium text-lf-text-secondary">
                  Display name
                  <input
                    name="name"
                    required
                    defaultValue={defaultName}
                    autoComplete="name"
                    className="mt-2 min-h-11 w-full rounded-xl border border-lf-border bg-lf-bg px-4 py-2 text-sm text-lf-text outline-none transition-shadow focus:border-lf-brand/40 focus:ring-2 focus:ring-lf-brand/20"
                  />
                </label>
                <div>
                  <span className="block text-sm font-medium text-lf-text-secondary">
                    Profile photo
                  </span>
                  <p className="mt-1 text-xs text-lf-subtle">
                    JPEG or PNG. Your company may apply size limits in the
                    browser.
                  </p>
                  <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-lf-border/90 bg-lf-bg/40 px-4 py-8 transition-colors hover:border-lf-brand/35 hover:bg-lf-bg/70">
                    <input
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png"
                      className="sr-only"
                    />
                    <span className="text-sm font-medium text-lf-text-secondary">
                      Drop or click to choose an image
                    </span>
                    <span className="mt-1 text-xs text-lf-muted">
                      JPEG / PNG only
                    </span>
                  </label>
                </div>
                {hasUploadedPhoto ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-lf-border/60 bg-lf-bg/30 px-4 py-3 text-sm text-lf-muted">
                    <input
                      name="removePhoto"
                      type="checkbox"
                      value="true"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-lf-border text-lf-text focus:ring-lf-brand focus:ring-offset-0"
                    />
                    <span>
                      Remove my photo on save (the default avatar will show again
                      until you upload a new image)
                    </span>
                  </label>
                ) : null}
                {profileState?.error ? (
                  <p className="text-sm text-lf-danger">{profileState.error}</p>
                ) : null}
                {profileState?.ok ? (
                  <p className="text-sm text-lf-success">Profile updated.</p>
                ) : null}
                <button
                  type="submit"
                  disabled={profilePending}
                  className="inline-flex min-h-11 items-center rounded-xl bg-lf-accent px-5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/15 transition hover:bg-lf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {profilePending ? "Saving…" : "Save profile"}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {tab === "password" ? (
          <div className={panelClass}>
            <div className="border-b border-lf-border/60 pb-6">
              <h2 className="text-xl font-semibold tracking-tight text-lf-text">
                Password
              </h2>
              <p className="mt-1.5 text-sm text-lf-muted">
                Choose a strong password you don’t use elsewhere.
              </p>
            </div>
            <form
              onSubmit={onPasswordSubmit}
              className="mt-8 max-w-md space-y-5"
            >
              <label className="block text-sm font-medium text-lf-text-secondary">
                Current password
                <PasswordInputWithToggle
                  name="currentPassword"
                  required
                  autoComplete="current-password"
                  wrapperClassName="mt-2"
                  className="min-h-11 w-full rounded-xl border border-lf-border bg-lf-bg px-4 py-2 text-sm text-lf-text outline-none focus:border-lf-brand/40 focus:ring-2 focus:ring-lf-brand/20"
                />
              </label>
              <label className="block text-sm font-medium text-lf-text-secondary">
                New password
                <PasswordInputWithToggle
                  name="newPassword"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  wrapperClassName="mt-2"
                  className="min-h-11 w-full rounded-xl border border-lf-border bg-lf-bg px-4 py-2 text-sm text-lf-text outline-none focus:border-lf-brand/40 focus:ring-2 focus:ring-lf-brand/20"
                />
              </label>
              {passState?.error ? (
                <p className="text-sm text-lf-danger">{passState.error}</p>
              ) : null}
              {passState?.ok ? (
                <p className="text-sm text-lf-success">Password updated.</p>
              ) : null}
              <button
                type="submit"
                disabled={passPending}
                className="inline-flex min-h-11 items-center rounded-xl bg-lf-accent px-5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/15 transition hover:bg-lf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {passPending ? "Updating…" : "Update password"}
              </button>
            </form>
          </div>
        ) : null}

        {tab === "notifications" ? (
          <div className={panelClass}>
            <div className="border-b border-lf-border/60 pb-6">
              <h2 className="text-xl font-semibold tracking-tight text-lf-text">
                Notifications
              </h2>
              <p className="mt-1.5 text-sm text-lf-muted">
                Lead and pipeline alerts (preferences only — delivery may depend
                on your rollout).
              </p>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-lf-subtle">
              Lead alerts
            </p>
            <ul className="mt-4 divide-y divide-lf-divide rounded-xl border border-lf-border/50 bg-lf-bg/20">
              {(
                [
                  [
                    n1,
                    setN1,
                    "Lead assigned to team",
                    "When your qualified lead is assigned to a main team.",
                  ],
                  [
                    n2,
                    setN2,
                    "Lead closed won",
                    "When a lead you qualified is closed won.",
                  ],
                  [
                    n3,
                    setN3,
                    "Lead closed lost",
                    "When a lead you qualified is lost.",
                  ],
                  [
                    n4,
                    setN4,
                    "Pipeline status updates",
                    "Periodic digest of pipeline movement.",
                  ],
                ] as const
              ).map(([on, setOn, title, desc], i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-4 px-4 py-4 first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-lf-text">{title}</p>
                    <p className="mt-1 text-sm text-lf-subtle">{desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => setOn(!on)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      on ? "bg-lf-accent" : "bg-lf-control-off"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-lf-surface shadow transition ${
                        on ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl bg-lf-accent px-5 text-sm font-semibold text-lf-on-accent shadow-md shadow-lf-brand/15 transition hover:bg-lf-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 focus-visible:ring-offset-2"
              >
                Save preferences
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function UserSettingsForms(props: UserSettingsFormsProps) {
  return (
    <UserSettingsFormsInner
      key={`${props.userId}-${props.avatarUrl ?? "none"}-${props.defaultName}`}
      {...props}
    />
  );
}

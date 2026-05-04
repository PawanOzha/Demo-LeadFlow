"use client";

import Image from "next/image";
import { logoutAction } from "@/app/actions/auth";
import { normalizeAvatarSrc } from "@/lib/avatar-url";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "profile" | "password" | "notifications";

export type SettingsFormActionResult =
  | { error: string; ok?: undefined }
  | { ok: true; error?: undefined; image?: string | null };

type UserSettingsFormsProps = {
  defaultName: string;
  teamName?: string | null;
  avatarUrl?: string | null;
  fetchProfileUrl: string;
  fetchPasswordUrl: string;
  /** Refetch profile from GET /api/me/settings so header + form stay in sync after save */
  onProfileSaved?: () => void | Promise<void>;
};

export function UserSettingsForms({
  defaultName,
  teamName,
  avatarUrl,
  fetchProfileUrl,
  fetchPasswordUrl,
  onProfileSaved,
}: UserSettingsFormsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  const [previewAvatar, setPreviewAvatar] = useState<string | null>(() =>
    avatarUrl != null && avatarUrl !== "" ? avatarUrl : null,
  );
  useEffect(() => {
    queueMicrotask(() => {
      setPreviewAvatar(avatarUrl != null && avatarUrl !== "" ? avatarUrl : null);
    });
  }, [avatarUrl]);

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
          setPreviewAvatar(result.image);
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

  return (
    <div className="w-full min-w-0">
      {teamName != null && teamName !== "" ? (
        <p className="mb-8 text-sm text-lf-muted">
          Team{" "}
          <span className="font-medium text-lf-text-secondary">{teamName}</span>
        </p>
      ) : (
        <div className="mb-6" aria-hidden />
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="flex shrink-0 flex-row gap-2 lg:w-48 lg:flex-col lg:gap-1">
          {(
            [
              ["profile", "Profile"],
              ["password", "Password"],
              ["notifications", "Notifications"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`h-9 rounded-[10px] px-3 text-left text-[13.5px] font-medium transition-all duration-150 lg:w-full ${
                tab === id
                  ? "bg-lf-sidebar-active font-semibold text-lf-cyan"
                  : "text-lf-muted hover:bg-lf-row-hover hover:text-lf-text"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {tab === "profile" ? (
            <div className="rounded-[14px] border border-lf-border bg-lf-surface p-6">
              <h2 className="text-lg font-semibold text-lf-text">Profile</h2>
              <p className="mt-1 text-sm text-lf-subtle">
                Display name and profile photo
              </p>
              {previewAvatar ? (
                <div className="mt-4 flex items-center gap-3">
                  <Image
                    src={normalizeAvatarSrc(previewAvatar) ?? previewAvatar}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-full object-cover ring-1 ring-lf-border"
                  />
                  <p className="text-xs text-lf-subtle">
                    Current photo (updates in the header after you save).
                  </p>
                </div>
              ) : null}
              <form onSubmit={onProfileSubmit} className="mt-6 space-y-4">
                <label className="block text-sm text-lf-muted">
                  Display name
                  <input
                    name="name"
                    required
                    defaultValue={defaultName}
                    className="mt-1 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
                  />
                </label>
                <label className="block text-sm text-lf-muted">
                  Profile photo (JPEG or PNG)
                  <input
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="mt-1 w-full text-sm text-lf-muted file:mr-3 file:rounded-lg file:border-0 file:bg-lf-bg file:px-3 file:py-2 file:text-lf-text-secondary"
                  />
                </label>
                {previewAvatar || (avatarUrl != null && avatarUrl !== "") ? (
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-lf-muted">
                    <input
                      name="removePhoto"
                      type="checkbox"
                      value="true"
                    className="h-4 w-4 cursor-pointer rounded border-lf-border text-lf-text focus:ring-lf-brand focus:ring-offset-0"
                    />
                    <span>
                      Remove current profile photo (saved when you click Save
                      profile; ignored if you also choose a new file above)
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
                  className="h-9 rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
                >
                  {profilePending ? "Saving…" : "Save profile"}
                </button>
              </form>
            </div>
          ) : null}

          {tab === "password" ? (
            <div className="rounded-2xl border border-lf-border bg-lf-surface p-6">
              <h2 className="text-lg font-semibold text-lf-text">Password</h2>
              <p className="mt-1 text-sm text-lf-subtle">
                Change your sign-in password
              </p>
              <form
                onSubmit={onPasswordSubmit}
                className="mt-6 space-y-4 max-w-md"
              >
                <label className="block text-sm text-lf-muted">
                  Current password
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="mt-1 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
                  />
                </label>
                <label className="block text-sm text-lf-muted">
                  New password
                  <input
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-lg border border-lf-border bg-lf-bg px-3 py-2 text-lf-text outline-none ring-lf-brand/35 focus:ring-2"
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
                  className="h-9 rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2 disabled:opacity-40"
                >
                  {passPending ? "Updating…" : "Update password"}
                </button>
              </form>
            </div>
          ) : null}

          {tab === "notifications" ? (
            <div className="rounded-2xl border border-lf-border bg-lf-surface p-6">
              <h2 className="text-lg font-semibold text-lf-text">
                Notification preferences
              </h2>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-lf-subtle">
                Lead alerts
              </p>
              <ul className="mt-4 divide-y divide-lf-divide">
                {(
                  [
                    [
                      n1,
                      setN1,
                      "Lead assigned to team",
                      "Get notified when your qualified lead is assigned to a main team.",
                    ],
                    [
                      n2,
                      setN2,
                      "Lead closed won",
                      "Notify when a lead you qualified is successfully closed.",
                    ],
                    [
                      n3,
                      setN3,
                      "Lead closed lost",
                      "Notify when a lead you qualified is lost.",
                    ],
                    [
                      n4,
                      setN4,
                      "Pipeline status updates",
                      "Weekly digest of all your leads pipeline movement.",
                    ],
                  ] as const
                ).map(([on, setOn, title, desc], i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-4 py-4 first:pt-0"
                  >
                    <div>
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
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="h-9 rounded-lg bg-lf-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-lf-accent-hover active:bg-lf-accent-deep focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
                >
                  Save preferences
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-lf-border bg-lf-surface p-6">
        <h2 className="text-lg font-semibold text-lf-text">Session</h2>
        <p className="mt-1 text-sm text-lf-subtle">
          Sign out of LeadFlow on this device.
        </p>
        <form action={logoutAction} className="mt-4">
          <button
            type="submit"
            className="h-9 rounded-lg border border-lf-border bg-lf-surface px-4 text-[13px] font-medium text-lf-text-secondary transition-colors hover:bg-lf-row-hover active:bg-lf-row-hover focus:outline-none focus:ring-2 focus:ring-lf-brand focus:ring-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

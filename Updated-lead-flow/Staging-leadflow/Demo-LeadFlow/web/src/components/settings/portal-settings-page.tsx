"use client";

import { UserSettingsForms } from "@/components/settings/user-settings-forms";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PortalSettingsPayload } from "@/lib/settings-types";

/**
 * Settings for any portal role:
 * - initial data is fetched server-side by the route
 * - client only handles interactive edits and post-save refresh
 */
const defaultSettingsContainerClass =
  "mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8";

export default function PortalSettingsPage({
  initialData,
  eyebrow,
  contentClassName,
}: {
  initialData: PortalSettingsPayload;
  /** Optional role or area label above the title (e.g. sales executive). */
  eyebrow?: string | null;
  /** Override outer container (e.g. full-width when shell already pads horizontally). */
  contentClassName?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PortalSettingsPayload>(initialData);

  async function reloadProfile() {
    const res = await fetch("/api/me/settings", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (!res.ok) return;
    const d = (await res.json()) as PortalSettingsPayload;
    setData(d);
  }

  return (
    <div className={contentClassName ?? defaultSettingsContainerClass}>
      <header className="mb-10 border-b border-lf-border/50 pb-8">
        {eyebrow?.trim() ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-lf-subtle">
            {eyebrow.trim()}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-lf-text">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-lf-muted">
          Manage your profile, password, and preferences. Sign out anytime from
          the bottom of the sidebar.
        </p>
        {data.teamName?.trim() ? (
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-subtle">
            Organization ·{" "}
            <span className="text-lf-text-secondary">{data.teamName.trim()}</span>
          </p>
        ) : null}
      </header>

      <UserSettingsForms
        key={`${data.id}-${data.image ?? "none"}-${data.updatedAt}`}
        userId={data.id}
        defaultName={data.name}
        avatarUrl={data.image}
        fetchProfileUrl="/api/me/settings"
        fetchPasswordUrl="/api/me/password"
        onProfileSaved={reloadProfile}
      />
    </div>
  );
}

"use client";

import { UserSettingsForms } from "@/components/settings/user-settings-forms";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type PortalSettingsPayload = {
  name: string;
  image: string | null;
  teamName: string | null;
  updatedAt: string;
};

/**
 * Settings for any portal role: loads profile via GET /api/me/settings (name, image, team)
 * and saves via fetch POST — same pattern as superadmin, avoids Server Actions + Turbopack issues.
 */
export default function PortalSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalSettingsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/settings", { credentials: "same-origin" })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        return res.json() as Promise<PortalSettingsPayload>;
      })
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load settings.");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

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

  if (loadError) {
    return (
      <p className="text-sm text-lf-danger" role="alert">
        {loadError}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 h-10 w-56 animate-pulse rounded-lg bg-lf-elevated" />
        <div className="h-72 animate-pulse rounded-2xl border border-lf-border bg-lf-surface/40" />
      </div>
    );
  }

  return (
    <UserSettingsForms
      key={`${data.name}-${data.image ?? "none"}-${data.updatedAt}`}
      defaultName={data.name}
      teamName={data.teamName}
      avatarUrl={data.image}
      fetchProfileUrl="/api/me/settings"
      fetchPasswordUrl="/api/me/password"
      onProfileSaved={reloadProfile}
    />
  );
}

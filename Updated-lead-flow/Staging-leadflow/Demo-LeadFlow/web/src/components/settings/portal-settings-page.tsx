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
export default function PortalSettingsPage({
  initialData,
}: {
  initialData: PortalSettingsPayload;
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

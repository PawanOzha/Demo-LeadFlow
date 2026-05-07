import { redirect } from "next/navigation";
import PortalSettingsPage from "@/components/settings/portal-settings-page";
import { getSession } from "@/lib/auth/session";
import {
  canUsePortalSettings,
  getPortalSettingsPayload,
} from "@/lib/server/user-settings";

export default async function AnalystTeamLeadSettingsPage() {
  const session = await getSession();
  if (!session || !canUsePortalSettings(session.role)) {
    redirect("/login");
  }
  const initialData = await getPortalSettingsPayload(session.id);
  if (!initialData) {
    redirect("/login");
  }
  return <PortalSettingsPage initialData={initialData} />;
}

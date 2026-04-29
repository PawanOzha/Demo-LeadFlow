import SuperadminDashboardPage, {
  metadata,
} from "@/app/superadmin/dashboard/page";

export { metadata };

export default function SuperadminIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SuperadminDashboardPage searchParams={searchParams} />;
}

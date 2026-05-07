import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings · Superadmin",
};

export default function SuperadminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import { AppQueryProvider } from "@/components/query-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "LeadFlow",
  description: "Lead management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-lf-bg font-sans antialiased text-lf-text"
      >
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}

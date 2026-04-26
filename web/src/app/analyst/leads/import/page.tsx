import Link from "next/link";
import { AnalystExcelImportClient } from "@/components/analyst/analyst-excel-import-client";

export default function AnalystLeadsImportPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-lf-text md:text-3xl">
            Import leads from Excel
          </h1>
          <p className="mt-1 text-sm text-lf-muted">
            Lead Analyst · bulk upload ·{" "}
            <Link
              href="/analyst/leads"
              className="text-lf-link hover:underline"
            >
              All leads
            </Link>
          </p>
        </div>
      </header>

      <AnalystExcelImportClient />
    </div>
  );
}

import Link from "next/link";
import { AnalystExcelImportClient } from "@/components/analyst/analyst-excel-import-client";

export default function AnalystLeadsImportPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-normal text-lf-label">
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

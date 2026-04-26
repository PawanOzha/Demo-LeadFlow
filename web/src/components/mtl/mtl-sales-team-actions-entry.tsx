"use client";

import dynamic from "next/dynamic";

/** Loads the actions UI only on the client so the modal + portal always hydrate correctly. */
export const MtlSalesTeamActionsEntry = dynamic(
  () =>
    import("./mtl-sales-team-actions").then((m) => ({
      default: m.MtlSalesTeamActions,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-end" aria-hidden>
        <div className="h-10 w-44 rounded-lg bg-lf-bg/60" />
      </div>
    ),
  },
);

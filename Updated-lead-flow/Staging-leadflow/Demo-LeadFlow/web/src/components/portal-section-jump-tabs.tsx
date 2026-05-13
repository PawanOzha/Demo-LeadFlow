import Link from "next/link";

type PortalSectionJumpTab = {
  id: string;
  label: string;
  href?: string;
};

export function PortalSectionJumpTabs({
  tabs,
  activeId,
  className = "",
}: {
  tabs: PortalSectionJumpTab[];
  activeId?: string;
  className?: string;
}) {
  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Section navigation"
      className={`sticky top-2 z-20 inline-block w-fit max-w-full overflow-x-auto rounded-xl border border-lf-border bg-lf-surface/95 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-lf-surface/80 ${className}`}
    >
      <ul className="flex min-w-max items-center gap-1">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href ?? `#${tab.id}`}
              className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-brand/35 ${
                activeId === tab.id
                  ? "bg-lf-bg text-lf-text"
                  : "text-lf-muted hover:bg-lf-bg hover:text-lf-text"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

"use client";

interface Scraper {
  collector_id: string;
  name: string;
  status: string;
  source_type: string;
  failure_count: number;
  last_run: string | null;
}

export default function ScraperStatus({ scrapers }: { scrapers: Scraper[] }) {
  const statusColor: Record<string, string> = {
    active: "bg-[var(--green)]",
    creating: "bg-[var(--purple)]",
    healing: "bg-[var(--orange)]",
    failed: "bg-[var(--red)]",
    regenerating: "bg-[var(--cyan)]",
  };

  const activeCount = scrapers.filter((s) => s.status === "active").length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {scrapers.map((s) => (
          <div
            key={s.collector_id}
            title={`${s.name} (${s.status})`}
            className={`w-2.5 h-2.5 rounded-full ${statusColor[s.status] || "bg-[var(--dim)]"} ${
              s.status === "healing" || s.status === "regenerating" ? "animate-pulse" : ""
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-[var(--dim)]">
        {activeCount}/{scrapers.length} scrapers active
      </span>
    </div>
  );
}

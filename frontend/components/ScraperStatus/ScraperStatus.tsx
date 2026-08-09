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
  const activeCount = scrapers.filter((s) => s.status === "active").length;
  const total = scrapers.length;

  const statusColor: Record<string, string> = {
    active: "var(--green)",
    creating: "var(--accent)",
    healing: "var(--orange)",
    failed: "var(--red)",
    regenerating: "var(--cyan)",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {scrapers.map((s) => (
          <div
            key={s.collector_id}
            title={`${s.name} (${s.status})`}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColor[s.status] || "var(--dim)",
              opacity: s.status === "active" ? 1 : 0.5,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: "var(--dim)" }}>
        {total > 0 ? `${activeCount}/${total} scrapers` : "No scrapers"}
      </span>
    </div>
  );
}

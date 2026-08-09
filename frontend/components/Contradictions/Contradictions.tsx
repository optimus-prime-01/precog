"use client";

interface ContradictionData {
  id: string;
  entity: string;
  fact_a: string;
  source_a: string;
  fact_b: string;
  source_b: string;
  analysis: string;
  severity: string;
  created_at: string;
}

export default function Contradictions({ contradictions }: { contradictions: ContradictionData[] }) {
  if (contradictions.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--dim)", fontSize: 12 }}>
        No contradictions detected.
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      {contradictions.map((c) => (
        <div
          key={c.id}
          style={{
            padding: 12,
            margin: "6px 0",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--red)",
            borderRadius: "0 6px 6px 0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan)" }}>{c.entity}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 3,
                textTransform: "uppercase",
                background: c.severity === "high" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                color: c.severity === "high" ? "var(--red)" : "var(--orange)",
              }}
            >
              {c.severity}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ padding: 8, background: "var(--surface2)", borderRadius: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--green)", marginBottom: 2 }}>SOURCE A</div>
              <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.4 }}>{c.fact_a}</div>
            </div>
            <div style={{ padding: 8, background: "var(--surface2)", borderRadius: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--orange)", marginBottom: 2 }}>SOURCE B</div>
              <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.4 }}>{c.fact_b}</div>
            </div>
          </div>

          {c.analysis && (
            <p style={{ fontSize: 10, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>{c.analysis}</p>
          )}
        </div>
      ))}
    </div>
  );
}

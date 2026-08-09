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
      <div className="p-4 text-center text-[var(--dim)] text-xs">
        No contradictions detected. All sources agree.
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {contradictions.map((contra) => (
        <div
          key={contra.id}
          className="bg-[var(--surface)] border-l-[3px] border-l-[var(--red)] border border-[var(--border)] rounded-r-xl p-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--red)]">
              ⚡ Contradiction
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                contra.severity === "high"
                  ? "bg-[var(--red)]/15 text-[var(--red)]"
                  : "bg-[var(--orange)]/15 text-[var(--orange)]"
              }`}
            >
              {contra.severity}
            </span>
          </div>

          {/* Entity */}
          <p className="text-xs font-semibold text-[var(--cyan)] mb-2">{contra.entity}</p>

          {/* Facts */}
          <div className="space-y-1.5">
            <div className="bg-[var(--surface2)] rounded-lg p-2">
              <p className="text-[10px] text-[var(--green)] font-semibold mb-0.5">Source A</p>
              <p className="text-xs text-[var(--dim)]">{contra.fact_a}</p>
            </div>
            <div className="text-center text-[var(--red)] text-xs font-bold">VS</div>
            <div className="bg-[var(--surface2)] rounded-lg p-2">
              <p className="text-[10px] text-[var(--orange)] font-semibold mb-0.5">Source B</p>
              <p className="text-xs text-[var(--dim)]">{contra.fact_b}</p>
            </div>
          </div>

          {/* Analysis */}
          {contra.analysis && (
            <p className="text-[10px] text-[var(--dim)] mt-2 leading-relaxed">{contra.analysis}</p>
          )}
        </div>
      ))}
    </div>
  );
}

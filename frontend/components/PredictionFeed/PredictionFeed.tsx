"use client";

import { useState } from "react";

interface Prediction {
  id: string;
  text: string;
  confidence: number;
  type: string;
  reasoning: string;
  timeframe: string;
  watch_for: string[];
  signals: string[];
  chain: string[];
  created_at: string;
  resolved: boolean;
}

export default function PredictionFeed({ predictions }: { predictions: Prediction[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (predictions.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--dim)] text-xs">
        No predictions yet. Waiting for enough signals to converge...
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {predictions.map((pred) => (
        <div
          key={pred.id}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 cursor-pointer hover:border-[var(--green)]/30 transition-colors"
          onClick={() => setExpanded(expanded === pred.id ? null : pred.id)}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--green)]">
              {pred.type === "convergent" ? "📡 Convergent" : "🔗 Causal Chain"}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                pred.confidence >= 0.7
                  ? "bg-[var(--green)]/15 text-[var(--green)]"
                  : "bg-[var(--orange)]/15 text-[var(--orange)]"
              }`}
            >
              {(pred.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Prediction text */}
          <p className="text-sm font-medium leading-snug">{pred.text}</p>

          {/* Timeframe */}
          {pred.timeframe && (
            <p className="text-[10px] text-[var(--dim)] mt-1">⏳ {pred.timeframe}</p>
          )}

          {/* Expanded details */}
          {expanded === pred.id && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
              {/* Reasoning */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--purple2)] mb-1">
                  Reasoning
                </p>
                <p className="text-xs text-[var(--dim)] leading-relaxed">{pred.reasoning}</p>
              </div>

              {/* Watch for */}
              {pred.watch_for && pred.watch_for.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orange)] mb-1">
                    Watch For
                  </p>
                  <ul className="space-y-1">
                    {pred.watch_for.map((w, i) => (
                      <li key={i} className="text-xs text-[var(--dim)]">
                        👁 {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Signals count */}
              <p className="text-[10px] text-[var(--dim)]">
                Based on {pred.signals?.length || 0} signals | {pred.chain?.length || 0} chain events
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

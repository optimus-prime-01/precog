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
      <div style={{ padding: 24, textAlign: "center", color: "var(--dim)", fontSize: 12 }}>
        <p style={{ marginBottom: 4 }}>No predictions yet.</p>
        <p style={{ fontSize: 11 }}>Waiting for enough convergent signals from multiple sources.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      {predictions.map((pred) => (
        <div
          key={pred.id}
          onClick={() => setExpanded(expanded === pred.id ? null : pred.id)}
          style={{
            padding: 12,
            margin: "6px 0",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3f3f46")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {pred.type === "convergent" ? "Convergent" : "Causal Chain"}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 3,
                background: pred.confidence >= 0.7 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                color: pred.confidence >= 0.7 ? "var(--green)" : "var(--orange)",
              }}
            >
              {(pred.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, margin: 0 }}>{pred.text}</p>
          {pred.timeframe && (
            <p style={{ fontSize: 10, color: "var(--dim)", marginTop: 4 }}>{pred.timeframe}</p>
          )}
          {expanded === pred.id && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--dim)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Reasoning
              </p>
              <p style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.5, margin: 0 }}>{pred.reasoning}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface EntityData {
  entity: { name: string; type: string; summary: string; created_at: string; updated_at: string };
  events: { title: string; source: string; event_time: string; confidence: number }[];
  connections: { name: string; type: string; shared_events: number }[];
  sources: { source: string; type: string; count: number }[];
  contradictions: { fact_a: string; fact_b: string; analysis: string; severity: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  company: "#06b6d4", person: "#a78bfa", technology: "#22c55e",
  product: "#f59e0b", location: "#ec4899", unknown: "#52525b",
};

const SOURCE_COLORS: Record<string, string> = {
  BrightData: "#8b5cf6", HackerNews: "#f59e0b", Wikipedia: "#06b6d4",
  GitHub: "#22c55e", BraveSearch: "#ec4899",
};

export default function EntityDetail({ entityId, onClose }: { entityId: string | null; onClose: () => void }) {
  const [data, setData] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"events" | "connections" | "sources">("events");

  useEffect(() => {
    if (!entityId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/entity/${entityId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [entityId]);

  if (!entityId) return null;

  const color = TYPE_COLORS[data?.entity?.type || "unknown"] || "#52525b";

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 400,
      background: "#111113", borderLeft: "1px solid #27272a", zIndex: 50,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fafafa" }}>
              {data?.entity?.name || "Loading..."}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                background: `${color}20`, color, textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {data?.entity?.type || "..."}
              </span>
              {data?.events && (
                <span style={{ fontSize: 10, color: "#52525b" }}>{data.events.length} events</span>
              )}
              {data?.connections && (
                <span style={{ fontSize: 10, color: "#52525b" }}>{data.connections.length} connections</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 18, padding: 0,
          }}>&times;</button>
        </div>

        {data?.entity?.summary && (
          <p style={{ fontSize: 11, color: "#71717a", marginTop: 8, lineHeight: 1.5 }}>
            {data.entity.summary.slice(0, 200)}
          </p>
        )}
      </div>

      {/* Source badges */}
      {data?.sources && data.sources.length > 0 && (
        <div style={{ padding: "8px 18px", borderBottom: "1px solid #1c1c20", display: "flex", gap: 4, flexWrap: "wrap" }}>
          {data.sources.map((s, i) => {
            const srcColor = Object.entries(SOURCE_COLORS).find(([k]) => s.source.includes(k))?.[1] || "#52525b";
            return (
              <span key={i} style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 3,
                background: `${srcColor}15`, color: srcColor, border: `1px solid ${srcColor}30`,
              }}>
                {s.source} ({s.count})
              </span>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
        {(["events", "connections", "sources"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
            background: tab === t ? "#18181b" : "transparent",
            color: tab === t ? "#fafafa" : "#52525b",
            borderBottom: tab === t ? "2px solid #8b5cf6" : "2px solid transparent",
            textTransform: "capitalize",
          }}>
            {t} ({t === "events" ? data?.events?.length || 0 : t === "connections" ? data?.connections?.length || 0 : data?.sources?.length || 0})
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {loading && <div style={{ padding: 20, textAlign: "center", color: "#52525b", fontSize: 12 }}>Loading...</div>}

        {!loading && tab === "events" && data?.events?.map((evt, i) => (
          <div key={i} style={{ padding: "8px 18px", borderBottom: "1px solid #1c1c20" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d8" }}>{evt.title}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#52525b" }}>{evt.event_time?.split("T")[0]}</span>
              <span style={{ fontSize: 10, color: "#3f3f46" }}>|</span>
              <span style={{ fontSize: 10, color: "#52525b" }}>{evt.source}</span>
              {evt.confidence && (
                <span style={{ fontSize: 10, color: evt.confidence > 0.7 ? "#22c55e" : "#f59e0b" }}>
                  {(evt.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        ))}

        {!loading && tab === "connections" && data?.connections?.map((conn, i) => (
          <div key={i} style={{
            padding: "8px 18px", borderBottom: "1px solid #1c1c20",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: TYPE_COLORS[conn.type] || "#d4d4d8" }}>
                {conn.name}
              </div>
              <div style={{ fontSize: 10, color: "#52525b" }}>{conn.type}</div>
            </div>
            <span style={{ fontSize: 10, color: "#52525b", background: "#18181b", padding: "2px 8px", borderRadius: 4 }}>
              {conn.shared_events} shared events
            </span>
          </div>
        ))}

        {!loading && tab === "sources" && data?.sources?.map((src, i) => {
          const srcColor = Object.entries(SOURCE_COLORS).find(([k]) => src.source.includes(k))?.[1] || "#52525b";
          return (
            <div key={i} style={{
              padding: "10px 18px", borderBottom: "1px solid #1c1c20",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: srcColor }} />
                <span style={{ fontSize: 12, color: "#d4d4d8" }}>{src.source}</span>
              </div>
              <span style={{ fontSize: 11, color: "#52525b" }}>{src.count} episodes</span>
            </div>
          );
        })}

        {/* Contradictions */}
        {!loading && data?.contradictions && data.contradictions.length > 0 && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid #27272a", marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              Contradictions ({data.contradictions.length})
            </div>
            {data.contradictions.map((c, i) => (
              <div key={i} style={{
                padding: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)",
                borderRadius: 4, marginBottom: 6, fontSize: 11, color: "#71717a", lineHeight: 1.5,
              }}>
                <div style={{ color: "#a1a1aa" }}>{c.fact_a}</div>
                <div style={{ color: "#ef4444", fontSize: 10, margin: "4px 0" }}>vs</div>
                <div style={{ color: "#a1a1aa" }}>{c.fact_b}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

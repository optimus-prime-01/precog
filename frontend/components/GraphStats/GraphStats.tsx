"use client";

interface Props {
  entities: number;
  events: number;
  causalLinks: number;
  predictions: number;
  contradictions: number;
}

export default function GraphStats({ entities, events, causalLinks, predictions, contradictions }: Props) {
  const stats = [
    { label: "Entities", value: entities, color: "#06b6d4" },
    { label: "Events", value: events, color: "#a78bfa" },
    { label: "Causal", value: causalLinks, color: "#8b5cf6" },
    { label: "Predictions", value: predictions, color: "#22c55e" },
    { label: "Conflicts", value: contradictions, color: "#ef4444" },
  ];

  return (
    <div style={{
      position: "absolute", bottom: 12, left: 60, zIndex: 10,
      display: "flex", gap: 2, background: "#18181b", borderRadius: 6,
      border: "1px solid #27272a", overflow: "hidden",
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          padding: "6px 10px", textAlign: "center", minWidth: 55,
          borderRight: "1px solid #27272a",
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 8, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

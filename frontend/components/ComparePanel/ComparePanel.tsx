"use client";

import { useState, useEffect, useMemo } from "react";

interface CompareData {
  entity_a: { name: string; type: string };
  entity_b: { name: string; type: string };
  shared_connections: { name: string; type: string }[];
  shared_events: { title: string; event_time?: string; confidence?: number }[];
  unique_events_a: { title: string; event_time?: string }[];
  unique_events_b: { title: string; event_time?: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  company: "#06b6d4",
  person: "#a78bfa",
  technology: "#22c55e",
  product: "#f59e0b",
  location: "#ec4899",
  unknown: "#52525b",
};

interface Entity {
  id: string;
  name: string;
  type: string;
}

export default function ComparePanel({
  entities,
  onClose,
}: {
  entities: Entity[];
  onClose: () => void;
}) {
  const [entityA, setEntityA] = useState<string>("");
  const [entityB, setEntityB] = useState<string>("");
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sorted = useMemo(
    () => [...entities].sort((a, b) => a.name.localeCompare(b.name)),
    [entities]
  );

  useEffect(() => {
    if (!entityA || !entityB || entityA === entityB) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/compare/${entityA}/${entityB}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setData(null);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch comparison.");
        setLoading(false);
      });
  }, [entityA, entityB]);

  const colorA = TYPE_COLORS[data?.entity_a?.type || "unknown"] || "#52525b";
  const colorB = TYPE_COLORS[data?.entity_b?.type || "unknown"] || "#52525b";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#111113",
          border: "1px solid #27272a",
          borderRadius: 10,
          width: 720,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fafafa" }}>
            Compare Entities
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#52525b",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            &times;
          </button>
        </div>

        {/* Selectors */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid #1c1c20",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <select
            value={entityA}
            onChange={(e) => setEntityA(e.target.value)}
            style={{
              flex: 1,
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#fafafa",
              padding: "6px 10px",
              borderRadius: 4,
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="">Select Entity A</option>
            {sorted.map((ent) => (
              <option key={ent.id} value={ent.id} disabled={ent.id === entityB}>
                {ent.name} ({ent.type})
              </option>
            ))}
          </select>
          <span style={{ color: "#52525b", fontSize: 12, fontWeight: 600 }}>
            vs
          </span>
          <select
            value={entityB}
            onChange={(e) => setEntityB(e.target.value)}
            style={{
              flex: 1,
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#fafafa",
              padding: "6px 10px",
              borderRadius: 4,
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="">Select Entity B</option>
            {sorted.map((ent) => (
              <option key={ent.id} value={ent.id} disabled={ent.id === entityA}>
                {ent.name} ({ent.type})
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 18px" }}>
          {loading && (
            <div
              style={{
                textAlign: "center",
                color: "#52525b",
                fontSize: 12,
                padding: 30,
              }}
            >
              Loading comparison...
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: "center",
                color: "#ef4444",
                fontSize: 12,
                padding: 30,
              }}
            >
              {error}
            </div>
          )}

          {!entityA || !entityB ? (
            <div
              style={{
                textAlign: "center",
                color: "#3f3f46",
                fontSize: 12,
                padding: 30,
              }}
            >
              Select two entities to compare.
            </div>
          ) : null}

          {data && !loading && (
            <div>
              {/* Entity headers side by side */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: `${colorA}08`,
                    border: `1px solid ${colorA}30`,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: colorA,
                    }}
                  >
                    {data.entity_a.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#52525b",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginTop: 2,
                    }}
                  >
                    {data.entity_a.type}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: `${colorB}08`,
                    border: `1px solid ${colorB}30`,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: colorB,
                    }}
                  >
                    {data.entity_b.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#52525b",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginTop: 2,
                    }}
                  >
                    {data.entity_b.type}
                  </div>
                </div>
              </div>

              {/* Shared Connections */}
              <Section
                title="Shared Connections"
                count={data.shared_connections.length}
                color="#8b5cf6"
              >
                {data.shared_connections.length === 0 ? (
                  <Empty text="No shared connections found." />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {data.shared_connections.map((c, i) => {
                      const cc =
                        TYPE_COLORS[c.type || "unknown"] || "#52525b";
                      return (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: `${cc}12`,
                            color: cc,
                            border: `1px solid ${cc}25`,
                          }}
                        >
                          {c.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* Shared Events */}
              <Section
                title="Shared Events"
                count={data.shared_events.length}
                color="#22c55e"
              >
                {data.shared_events.length === 0 ? (
                  <Empty text="No shared events." />
                ) : (
                  data.shared_events.map((evt, i) => (
                    <EventRow key={i} title={evt.title} date={evt.event_time} />
                  ))
                )}
              </Section>

              {/* Unique events side by side */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Section
                    title={`Only ${data.entity_a.name}`}
                    count={data.unique_events_a.length}
                    color={colorA}
                  >
                    {data.unique_events_a.length === 0 ? (
                      <Empty text="None." />
                    ) : (
                      data.unique_events_a.map((evt, i) => (
                        <EventRow
                          key={i}
                          title={evt.title}
                          date={evt.event_time}
                        />
                      ))
                    )}
                  </Section>
                </div>
                <div style={{ flex: 1 }}>
                  <Section
                    title={`Only ${data.entity_b.name}`}
                    count={data.unique_events_b.length}
                    color={colorB}
                  >
                    {data.unique_events_b.length === 0 ? (
                      <Empty text="None." />
                    ) : (
                      data.unique_events_b.map((evt, i) => (
                        <EventRow
                          key={i}
                          title={evt.title}
                          date={evt.event_time}
                        />
                      ))
                    )}
                  </Section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  color,
  children,
}: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 6,
        }}
      >
        {title} ({count})
      </div>
      {children}
    </div>
  );
}

function EventRow({ title, date }: { title: string; date?: string }) {
  return (
    <div
      style={{
        padding: "5px 0",
        borderBottom: "1px solid #1c1c20",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 11, color: "#a1a1aa" }}>
        {title.length > 60 ? title.slice(0, 60) + "..." : title}
      </span>
      {date && (
        <span style={{ fontSize: 10, color: "#3f3f46", flexShrink: 0, marginLeft: 8 }}>
          {date.split("T")[0]}
        </span>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, color: "#3f3f46", padding: "4px 0" }}>
      {text}
    </div>
  );
}

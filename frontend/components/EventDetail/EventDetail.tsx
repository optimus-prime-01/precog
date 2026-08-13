"use client";

import { useState, useEffect } from "react";

interface EventData {
  event: {
    title: string;
    event_time: string;
    confidence: number;
    source: string;
    summary?: string;
  };
  entities: { id: string; name: string; type: string }[];
  causal_parents: {
    id: string;
    title: string;
    event_time?: string;
    confidence?: number;
    reasoning?: string;
  }[];
  causal_children: {
    id: string;
    title: string;
    event_time?: string;
    confidence?: number;
    reasoning?: string;
  }[];
  episodes: {
    source?: string;
    source_type?: string;
    title?: string;
    content?: string;
    url?: string;
    scraped_at?: string;
  }[];
}

const TYPE_COLORS: Record<string, string> = {
  company: "#06b6d4",
  person: "#a78bfa",
  technology: "#22c55e",
  product: "#f59e0b",
  location: "#ec4899",
  unknown: "#52525b",
};

export default function EventDetail({
  eventId,
  onClose,
}: {
  eventId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/event/${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setData(null);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  if (!eventId) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 55,
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
          width: 580,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #27272a",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#8b5cf6",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: 4,
                }}
              >
                Event Detail
              </div>
              <div
                style={{ fontSize: 15, fontWeight: 700, color: "#fafafa", lineHeight: 1.3 }}
              >
                {data?.event?.title || "Loading..."}
              </div>
              {data?.event && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {data.event.event_time && (
                    <span style={{ fontSize: 10, color: "#52525b" }}>
                      {data.event.event_time.split("T")[0]}
                    </span>
                  )}
                  {data.event.source && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: "#8b5cf615",
                        color: "#8b5cf6",
                        border: "1px solid #8b5cf625",
                      }}
                    >
                      {data.event.source}
                    </span>
                  )}
                  {data.event.confidence != null && (
                    <span
                      style={{
                        fontSize: 10,
                        color:
                          data.event.confidence > 0.7 ? "#22c55e" : "#f59e0b",
                      }}
                    >
                      {(data.event.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              )}
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
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "0" }}>
          {loading && (
            <div
              style={{
                textAlign: "center",
                color: "#52525b",
                fontSize: 12,
                padding: 30,
              }}
            >
              Loading...
            </div>
          )}

          {data && !loading && (
            <>
              {/* Involved Entities */}
              <SectionBlock
                title="Involved Entities"
                count={data.entities.length}
                color="#06b6d4"
              >
                {data.entities.length === 0 ? (
                  <EmptyMsg text="No entities linked." />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {data.entities.map((ent, i) => {
                      const c =
                        TYPE_COLORS[ent.type || "unknown"] || "#52525b";
                      return (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: `${c}12`,
                            color: c,
                            border: `1px solid ${c}25`,
                          }}
                        >
                          {ent.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </SectionBlock>

              {/* Causal Parents */}
              <SectionBlock
                title="Causal Parents (what caused this)"
                count={data.causal_parents.length}
                color="#f59e0b"
              >
                {data.causal_parents.length === 0 ? (
                  <EmptyMsg text="No known causes." />
                ) : (
                  data.causal_parents.map((p, i) => (
                    <CausalItem key={i} item={p} direction="parent" />
                  ))
                )}
              </SectionBlock>

              {/* Causal Children */}
              <SectionBlock
                title="Causal Children (what this caused)"
                count={data.causal_children.length}
                color="#22c55e"
              >
                {data.causal_children.length === 0 ? (
                  <EmptyMsg text="No known effects." />
                ) : (
                  data.causal_children.map((c, i) => (
                    <CausalItem key={i} item={c} direction="child" />
                  ))
                )}
              </SectionBlock>

              {/* Source Episodes */}
              <SectionBlock
                title="Source Episodes (raw scraped data)"
                count={data.episodes.length}
                color="#ec4899"
              >
                {data.episodes.length === 0 ? (
                  <EmptyMsg text="No source episodes found." />
                ) : (
                  data.episodes.map((ep, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "8px 0",
                        borderBottom: "1px solid #1c1c20",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        {ep.source && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 3,
                              background: "#ec489915",
                              color: "#ec4899",
                              border: "1px solid #ec489925",
                            }}
                          >
                            {ep.source}
                          </span>
                        )}
                        {ep.scraped_at && (
                          <span style={{ fontSize: 10, color: "#3f3f46" }}>
                            {ep.scraped_at.split("T")[0]}
                          </span>
                        )}
                      </div>
                      {ep.title && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#a1a1aa",
                            fontWeight: 500,
                            marginBottom: 4,
                          }}
                        >
                          {ep.title}
                        </div>
                      )}
                      {ep.content && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#52525b",
                            lineHeight: 1.5,
                            maxHeight: 80,
                            overflow: "hidden",
                          }}
                        >
                          {ep.content.slice(0, 300)}
                          {ep.content.length > 300 ? "..." : ""}
                        </div>
                      )}
                      {ep.url && (
                        <a
                          href={ep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 10,
                            color: "#8b5cf6",
                            marginTop: 4,
                            display: "inline-block",
                            textDecoration: "none",
                          }}
                        >
                          View source
                        </a>
                      )}
                    </div>
                  ))
                )}
              </SectionBlock>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({
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
    <div
      style={{
        padding: "12px 18px",
        borderBottom: "1px solid #27272a",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: 8,
        }}
      >
        {title} ({count})
      </div>
      {children}
    </div>
  );
}

function CausalItem({
  item,
  direction,
}: {
  item: {
    title: string;
    event_time?: string;
    confidence?: number;
    reasoning?: string;
  };
  direction: "parent" | "child";
}) {
  const arrow = direction === "parent" ? "\u2192 this" : "this \u2192";
  return (
    <div
      style={{
        padding: "6px 0",
        borderBottom: "1px solid #1c1c20",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10, color: "#3f3f46" }}>{arrow}</span>
        <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 500 }}>
          {item.title}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
        {item.event_time && (
          <span style={{ fontSize: 10, color: "#3f3f46" }}>
            {item.event_time.split("T")[0]}
          </span>
        )}
        {item.confidence != null && (
          <span
            style={{
              fontSize: 10,
              color: item.confidence > 0.7 ? "#22c55e" : "#f59e0b",
            }}
          >
            {(item.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {item.reasoning && (
        <div
          style={{
            fontSize: 10,
            color: "#52525b",
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {item.reasoning.slice(0, 150)}
        </div>
      )}
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, color: "#3f3f46", padding: "4px 0" }}>
      {text}
    </div>
  );
}

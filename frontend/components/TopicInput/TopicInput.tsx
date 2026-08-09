"use client";

import { useState } from "react";

interface Props {
  onTopicAdded: () => void;
}

export default function TopicInput({ onTopicAdded }: Props) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    items_ingested?: number;
    items_scraped?: number;
    message?: string;
    sources?: Record<string, number>;
    steps?: string[];
    target_urls?: string[];
    graph_stats?: Record<string, number>;
  } | null>(null);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/add-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      setResult(data);
      if (data.status === "ok") {
        onTopicAdded();
        setTimeout(() => {
          setResult(null);
          setOpen(false);
          setTopic("");
        }, 3000);
      }
    } catch {
      setResult({ status: "error", message: "Failed to connect to backend" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "5px 12px",
          background: "transparent",
          border: "1px solid #27272a",
          borderRadius: 4,
          color: "#71717a",
          fontSize: 12,
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        + Add Topic
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          setOpen(false);
          setResult(null);
        }
      }}
    >
      <div
        style={{
          background: "#111113",
          border: "1px solid #27272a",
          borderRadius: 10,
          padding: 28,
          width: 460,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Add New Topic</div>
        <p style={{ fontSize: 12, color: "#71717a", marginBottom: 20 }}>
          Enter any topic. PRECOG will scrape HackerNews and GitHub, extract entities, events, and causal chains, and add them to the graph.
        </p>

        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder='e.g. "Indian startup ecosystem" or "AI regulation Europe"'
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "#09090b",
            border: "1px solid #27272a",
            borderRadius: 6,
            color: "#fafafa",
            fontSize: 14,
            outline: "none",
            marginBottom: 14,
          }}
          autoFocus
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !topic.trim()}
            style={{
              flex: 1,
              padding: "9px 0",
              background: loading ? "#27272a" : "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Scraping & Ingesting..." : "Build Graph"}
          </button>
          {!loading && (
            <button
              onClick={() => {
                setOpen(false);
                setResult(null);
              }}
              style={{
                padding: "9px 18px",
                background: "transparent",
                border: "1px solid #27272a",
                borderRadius: 6,
                color: "#71717a",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {result && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 6,
              fontSize: 12,
              background: result.status === "ok" ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
              border: `1px solid ${result.status === "ok" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
            }}
          >
            {result.status === "ok" ? (
              <div>
                <div style={{ color: "#22c55e", fontWeight: 600, marginBottom: 8 }}>
                  Scraped {result.items_scraped || result.items_ingested} items. Graph updating in background (refresh in 30s)...
                </div>
                {result.sources && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {Object.entries(result.sources).map(([src, count]) => (
                      <span
                        key={src}
                        style={{
                          padding: "2px 8px",
                          background: src.startsWith("BrightData") ? "rgba(139,92,246,0.15)" : "#18181b",
                          border: `1px solid ${src.startsWith("BrightData") ? "rgba(139,92,246,0.3)" : "#27272a"}`,
                          borderRadius: 4,
                          fontSize: 10,
                          color: src.startsWith("BrightData") ? "#a78bfa" : "#71717a",
                        }}
                      >
                        {src}: {count}
                      </span>
                    ))}
                  </div>
                )}
                {result.steps && (
                  <div style={{ fontSize: 10, color: "#52525b", lineHeight: 1.6 }}>
                    {result.steps.map((s, i) => (
                      <div key={i}>{s}</div>
                    ))}
                  </div>
                )}
                {result.graph_stats && (
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    {Object.entries(result.graph_stats).map(([k, v]) => (
                      <span key={k} style={{ fontSize: 10, color: "#71717a" }}>
                        {k}: <span style={{ color: "#a1a1aa", fontWeight: 600 }}>{v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color: "#ef4444" }}>{result.message || "Something went wrong"}</span>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, borderTop: "1px solid #1c1c20", paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: "#52525b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Try these
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              "Indian startup ecosystem",
              "AI regulation Europe",
              "SpaceX Starship",
              "Crypto regulation SEC",
              "Tesla vs Waymo",
              "Climate tech funding",
            ].map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                disabled={loading}
                style={{
                  padding: "3px 10px",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 4,
                  color: "#71717a",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

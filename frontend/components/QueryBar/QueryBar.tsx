"use client";

import { useState } from "react";

function formatResponse(text: string) {
  // Convert markdown-like formatting to clean text
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove bold markers
    .replace(/\*(.*?)\*/g, "$1") // remove italic markers
    .replace(/^#+\s*/gm, "") // remove heading markers
    .replace(/^-\s+/gm, "  \u2022 ") // bullets
    .replace(/^\d+\.\s+/gm, (m) => `  ${m}`) // indent numbered lists
    .trim();
}

export default function QueryBar() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [enriched, setEnriched] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAnswer("");
    setEnriched(null);
    setShowAnswer(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error || "No response.");
      if (data.enriched) {
        setEnriched(data.enriched_message || "Graph auto-enriched with new data");
      }
    } catch {
      setAnswer("Backend unreachable. Make sure the server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderBottom: "1px solid #27272a", flexShrink: 0 }}>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", alignItems: "center", padding: "8px 20px", gap: 10 }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask the graph..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fafafa",
            fontSize: 13,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "5px 16px",
            background: loading ? "#27272a" : "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Searching..." : "Ask"}
        </button>
      </form>

      {answer && showAnswer && (
        <div style={{ padding: "0 20px 12px" }}>
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: 6,
              padding: "14px 16px",
              position: "relative",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            <button
              onClick={() => setShowAnswer(false)}
              style={{
                position: "absolute",
                top: 8,
                right: 10,
                background: "none",
                border: "none",
                color: "#52525b",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              &times;
            </button>
            {enriched && (
              <div style={{
                fontSize: 11, color: "#22c55e", marginBottom: 10, padding: "6px 10px",
                background: "rgba(34,197,94,0.08)", borderRadius: 4, border: "1px solid rgba(34,197,94,0.15)",
              }}>
                Graph enriched: {enriched}. Data added to graph automatically.
              </div>
            )}
            <pre
              style={{
                fontSize: 12,
                color: "#a1a1aa",
                lineHeight: 1.7,
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "-apple-system, sans-serif",
              }}
            >
              {formatResponse(answer)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

function formatResponse(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^-\s+/gm, "  \u2022 ")
    .trim();
}

export default function QueryBar() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [enriched, setEnriched] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [phase, setPhase] = useState<"idle" | "checking" | "scraping" | "ingesting" | "answering">("idle");
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
  useEffect(() => {
    if (loading) {
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  // Phase simulation based on timer
  useEffect(() => {
    if (!loading) { setPhase("idle"); return; }
    if (timer < 3) setPhase("checking");
    else if (timer < 8) setPhase("scraping");
    else if (timer < 15) setPhase("ingesting");
    else setPhase("answering");
  }, [timer, loading]);

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
      setAnswer("Backend unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const phaseInfo: Record<string, { label: string; color: string }> = {
    idle: { label: "", color: "" },
    checking: { label: "Checking graph for relevant data...", color: "#8b5cf6" },
    scraping: { label: "No data found — scraping web for info...", color: "#f59e0b" },
    ingesting: { label: "Ingesting scraped data into graph...", color: "#06b6d4" },
    answering: { label: "Generating answer from enriched graph...", color: "#22c55e" },
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
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#fafafa", fontSize: 13,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "5px 16px", background: loading ? "#27272a" : "#8b5cf6",
            color: "#fff", border: "none", borderRadius: 4, fontSize: 12,
            fontWeight: 600, cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? `${timer}s` : "Ask"}
        </button>
      </form>

      {/* Loading status bar */}
      {loading && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", background: "#111113",
            border: "1px solid #27272a", borderRadius: 6,
          }}>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 4 }}>
              {["checking", "scraping", "ingesting", "answering"].map((p, i) => (
                <div key={p} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: phase === p ? phaseInfo[p].color :
                    ["checking", "scraping", "ingesting", "answering"].indexOf(phase) > i ? "#3f3f46" : "#1c1c20",
                  transition: "all 0.3s",
                  animation: phase === p ? "pulse 1s infinite" : "none",
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: phaseInfo[phase]?.color || "#52525b" }}>
              {phaseInfo[phase]?.label}
            </span>
            <span style={{ fontSize: 10, color: "#3f3f46", marginLeft: "auto" }}>{timer}s</span>
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
        </div>
      )}

      {/* Answer */}
      {answer && showAnswer && !loading && (
        <div style={{ padding: "0 20px 12px" }}>
          <div
            style={{
              background: "#111113", border: "1px solid #27272a", borderRadius: 6,
              padding: "14px 16px", position: "relative", maxHeight: 250, overflow: "auto",
            }}
          >
            <button
              onClick={() => setShowAnswer(false)}
              style={{
                position: "absolute", top: 8, right: 10, background: "none",
                border: "none", color: "#52525b", cursor: "pointer", fontSize: 14,
              }}
            >
              &times;
            </button>

            {enriched && (
              <div style={{
                fontSize: 11, color: "#22c55e", marginBottom: 10, padding: "6px 10px",
                background: "rgba(34,197,94,0.08)", borderRadius: 4,
                border: "1px solid rgba(34,197,94,0.15)",
              }}>
                {enriched}. New data added to graph.
              </div>
            )}

            <pre style={{
              fontSize: 12, color: "#a1a1aa", lineHeight: 1.7, margin: 0,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontFamily: "-apple-system, sans-serif",
            }}>
              {formatResponse(answer)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

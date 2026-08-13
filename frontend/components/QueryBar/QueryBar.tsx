"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [status, setStatus] = useState("");
  const [timer, setTimer] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) {
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  // Countdown for enrichment wait
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // When countdown hits 0, re-query automatically
  useEffect(() => {
    if (countdown === 0 && enriching) {
      setEnriching(false);
      doQuery(query, true);
    }
  }, [countdown, enriching]);

  const doQuery = useCallback(async (q: string, isRetry: boolean = false) => {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer("");
    setShowAnswer(true);
    setStatus(isRetry ? "Re-querying with enriched graph..." : "Querying graph...");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (data.enriched && !isRetry) {
        // Data was enriched — don't show answer yet, wait for graph to update
        setLoading(false);
        setEnriching(true);
        setCountdown(30);
        setStatus("");
        setAnswer("");
        return;
      }

      setAnswer(data.answer || data.error || "No response.");
      setStatus("");
    } catch {
      setAnswer("Backend unreachable.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading || enriching) return;
    doQuery(query);
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
          disabled={loading || enriching}
          style={{
            padding: "5px 16px",
            background: loading || enriching ? "#27272a" : "#8b5cf6",
            color: "#fff", border: "none", borderRadius: 4, fontSize: 12,
            fontWeight: 600, cursor: loading || enriching ? "wait" : "pointer",
          }}
        >
          {loading ? `${timer}s` : enriching ? `${countdown}s` : "Ask"}
        </button>
      </form>

      {/* Loading bar */}
      {loading && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{
            padding: "8px 12px", background: "#111113",
            border: "1px solid #27272a", borderRadius: 6,
            fontSize: 11, color: "#8b5cf6", display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", animation: "pulse 1s infinite" }} />
            {status || "Processing..."}
            <span style={{ marginLeft: "auto", color: "#3f3f46" }}>{timer}s</span>
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
        </div>
      )}

      {/* Enrichment waiting */}
      {enriching && !loading && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{
            padding: "12px 14px", background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.15)", borderRadius: 6,
          }}>
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginBottom: 6 }}>
              No data found — scraping web and enriching graph...
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Progress bar */}
              <div style={{ flex: 1, height: 4, background: "#27272a", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: "#f59e0b", borderRadius: 2,
                  width: `${((30 - countdown) / 30) * 100}%`, transition: "width 1s linear",
                }} />
              </div>
              <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, minWidth: 30 }}>{countdown}s</span>
            </div>
            <div style={{ fontSize: 10, color: "#71717a", marginTop: 6 }}>
              Scraped data is being ingested into the graph. Auto re-querying when ready...
            </div>
          </div>
        </div>
      )}

      {/* Answer */}
      {answer && showAnswer && !loading && !enriching && (
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

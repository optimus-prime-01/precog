"use client";

import { useState, useEffect, useRef } from "react";

interface LogEntry {
  time: string;
  source: string;
  message: string;
  level: string;
}

const SOURCE_COLORS: Record<string, string> = {
  ingestion: "#06b6d4",
  extraction: "#a78bfa",
  prediction: "#22c55e",
  graph: "#f59e0b",
  scraper: "#8b5cf6",
  query: "#ec4899",
};

const LEVEL_COLORS: Record<string, string> = {
  info: "#52525b",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
};

export default function LiveTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fetchLogs = () => {
      fetch("/api/logs")
        .then((r) => r.json())
        .then((d) => setLogs(d.logs || []))
        .catch(() => {});
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 12, right: 12, zIndex: 40,
          padding: "6px 12px", background: "#18181b", border: "1px solid #27272a",
          borderRadius: 6, color: "#52525b", fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ fontFamily: "monospace" }}>&gt;_</span> Terminal
        {logs.length > 0 && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
            animation: "pulse 2s infinite",
          }} />
        )}
        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 220, zIndex: 40,
      background: "#09090b", borderTop: "1px solid #27272a",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 14px", borderBottom: "1px solid #1c1c20", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#52525b" }}>&gt;_</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa" }}>Live Backend Activity</span>
          <span style={{ fontSize: 10, color: "#3f3f46" }}>{logs.length} events</span>
        </div>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14,
        }}>&times;</button>
      </div>

      {/* Logs */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0", fontFamily: "monospace" }}>
        {logs.length === 0 && (
          <div style={{ padding: 14, color: "#3f3f46", fontSize: 11 }}>
            No activity yet. Add a topic or query the graph to see logs.
          </div>
        )}
        {logs.map((log, i) => {
          const srcColor = SOURCE_COLORS[log.source] || "#52525b";
          const lvlColor = LEVEL_COLORS[log.level] || "#52525b";
          const time = log.time?.split("T")[1]?.split(".")[0] || "";
          return (
            <div key={i} style={{
              padding: "2px 14px", fontSize: 11, lineHeight: 1.6,
              display: "flex", gap: 8,
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
            }}>
              <span style={{ color: "#3f3f46", minWidth: 60 }}>{time}</span>
              <span style={{
                color: srcColor, minWidth: 75, fontWeight: 600,
                fontSize: 10, textTransform: "uppercase",
              }}>{log.source}</span>
              <span style={{ color: log.level === "error" ? "#ef4444" : log.level === "success" ? "#22c55e" : "#71717a" }}>
                {log.message}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

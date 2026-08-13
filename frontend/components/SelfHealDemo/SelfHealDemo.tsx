"use client";

import { useState, useEffect } from "react";

export default function SelfHealDemo() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const phases = [
    { label: "Scraper running normally...", color: "#22c55e", icon: "●" },
    { label: "Site layout changed! Scraper returns empty data.", color: "#ef4444", icon: "✗" },
    { label: "Failure detected (attempt 1/3)...", color: "#f59e0b", icon: "!" },
    { label: "Failure detected (attempt 2/3)...", color: "#f59e0b", icon: "!" },
    { label: "Failure threshold reached. Triggering self-heal...", color: "#f59e0b", icon: "↻" },
    { label: "bdata scraper heal — rewriting extraction logic...", color: "#8b5cf6", icon: "⚙" },
    { label: "Scraper healed! Validating output...", color: "#06b6d4", icon: "✓" },
    { label: "Data flowing again. Graph updated.", color: "#22c55e", icon: "●" },
  ];

  useEffect(() => {
    if (!running) return;
    if (phase >= phases.length) {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${phases[phase].label}`]);
      setPhase((p) => p + 1);
    }, phase === 5 ? 3000 : phase === 0 ? 1500 : 2000);
    return () => clearTimeout(timer);
  }, [running, phase]);

  const startDemo = () => {
    setRunning(true);
    setPhase(0);
    setLog([]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "5px 10px", background: "transparent", border: "1px solid #27272a",
          borderRadius: 4, color: "#52525b", fontSize: 11, cursor: "pointer",
        }}
      >
        Self-Heal Demo
      </button>
    );
  }

  const currentPhase = phase < phases.length ? phases[phase] : phases[phases.length - 1];
  const progress = (phase / phases.length) * 100;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !running) { setOpen(false); } }}
    >
      <div style={{
        background: "#111113", border: "1px solid #27272a", borderRadius: 10,
        padding: 24, width: 520,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Self-Healing Scraper Demo</div>
            <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
              Simulates site layout change → scraper failure → auto-heal via Bright Data
            </div>
          </div>
          {!running && (
            <button onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 16,
            }}>&times;</button>
          )}
        </div>

        {/* Scraper status indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "#09090b", border: "1px solid #27272a", borderRadius: 6, marginBottom: 12,
        }}>
          <span style={{ fontSize: 16, color: currentPhase.color }}>{currentPhase.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: currentPhase.color }}>
              {running ? currentPhase.label : phase >= phases.length ? "Demo complete!" : "Ready to simulate"}
            </div>
          </div>
          <span style={{ fontSize: 10, color: "#3f3f46" }}>
            {running ? `${phase}/${phases.length}` : ""}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#27272a", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: phase >= phases.length ? "#22c55e" : currentPhase.color,
            width: `${progress}%`, transition: "width 0.5s ease",
          }} />
        </div>

        {/* 3-layer explanation */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { label: "L1: Native Heal", desc: "Scraper Studio auto-adapts", active: phase >= 5 && phase < 7 },
            { label: "L2: Regen", desc: "Delete + recreate scraper", active: false },
            { label: "L3: Graph-Driven", desc: "Graph detects gap → new scraper", active: false },
          ].map((l, i) => (
            <div key={i} style={{
              flex: 1, padding: "8px 10px", borderRadius: 4, textAlign: "center",
              background: l.active ? "rgba(139,92,246,0.1)" : "#09090b",
              border: `1px solid ${l.active ? "rgba(139,92,246,0.3)" : "#1c1c20"}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: l.active ? "#a78bfa" : "#3f3f46" }}>{l.label}</div>
              <div style={{ fontSize: 9, color: "#3f3f46", marginTop: 2 }}>{l.desc}</div>
            </div>
          ))}
        </div>

        {/* Terminal log */}
        <div style={{
          background: "#09090b", border: "1px solid #1c1c20", borderRadius: 6,
          padding: 12, maxHeight: 180, overflow: "auto", fontFamily: "monospace",
        }}>
          {log.length === 0 && (
            <div style={{ fontSize: 11, color: "#3f3f46" }}>$ waiting for demo start...</div>
          )}
          {log.map((line, i) => {
            const isError = line.includes("✗") || line.includes("Failure") || line.includes("empty");
            const isHeal = line.includes("heal") || line.includes("rewriting");
            const isSuccess = line.includes("healed") || line.includes("flowing");
            return (
              <div key={i} style={{
                fontSize: 11, lineHeight: 1.6,
                color: isError ? "#ef4444" : isHeal ? "#8b5cf6" : isSuccess ? "#22c55e" : "#52525b",
              }}>
                {line}
              </div>
            );
          })}
          {running && <div style={{ fontSize: 11, color: "#3f3f46", animation: "pulse 1s infinite" }}>▌</div>}
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0 } }`}</style>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={startDemo}
            disabled={running}
            style={{
              flex: 1, padding: "9px 0", border: "none", borderRadius: 6,
              fontSize: 13, fontWeight: 600, cursor: running ? "wait" : "pointer",
              background: running ? "#27272a" : "#8b5cf6", color: "#fff",
            }}
          >
            {running ? "Running..." : phase >= phases.length ? "Run Again" : "Start Demo"}
          </button>
          {!running && (
            <button onClick={() => setOpen(false)} style={{
              padding: "9px 16px", background: "transparent", border: "1px solid #27272a",
              borderRadius: 6, color: "#52525b", fontSize: 13, cursor: "pointer",
            }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import ScraperStatus from "@/components/ScraperStatus/ScraperStatus";
import QueryBar from "@/components/QueryBar/QueryBar";
import TopicInput from "@/components/TopicInput/TopicInput";
import SelfHealDemo from "@/components/SelfHealDemo/SelfHealDemo";
import LiveTerminal from "@/components/LiveTerminal/LiveTerminal";

export default function Dashboard() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px", color: "#fafafa" }}>PRECOG</span>
          </a>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
          <div style={{ display: "flex", gap: 8 }}>
            {["0 entities", "0 events", "0 causal links"].map((s, i) => (
              <span key={i} style={{ fontSize: 11, color: "var(--dim)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 4 }}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ padding: "5px 12px", background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Compare</button>
          <button style={{ padding: "5px 12px", background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Export Report</button>
          <SelfHealDemo />
          <TopicInput onTopicAdded={() => {}} />
          <ScraperStatus scrapers={[]} />
        </div>
      </div>

      {/* Query */}
      <QueryBar />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Graph area — empty state */}
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            {[
              { cx: 100, cy: 40, delay: "0s" },
              { cx: 40, cy: 100, delay: "0.3s" },
              { cx: 160, cy: 100, delay: "0.6s" },
              { cx: 60, cy: 160, delay: "0.9s" },
              { cx: 140, cy: 160, delay: "1.2s" },
            ].map((n, i) => (
              <g key={i}>
                <circle cx={n.cx} cy={n.cy} r="12" fill="none" stroke="#27272a" strokeWidth="1.5">
                  <animate attributeName="stroke" values="#27272a;#8b5cf6;#27272a" dur="2s" begin={n.delay} repeatCount="indefinite" />
                  <animate attributeName="r" values="12;14;12" dur="2s" begin={n.delay} repeatCount="indefinite" />
                </circle>
                <circle cx={n.cx} cy={n.cy} r="3" fill="#27272a">
                  <animate attributeName="fill" values="#27272a;#8b5cf6;#27272a" dur="2s" begin={n.delay} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            {[
              { x1: 100, y1: 40, x2: 40, y2: 100 },
              { x1: 100, y1: 40, x2: 160, y2: 100 },
              { x1: 40, y1: 100, x2: 60, y2: 160 },
              { x1: 160, y1: 100, x2: 140, y2: 160 },
              { x1: 60, y1: 160, x2: 140, y2: 160 },
            ].map((e, i) => (
              <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#1c1c20" strokeWidth="1">
                <animate attributeName="stroke" values="#1c1c20;#3f3f46;#1c1c20" dur="2.5s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              </line>
            ))}
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#52525b", marginBottom: 6 }}>
              Add a topic to build the context graph
            </div>
            <div style={{ fontSize: 12, color: "#3f3f46", marginBottom: 20 }}>
              Click "+ Add Topic" above, or <a href="/graph" style={{ color: "#8b5cf6", textDecoration: "none" }}>open existing graph</a>
            </div>
          </div>
        </div>

        {/* Right Panel — empty predictions */}
        <div
          style={{
            width: 360,
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <button style={{
              flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
              background: "var(--surface2)", color: "var(--text)", borderBottom: "2px solid var(--accent)",
            }}>
              Predictions (0)
            </button>
            <button style={{
              flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
              background: "transparent", color: "var(--dim)", borderBottom: "2px solid transparent",
            }}>
              Contradictions (0)
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 24, color: "#3f3f46", fontSize: 12 }}>
              <div style={{ marginBottom: 4 }}>No predictions yet.</div>
              <div style={{ fontSize: 11 }}>Predictions appear after adding a topic and building the graph.</div>
            </div>
          </div>
        </div>
      </div>

      <LiveTerminal />
    </div>
  );
}

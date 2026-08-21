"use client";

import { useState } from "react";

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    { title: "Self-Healing Scrapers", desc: "Bright Data Scraper Studio auto-adapts when sites change. 3 layers of healing — native, regeneration, graph-driven.", color: "#8b5cf6" },
    { title: "Dual Entity-Event Graph", desc: "Entities and events as separate linked subgraphs. Bi-temporal model tracks when things happened and when we learned about them.", color: "#06b6d4" },
    { title: "Causal Chain Detection", desc: "AI automatically identifies cause-effect relationships between events. A caused B, B caused C — traced and explainable.", color: "#22c55e" },
    { title: "Contradiction Detection", desc: "When two sources disagree, PRECOG catches it. Temporal analysis determines which is more current.", color: "#ef4444" },
    { title: "Predictive Intelligence", desc: "Convergent weak signals from multiple sources generate predictions with confidence scores and reasoning.", color: "#f59e0b" },
    { title: "Auto-Enriching Queries", desc: "Ask a question. If the graph lacks data, PRECOG auto-scrapes the web, enriches the graph, and re-answers.", color: "#ec4899" },
  ];

  const techStack = [
    { name: "Bright Data", role: "Scraper Studio + DCA API" },
    { name: "Neo4j", role: "Bi-temporal context graph" },
    { name: "Groq / Claude", role: "Entity extraction + reasoning" },
    { name: "Next.js 15", role: "Dashboard + React Flow" },
    { name: "FastAPI", role: "Backend API" },
    { name: "Graphiti patterns", role: "Episodic memory + temporal edges" },
  ];

  const sources = [
    { name: "Bright Data Scraper Studio", type: "Real web scraping", color: "#8b5cf6" },
    { name: "HackerNews", type: "Tech discussions", color: "#f59e0b" },
    { name: "GitHub", type: "Code activity", color: "#22c55e" },
    { name: "Wikipedia", type: "Background knowledge", color: "#06b6d4" },
  ];

  return (
    <div style={{ background: "#09090b", color: "#fafafa", minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ padding: "80px 0 60px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-2px" }}>PRECOG</span>
        </div>
        <p style={{ fontSize: 20, color: "#a1a1aa", maxWidth: 600, margin: "0 auto 8px", lineHeight: 1.5 }}>
          Predictive Causal Context Graph
        </p>
        <p style={{ fontSize: 14, color: "#52525b", maxWidth: 700, margin: "0 auto 40px", lineHeight: 1.7 }}>
          The first system that scrapes the live web through Bright Data, builds a temporal causal knowledge graph,
          detects contradictions between sources, and predicts what happens next — with explainable causal chains.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <a href="/graph" style={{
            padding: "12px 32px", background: "#8b5cf6", color: "#fff", borderRadius: 8,
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            Open Graph Dashboard
          </a>
          <a href="https://github.com/optimus-prime-01/precog" target="_blank" style={{
            padding: "12px 32px", background: "transparent", border: "1px solid #27272a",
            color: "#a1a1aa", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}>
            GitHub
          </a>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
      </div>

      {/* Architecture diagram */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>
        <h2 style={{ fontSize: 13, color: "#52525b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 20, textAlign: "center" }}>
          How It Works
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { label: "Query Interface", items: ["Natural Language Query", "Auto-Enrich", "Temporal Rewind"], color: "#8b5cf6" },
            { label: "Prediction Engine", items: ["Weak Signal Detection", "Causal Chain Builder", "Convergence Analysis"], color: "#22c55e" },
            { label: "Reasoning Layer", items: ["Contradiction Detector", "Decision Trace Logger", "Fact Validator"], color: "#f59e0b" },
            { label: "Dual Context Graph", items: ["Entity Graph", "Event Graph", "Bipartite Mapping"], color: "#06b6d4" },
            { label: "Ingestion Pipeline", items: ["Entity Resolution", "Causal Classifier", "Temporal Tagger"], color: "#a1a1aa" },
            { label: "Scraper Swarm", items: ["Bright Data Studio", "HackerNews", "GitHub", "Wikipedia"], color: "#8b5cf6" },
          ].map((layer, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
              background: "#111113", border: "1px solid #1c1c20", borderRadius: 6,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: layer.color, minWidth: 120, textTransform: "uppercase", letterSpacing: "1px" }}>
                {layer.label}
              </span>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                {layer.items.map((item, j) => (
                  <span key={j} style={{
                    padding: "4px 10px", background: `${layer.color}10`, border: `1px solid ${layer.color}20`,
                    borderRadius: 4, fontSize: 11, color: layer.color,
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ fontSize: 10, color: "#3f3f46" }}>Data flows upward: Scrapers → Graph → Predictions → Queries</span>
        </div>
      </div>

      {/* Features grid */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>
        <h2 style={{ fontSize: 13, color: "#52525b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 20, textAlign: "center" }}>
          Core Features
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {features.map((f, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                padding: 20, background: "#111113", borderRadius: 8,
                border: `1px solid ${hoveredFeature === i ? f.color + "40" : "#1c1c20"}`,
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "#71717a", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Sources */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>
        <h2 style={{ fontSize: 13, color: "#52525b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 20, textAlign: "center" }}>
          Multi-Source Scraping
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {sources.map((s, i) => (
            <div key={i} style={{
              padding: "14px 20px", background: "#111113", border: `1px solid ${s.color}20`,
              borderRadius: 8, textAlign: "center", flex: 1,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "#52525b", marginTop: 4 }}>{s.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>
        <h2 style={{ fontSize: 13, color: "#52525b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 20, textAlign: "center" }}>
          Tech Stack
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {techStack.map((t, i) => (
            <div key={i} style={{
              padding: "10px 16px", background: "#111113", border: "1px solid #1c1c20",
              borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>{t.name}</span>
              <span style={{ fontSize: 10, color: "#52525b" }}>{t.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Research foundations */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>
        <h2 style={{ fontSize: 13, color: "#52525b", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 20, textAlign: "center" }}>
          Research Foundations
        </h2>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            "Graphiti (Zep) — Temporal Context Graphs",
            "E2RAG (EACL 2026) — Dual Entity-Event Architecture",
            "GraphRAG-Causal — Causal Reasoning",
            "BERTrend — Weak Signal Detection",
            "Neo4j create-context-graph — Decision Traces",
          ].map((r, i) => (
            <span key={i} style={{
              padding: "6px 14px", background: "#111113", border: "1px solid #1c1c20",
              borderRadius: 20, fontSize: 11, color: "#71717a",
            }}>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "40px 0 80px" }}>
        <p style={{ fontSize: 18, color: "#52525b", fontStyle: "italic", maxWidth: 600, margin: "0 auto 24px", lineHeight: 1.6 }}>
          "We didn't build a scraper. We built a system that builds its own scrapers,
          connects the dots between them, and tells you what's about to happen next."
        </p>
        <a href="/graph" style={{
          padding: "14px 40px", background: "#8b5cf6", color: "#fff", borderRadius: 8,
          fontSize: 15, fontWeight: 700, textDecoration: "none",
        }}>
          Launch Dashboard
        </a>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1c1c20", padding: "20px 40px", textAlign: "center" }}>
        <span style={{ fontSize: 11, color: "#3f3f46" }}>
          Built for Into The Scrape-Verse Hackathon 2026 | Powered by Bright Data Scraper Studio
        </span>
      </div>
    </div>
  );
}

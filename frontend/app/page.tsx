"use client";

import { useState, useEffect, useCallback } from "react";
import GraphExplorer from "@/components/GraphExplorer/GraphExplorer";
import PredictionFeed from "@/components/PredictionFeed/PredictionFeed";
import Contradictions from "@/components/Contradictions/Contradictions";
import ScraperStatus from "@/components/ScraperStatus/ScraperStatus";
import QueryBar from "@/components/QueryBar/QueryBar";
import TopicInput from "@/components/TopicInput/TopicInput";
import EntityDetail from "@/components/EntityDetail/EntityDetail";
import SelfHealDemo from "@/components/SelfHealDemo/SelfHealDemo";
import LiveTerminal from "@/components/LiveTerminal/LiveTerminal";
import ComparePanel from "@/components/ComparePanel/ComparePanel";
import EventDetail from "@/components/EventDetail/EventDetail";

export default function Dashboard() {
  const [graphData, setGraphData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [scrapers, setScrapers] = useState([]);
  const [activeTab, setActiveTab] = useState<"predictions" | "contradictions">("predictions");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [graphTopic, setGraphTopic] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const [graphRes, predRes, contraRes, scraperRes] = await Promise.allSettled([
        fetch("/api/graph").then((r) => r.json()),
        fetch("/api/predictions").then((r) => r.json()),
        fetch("/api/contradictions").then((r) => r.json()),
        fetch("/api/scrapers").then((r) => r.json()),
      ]);
      if (graphRes.status === "fulfilled") setGraphData(graphRes.value);
      if (predRes.status === "fulfilled") setPredictions(predRes.value.predictions || []);
      if (contraRes.status === "fulfilled") setContradictions(contraRes.value.contradictions || []);
      if (scraperRes.status === "fulfilled") setScrapers(scraperRes.value.scrapers || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const entityCount = graphData?.entities?.length || 0;
  const eventCount = graphData?.events?.length || 0;
  const causalCount = graphData?.causal_edges?.length || 0;

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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>PRECOG</span>
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                color: "var(--dim)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {entityCount} entities
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--dim)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {eventCount} events
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--dim)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {causalCount} causal links
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: "#3f3f46" }}>Updated {lastUpdated}</span>}
          <button
            onClick={() => setShowCompare(true)}
            style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid #27272a",
              color: "#a1a1aa",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Compare
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/export-report");
                const data = await res.json();
                if (data.report) {
                  const blob = new Blob([data.report], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `precog-report-${new Date().toISOString().split("T")[0]}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch (e) {
                console.error("Export failed:", e);
              }
            }}
            style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid #27272a",
              color: "#a1a1aa",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export Report
          </button>
          <SelfHealDemo />
          <TopicInput onTopicAdded={(topic?: string) => { fetchData(); if (topic) setGraphTopic(topic); }} />
          <ScraperStatus scrapers={scrapers} />
        </div>
      </div>

      {/* Query */}
      <QueryBar />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Graph */}
        <div style={{ flex: 1, position: "relative" }}>
          <GraphExplorer data={graphData} onEntitySelect={setSelectedEntityId} onEventSelect={setSelectedEventId} predictionCount={predictions.length} contradictionCount={contradictions.length} topic={graphTopic} />
        </div>

        {/* Right Panel */}
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
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setActiveTab("predictions")}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "predictions" ? "var(--surface2)" : "transparent",
                color: activeTab === "predictions" ? "var(--text)" : "var(--dim)",
                borderBottom: activeTab === "predictions" ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              Predictions ({predictions.length})
            </button>
            <button
              onClick={() => setActiveTab("contradictions")}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "contradictions" ? "var(--surface2)" : "transparent",
                color: activeTab === "contradictions" ? "var(--text)" : "var(--dim)",
                borderBottom: activeTab === "contradictions" ? "2px solid var(--red)" : "2px solid transparent",
              }}
            >
              Contradictions ({contradictions.length})
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {activeTab === "predictions" ? (
              <PredictionFeed predictions={predictions} />
            ) : (
              <Contradictions contradictions={contradictions} />
            )}
          </div>
        </div>
      </div>

      {/* Entity Detail Panel — slides in from right on double-click */}
      <EntityDetail entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />

      {/* Event Detail Modal — shown on double-click of event nodes */}
      <EventDetail eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />

      {/* Compare Panel — compare two entities side by side */}
      {showCompare && (
        <ComparePanel
          entities={graphData?.entities || []}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Live Terminal — bottom-right button, expands to show backend logs */}
      <LiveTerminal />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import GraphExplorer from "@/components/GraphExplorer/GraphExplorer";
import PredictionFeed from "@/components/PredictionFeed/PredictionFeed";
import Contradictions from "@/components/Contradictions/Contradictions";
import ScraperStatus from "@/components/ScraperStatus/ScraperStatus";
import QueryBar from "@/components/QueryBar/QueryBar";

export default function Dashboard() {
  const [graphData, setGraphData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [scrapers, setScrapers] = useState([]);

  const fetchData = async () => {
    try {
      const [graphRes, predRes, contraRes, scraperRes] = await Promise.all([
        fetch("/api/graph"),
        fetch("/api/predictions"),
        fetch("/api/contradictions"),
        fetch("/api/scrapers"),
      ]);
      setGraphData(await graphRes.json());
      setPredictions((await predRes.json()).predictions || []);
      setContradictions((await contraRes.json()).contradictions || []);
      setScrapers((await scraperRes.json()).scrapers || []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">
            <span className="bg-gradient-to-r from-[var(--purple)] to-[var(--purple2)] bg-clip-text text-transparent">
              PRECOG
            </span>
          </h1>
          <span className="text-xs text-[var(--dim)] border border-[var(--border)] px-2 py-0.5 rounded-full">
            Predictive Causal Context Graph
          </span>
        </div>
        <ScraperStatus scrapers={scrapers} />
      </header>

      {/* Query Bar */}
      <QueryBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Explorer — Main Area */}
        <div className="flex-1 relative">
          <GraphExplorer data={graphData} />
        </div>

        {/* Right Sidebar */}
        <div className="w-96 border-l border-[var(--border)] flex flex-col overflow-hidden">
          {/* Predictions */}
          <div className="flex-1 overflow-y-auto border-b border-[var(--border)]">
            <div className="px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-10">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span>🔮</span> Predictions
                <span className="text-xs text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
                  {predictions.length}
                </span>
              </h2>
            </div>
            <PredictionFeed predictions={predictions} />
          </div>

          {/* Contradictions */}
          <div className="h-64 overflow-y-auto">
            <div className="px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-10">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span>⚠️</span> Contradictions
                <span className="text-xs text-[var(--red)] bg-[var(--red)]/10 px-2 py-0.5 rounded-full">
                  {contradictions.length}
                </span>
              </h2>
            </div>
            <Contradictions contradictions={contradictions} />
          </div>
        </div>
      </div>
    </div>
  );
}

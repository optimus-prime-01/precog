"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface GraphData {
  entities: { id: string; name: string; type: string }[];
  events: { id: string; title: string; event_time: string; confidence: number; source: string }[];
  entity_edges: { source: string; target: string; type: string }[];
  bipartite_edges: { source: string; target: string }[];
  causal_edges: { source: string; target: string; confidence: number; reasoning: string }[];
}

export default function GraphExplorer({ data }: { data: GraphData | null }) {
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const n: Node[] = [];
    const e: Edge[] = [];

    // Entity nodes (cyan)
    data.entities.forEach((ent, i) => {
      n.push({
        id: ent.id,
        position: { x: 100 + (i % 6) * 200, y: 100 + Math.floor(i / 6) * 150 },
        data: { label: `🏢 ${ent.name}` },
        style: {
          background: "rgba(24,255,255,0.1)",
          border: "1px solid rgba(24,255,255,0.4)",
          color: "#18ffff",
          borderRadius: "12px",
          padding: "8px 14px",
          fontSize: "12px",
          fontWeight: 600,
        },
      });
    });

    // Event nodes (pink)
    data.events.forEach((evt, i) => {
      n.push({
        id: evt.id,
        position: { x: 150 + (i % 5) * 220, y: 400 + Math.floor(i / 5) * 120 },
        data: { label: `📌 ${evt.title.slice(0, 40)}...` },
        style: {
          background: "rgba(255,107,203,0.1)",
          border: "1px solid rgba(255,107,203,0.4)",
          color: "#ff6bcb",
          borderRadius: "12px",
          padding: "8px 14px",
          fontSize: "11px",
          fontWeight: 500,
        },
      });
    });

    // Entity-Entity edges
    data.entity_edges.forEach((edge) => {
      e.push({
        id: `ee-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        style: { stroke: "#2a2a3e" },
        labelStyle: { fontSize: 9, fill: "#8888a0" },
      });
    });

    // Bipartite edges (entity → event)
    data.bipartite_edges.forEach((edge) => {
      e.push({
        id: `bp-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        style: { stroke: "#2a2a3e", strokeDasharray: "4 4" },
        animated: false,
      });
    });

    // Causal edges (event → event, animated)
    data.causal_edges.forEach((edge) => {
      e.push({
        id: `ca-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: `causes (${(edge.confidence * 100).toFixed(0)}%)`,
        style: { stroke: "#ff6bcb", strokeWidth: 2 },
        labelStyle: { fontSize: 9, fill: "#ff6bcb", fontWeight: 600 },
        animated: true,
      });
    });

    return { nodes: n, edges: e };
  }, [data]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--dim)]">
        <div className="text-center">
          <div className="text-4xl mb-4">🕸️</div>
          <p className="text-sm">Waiting for graph data...</p>
          <p className="text-xs mt-1">Scrapers are initializing</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      style={{ background: "#0a0a0f" }}
    >
      <Background color="#1a1a2e" gap={20} />
      <Controls
        style={{ background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px" }}
      />
    </ReactFlow>
  );
}

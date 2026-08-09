"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface GraphData {
  entities: { id: string; name: string; type: string }[];
  events: { id: string; title: string; event_time: string; confidence: number; source: string }[];
  entity_edges: { source: string; target: string; type: string }[];
  bipartite_edges: { source: string; target: string }[];
  causal_edges: { source: string; target: string; confidence: number; reasoning: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  company: "#06b6d4",
  person: "#a78bfa",
  technology: "#22c55e",
  product: "#f59e0b",
  location: "#ec4899",
  unknown: "#52525b",
};

type ViewMode = "entities" | "events" | "all";

function buildGraph(data: GraphData, mode: ViewMode) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const showEntities = mode === "entities" || mode === "all";
  const showEvents = mode === "events" || mode === "all";

  if (showEntities) {
    const byType: Record<string, typeof data.entities> = {};
    data.entities.forEach((e) => {
      const t = e.type || "unknown";
      if (!byType[t]) byType[t] = [];
      byType[t].push(e);
    });

    let globalY = 40;
    Object.entries(byType).forEach(([type, ents]) => {
      const color = TYPE_COLORS[type] || TYPE_COLORS.unknown;
      nodes.push({
        id: `label-${type}`,
        position: { x: 20, y: globalY },
        data: { label: type.toUpperCase() },
        selectable: false,
        draggable: false,
        style: { background: "transparent", border: "none", color, fontSize: 10, fontWeight: 700, letterSpacing: "1px", padding: 0, opacity: 0.5 },
      });
      globalY += 28;
      const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(ents.length))));
      ents.forEach((ent, i) => {
        nodes.push({
          id: ent.id,
          position: { x: 20 + (i % cols) * 180, y: globalY + Math.floor(i / cols) * 60 },
          data: { label: ent.name },
          draggable: true,
          style: { background: "#131316", border: `1.5px solid ${color}`, color: "#d4d4d8", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "grab", transition: "all 0.2s" },
        });
      });
      globalY += Math.ceil(ents.length / cols) * 60 + 30;
    });
    data.entity_edges.forEach((edge, i) => {
      edges.push({ id: `ee-${i}`, source: edge.source, target: edge.target, label: edge.type, style: { stroke: "#3f3f46", strokeWidth: 1, transition: "all 0.2s" }, labelStyle: { fontSize: 8, fill: "#52525b" } });
    });
  }

  if (showEvents) {
    const startY = showEntities ? Math.max(40, ...nodes.map((n) => n.position.y)) + 100 : 40;
    const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(data.events.length))));
    nodes.push({
      id: "label-events",
      position: { x: 20, y: startY },
      data: { label: "EVENTS" },
      selectable: false,
      draggable: false,
      style: { background: "transparent", border: "none", color: "#71717a", fontSize: 10, fontWeight: 700, letterSpacing: "1px", padding: 0, opacity: 0.5 },
    });
    data.events.forEach((evt, i) => {
      const title = evt.title.length > 35 ? evt.title.slice(0, 35) + "..." : evt.title;
      nodes.push({
        id: evt.id,
        position: { x: 20 + (i % cols) * 250, y: startY + 28 + Math.floor(i / cols) * 55 },
        data: { label: title },
        draggable: true,
        style: { background: "#0f0f12", border: "1px solid #27272a", color: "#71717a", borderRadius: 4, padding: "5px 12px", fontSize: 11, cursor: "grab", transition: "all 0.2s" },
      });
    });
    data.causal_edges.forEach((edge, i) => {
      edges.push({ id: `ca-${i}`, source: edge.source, target: edge.target, label: "causes", style: { stroke: "#8b5cf6", strokeWidth: 2, transition: "all 0.2s" }, labelStyle: { fontSize: 9, fill: "#a78bfa", fontWeight: 600 }, animated: true });
    });
  }

  // Bipartite edges (entity ↔ event connections)
  if (showEntities && showEvents) {
    data.bipartite_edges.forEach((edge, i) => {
      edges.push({ id: `bp-${i}`, source: edge.source, target: edge.target, style: { stroke: "#1e1e24", strokeWidth: 0.5, transition: "all 0.2s" } });
    });
  }

  return { nodes, edges };
}

export default function GraphExplorer({ data }: { data: GraphData | null }) {
  const [mode, setMode] = useState<ViewMode>("entities");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const built = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    return buildGraph(data, mode);
  }, [data, mode]);

  // Find connected node IDs for highlighting
  const connectedIds = useMemo(() => {
    if (!selectedNode || !data) return new Set<string>();
    const ids = new Set<string>();
    const allEdges = [
      ...built.edges,
    ];
    allEdges.forEach((e) => {
      if (e.source === selectedNode) ids.add(e.target);
      if (e.target === selectedNode) ids.add(e.source);
    });
    return ids;
  }, [selectedNode, built.edges, data]);

  const connectedEdgeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    built.edges.forEach((e) => {
      if (e.source === selectedNode || e.target === selectedNode) ids.add(e.id);
    });
    return ids;
  }, [selectedNode, built.edges]);

  // Apply highlight styles
  const styledNodes = useMemo(() => {
    if (!selectedNode) return built.nodes;
    return built.nodes.map((node) => {
      if (node.id === selectedNode) {
        return { ...node, style: { ...node.style, border: "2px solid #ffffff", boxShadow: "0 0 20px rgba(139,92,246,0.5)", zIndex: 10, opacity: 1 } };
      }
      if (connectedIds.has(node.id)) {
        return { ...node, style: { ...node.style, border: "2px solid #a78bfa", boxShadow: "0 0 12px rgba(139,92,246,0.3)", opacity: 1 } };
      }
      if (node.id.startsWith("label-")) return node;
      return { ...node, style: { ...node.style, opacity: 0.15 } };
    });
  }, [built.nodes, selectedNode, connectedIds]);

  const styledEdges = useMemo(() => {
    if (!selectedNode) return built.edges;
    return built.edges.map((edge) => {
      if (connectedEdgeIds.has(edge.id)) {
        return { ...edge, style: { ...edge.style, stroke: "#a78bfa", strokeWidth: 3, opacity: 1 }, animated: true };
      }
      return { ...edge, style: { ...edge.style, opacity: 0.05 } };
    });
  }, [built.edges, selectedNode, connectedEdgeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(styledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges);

  useEffect(() => {
    setNodes(styledNodes);
    setEdges(styledEdges);
  }, [styledNodes, styledEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.id.startsWith("label-")) return;
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (!data || (data.entities.length === 0 && data.events.length === 0)) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#3f3f46", fontSize: 13 }}>
        {data ? "No data yet." : "Loading..."}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div
        style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10,
          display: "flex", gap: 1, background: "#18181b", borderRadius: 6, border: "1px solid #27272a", overflow: "hidden",
        }}
      >
        {(["entities", "events", "all"] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelectedNode(null); }}
            style={{
              padding: "5px 14px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
              background: mode === m ? "#27272a" : "transparent", color: mode === m ? "#fafafa" : "#52525b", textTransform: "capitalize",
            }}
          >
            {m} {m === "entities" ? `(${data.entities.length})` : m === "events" ? `(${data.events.length})` : ""}
          </button>
        ))}
      </div>

      {selectedNode && (
        <div
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            background: "#18181b", border: "1px solid #27272a", borderRadius: 6, padding: "6px 12px",
            fontSize: 11, color: "#a1a1aa",
          }}
        >
          {connectedIds.size} connected nodes &middot;{" "}
          <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            Clear
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        style={{ background: "#09090b" }}
        minZoom={0.02}
        maxZoom={3}
        panOnScroll
        zoomOnScroll
        selectNodesOnDrag={false}
      >
        <Background color="#141418" gap={30} size={1} />
        <Controls position="bottom-left" />
        <MiniMap nodeColor={() => "#3f3f46"} maskColor="rgba(0,0,0,0.85)" position="bottom-right" style={{ width: 140, height: 90 }} pannable zoomable />
      </ReactFlow>
    </div>
  );
}

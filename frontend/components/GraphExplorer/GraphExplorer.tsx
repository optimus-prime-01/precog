"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import GraphStats from "@/components/GraphStats/GraphStats";
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
  entities: { id: string; name: string; type: string; sources?: string[] }[];
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
        // Source indicator: dot colors based on data sources
        const srcIndicator = (ent.sources || []).some((s: string) => s?.includes("BrightData")) ? " \u25CF" : "";
        nodes.push({
          id: ent.id,
          position: { x: 20 + (i % cols) * 180, y: globalY + Math.floor(i / cols) * 60 },
          data: { label: `${ent.name}${srcIndicator}` },
          draggable: true,
          style: {
            background: "#131316",
            border: `1.5px solid ${color}`,
            color: "#d4d4d8",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "grab",
            transition: "all 0.2s",
            boxShadow: (ent.sources || []).length > 2 ? `0 0 8px ${color}30` : "none",
          },
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

export default function GraphExplorer({ data, onEntitySelect, onEventSelect, predictionCount = 0, contradictionCount = 0, topic = "" }: { data: GraphData | null; onEntitySelect?: (id: string) => void; onEventSelect?: (id: string) => void; predictionCount?: number; contradictionCount?: number; topic?: string }) {
  const [mode, setMode] = useState<ViewMode>("entities");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Search matching node IDs
  const searchMatchIds = useMemo(() => {
    if (!search.trim() || !data) return new Set<string>();
    const q = search.toLowerCase();
    const ids = new Set<string>();
    data.entities.forEach((e) => { if (e.name.toLowerCase().includes(q)) ids.add(e.id); });
    data.events.forEach((e) => { if (e.title.toLowerCase().includes(q)) ids.add(e.id); });
    return ids;
  }, [search, data]);

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

  // Apply highlight styles (search OR click selection)
  const isHighlighting = !!selectedNode || searchMatchIds.size > 0;

  const styledNodes = useMemo(() => {
    if (!isHighlighting) return built.nodes;

    return built.nodes.map((node) => {
      if (node.id.startsWith("label-")) return node;

      // Search highlight
      if (searchMatchIds.size > 0) {
        if (searchMatchIds.has(node.id)) {
          return { ...node, style: { ...node.style, border: "2px solid #22c55e", boxShadow: "0 0 16px rgba(34,197,94,0.4)", opacity: 1 } };
        }
        return { ...node, style: { ...node.style, opacity: 0.12 } };
      }

      // Click highlight
      if (node.id === selectedNode) {
        return { ...node, style: { ...node.style, border: "2px solid #ffffff", boxShadow: "0 0 20px rgba(139,92,246,0.5)", zIndex: 10, opacity: 1 } };
      }
      if (connectedIds.has(node.id)) {
        return { ...node, style: { ...node.style, border: "2px solid #a78bfa", boxShadow: "0 0 12px rgba(139,92,246,0.3)", opacity: 1 } };
      }
      return { ...node, style: { ...node.style, opacity: 0.15 } };
    });
  }, [built.nodes, selectedNode, connectedIds, searchMatchIds, isHighlighting]);

  const styledEdges = useMemo(() => {
    if (searchMatchIds.size > 0) {
      // Highlight edges connected to search matches
      return built.edges.map((edge) => {
        if (searchMatchIds.has(edge.source) || searchMatchIds.has(edge.target)) {
          return { ...edge, style: { ...edge.style, stroke: "#22c55e", strokeWidth: 2, opacity: 1 }, animated: true };
        }
        return { ...edge, style: { ...edge.style, opacity: 0.05 } };
      });
    }
    if (!selectedNode) return built.edges;
    return built.edges.map((edge) => {
      if (connectedEdgeIds.has(edge.id)) {
        return { ...edge, style: { ...edge.style, stroke: "#a78bfa", strokeWidth: 3, opacity: 1 }, animated: true };
      }
      return { ...edge, style: { ...edge.style, opacity: 0.05 } };
    });
  }, [built.edges, selectedNode, connectedEdgeIds, searchMatchIds]);

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

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.id.startsWith("label-")) return;
    if (node.id.startsWith("evt_")) {
      onEventSelect?.(node.id);
      return;
    }
    onEntitySelect?.(node.id);
  }, [onEntitySelect, onEventSelect]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (!data || (data.entities.length === 0 && data.events.length === 0)) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        {/* Animated graph skeleton */}
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Animated nodes */}
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
          {/* Animated edges */}
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
          <div style={{ fontSize: 14, color: "#52525b", fontWeight: 600, marginBottom: 6 }}>
            {topic ? `Building graph for "${topic}"...` : "Waiting for data..."}
          </div>
          <div style={{ fontSize: 11, color: "#3f3f46" }}>
            {topic ? "Scraping sources, extracting entities, building causal chains" : "Add a topic to start building the context graph"}
          </div>
          {topic && (
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6",
                  animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                }} />
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {/* Topic heading */}
      {topic && (
        <div style={{
          position: "absolute", bottom: 56, left: 60, zIndex: 10,
          fontSize: 13, fontWeight: 700, color: "#3f3f46",
          textTransform: "uppercase", letterSpacing: "1.5px",
        }}>
          {topic}
        </div>
      )}

      {/* Top bar: search + view toggle */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, zIndex: 10,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#18181b", border: `1px solid ${search ? "#22c55e" : "#27272a"}`,
          borderRadius: 6, padding: "4px 10px", minWidth: 180,
          transition: "border-color 0.2s",
        }}>
          <span style={{ fontSize: 12, color: "#52525b" }}>&#x1F50D;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedNode(null); }}
            placeholder="Search nodes..."
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "#fafafa", fontSize: 11, width: 120,
            }}
          />
          {search && (
            <>
              <span style={{ fontSize: 10, color: "#22c55e" }}>{searchMatchIds.size}</span>
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 12, padding: 0 }}
              >&times;</button>
            </>
          )}
        </div>

        {/* View toggle */}
        <div style={{
          display: "flex", gap: 1, background: "#18181b", borderRadius: 6,
          border: "1px solid #27272a", overflow: "hidden",
        }}>
          {(["entities", "events", "all"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelectedNode(null); setSearch(""); }}
              style={{
                padding: "5px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                background: mode === m ? "#27272a" : "transparent",
                color: mode === m ? "#fafafa" : "#52525b", textTransform: "capitalize",
              }}
            >
              {m} {m === "entities" ? `(${data.entities.length})` : m === "events" ? `(${data.events.length})` : ""}
            </button>
          ))}
        </div>

        {/* Selection info */}
        {(selectedNode || searchMatchIds.size > 0) && (
          <div style={{
            background: "#18181b", border: "1px solid #27272a", borderRadius: 6,
            padding: "4px 10px", fontSize: 11, color: "#a1a1aa", marginLeft: "auto",
          }}>
            {selectedNode ? `${connectedIds.size} connected` : `${searchMatchIds.size} found`}
            {" "}&middot;{" "}
            <button
              onClick={() => { setSelectedNode(null); setSearch(""); }}
              style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
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
        <Controls position="top-right" />
        <MiniMap nodeColor={() => "#3f3f46"} maskColor="rgba(0,0,0,0.85)" position="bottom-right" style={{ width: 140, height: 90 }} pannable zoomable />
      </ReactFlow>

      <GraphStats
        entities={data.entities.length}
        events={data.events.length}
        causalLinks={data.causal_edges.length}
        predictions={predictionCount}
        contradictions={contradictionCount}
      />
    </div>
  );
}

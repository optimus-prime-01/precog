const API_BASE = "/api";

export async function fetchGraph() {
  const res = await fetch(`${API_BASE}/graph`);
  return res.json();
}

export async function fetchPredictions() {
  const res = await fetch(`${API_BASE}/predictions`);
  return res.json();
}

export async function fetchContradictions() {
  const res = await fetch(`${API_BASE}/contradictions`);
  return res.json();
}

export async function fetchScrapers() {
  const res = await fetch(`${API_BASE}/scrapers`);
  return res.json();
}

export async function queryGraph(question: string) {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return res.json();
}

export async function fetchDecisionTrace(nodeId: string) {
  const res = await fetch(`${API_BASE}/traces/${nodeId}`);
  return res.json();
}

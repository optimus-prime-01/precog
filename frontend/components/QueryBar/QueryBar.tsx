"use client";

import { useState } from "react";

export default function QueryBar() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setAnswer(data.answer || "No answer available.");
    } catch {
      setAnswer("Error querying the graph.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-[var(--border)]">
      <form onSubmit={handleSubmit} className="flex items-center px-4 py-2 gap-3">
        <span className="text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ask the graph... e.g. "What happens if ASML stops shipping to China?"'
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--dim)] outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 bg-[var(--purple)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--purple2)] transition-colors disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Query"}
        </button>
      </form>

      {/* Answer */}
      {answer && (
        <div className="px-4 pb-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--purple2)] mb-2">
              Graph Response
            </p>
            <p className="text-sm text-[var(--dim)] whitespace-pre-wrap leading-relaxed">{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

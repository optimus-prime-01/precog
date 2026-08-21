# PRECOG — Demo Video Script

## Total Time: 3-4 minutes
## Setup: Two browser tabs open — Tab 1: localhost:3000 (empty), Tab 2: localhost:3000/graph (pre-loaded)

---

## SCENE 1: Empty Dashboard (0:00 - 0:25)
**[Screen: Tab 1 — localhost:3000 — empty dashboard with animated skeleton]**

"This is PRECOG — a Predictive Causal Context Graph.

It scrapes the live web using Bright Data Scraper Studio, builds a temporal causal knowledge graph, catches contradictions between sources, and predicts what's coming next — all with explainable causal chains.

Right now the dashboard is empty — no data loaded. Let me show you what it looks like with real data."

---

## SCENE 2: Switch to Pre-loaded Graph (0:25 - 0:50)
**[Switch to Tab 2 — localhost:3000/graph — graph with 161 entities, 6 predictions appears]**

"I've already scraped data about the AI semiconductor industry using Bright Data. Look at this — 161 entities, 108 events, 6 predictions, and 1 contradiction — all generated automatically from scraped web data."

**[Zoom out to show full graph, slowly pan across]**

"Entities are grouped by type — companies in cyan like NVIDIA, AMD, TSMC. Technologies in green. People in purple like Lisa Su and Dario Amodei. Locations in pink."

---

## SCENE 3: Graph Interaction (0:50 - 1:20)
**[Click on any company node — connections highlight in purple]**

"Click any entity — all its connections light up. You can instantly see what this entity is connected to across the entire graph."

**[Type 'NVIDIA' in search bar — nodes glow green]**

"Search works in real-time — type any keyword and matching nodes glow green while everything else dims."

**[Double-click on a company node — Entity Detail Panel slides in]**

"Double-click opens the full detail panel — every event this entity was involved in, its connections, and which data sources it came from. Bright Data, HackerNews, GitHub, Wikipedia — every fact is traceable back to its source."

**[Close panel]**

---

## SCENE 4: Predictions (1:20 - 1:50)
**[Click Predictions tab — show 6 predictions]**

"Now the predictions. PRECOG detected 6 convergent signals across the graph.

85% confidence — open SDKs and affordable AI hardware will commoditize enterprise AI, triggering startup consolidation.

82% confidence — semiconductor foundries will accelerate geopolitical diversification.

78% confidence — governments will move from voluntary AI safety guidelines to binding regulatory frameworks.

These aren't random guesses — each prediction comes from multiple independent data points across different sources all pointing in the same direction."

---

## SCENE 5: Contradictions (1:50 - 2:05)
**[Click Contradictions tab — show 1 contradiction]**

"When sources disagree, PRECOG catches it. Here — two sources report different things about the same entity. The system flags it with severity and temporal analysis. No other knowledge graph does this — they silently overwrite old data."

---

## SCENE 6: Query the Graph (2:05 - 2:35)
**[Type in query bar: "What happens if NVIDIA loses GPU market share to AMD?"]**
**[Wait 3 seconds — answer appears]**

"Let me query the graph — What happens if NVIDIA loses GPU market share to AMD?

The system reasons over the graph data — it traces causal chains, cites specific events with confidence scores, identifies which entities are affected, and shows second-order effects.

TSMC benefits regardless since both companies are customers. AI startups benefit from price competition. NVIDIA pivots harder into software. This is structured intelligence, not a chatbot."

---

## SCENE 7: Self-Healing Demo (2:35 - 3:00)
**[Click "Self-Heal Demo" button → Click "Start Demo"]**

"Self-healing scrapers — a key requirement. Watch — the scraper runs normally, the site changes its layout, scraper starts failing. After 3 failures, Bright Data Scraper Studio automatically rewrites the extraction logic. Scraper heals itself. Data flows again.

Three layers — native Scraper Studio healing, system-level regeneration, and graph-driven creation where the graph itself detects missing data and spawns new scrapers."

---

## SCENE 8: Live Terminal + Add Topic (3:00 - 3:20)
**[Click ">_ Terminal" — show backend logs]**

"The live terminal shows everything happening in real-time — entity extraction, causal classification, predictions."

**[Click "+ Add Topic" → type "Tesla SpaceX" → click "Add to Graph"]**

"Adding a new topic is one click. Multiple sources scraped in parallel — data flows into the graph automatically."

**[Close terminal]**

---

## SCENE 9: Closing (3:20 - 3:40)

"PRECOG merges five research frontiers — Graphiti's temporal context graphs, E2RAG's dual entity-event architecture, GraphRAG's causal reasoning, BERTrend's weak signal detection, and Bright Data's self-healing scrapers.

The internet is the largest source of context in the world. Every context graph today is blind to it. PRECOG is the bridge.

We didn't build a scraper. We built a system that builds its own scrapers, connects the dots, and predicts what's next — with full receipts. Thank you."

---

## DEMO QUERIES (use these exact questions):

1. **"What happens if NVIDIA loses GPU market share to AMD?"** — Best for demo, rich causal analysis
2. **"What is the future of AI chip industry?"** — Industry overview, cites all 6 predictions
3. **"Tell me about NVIDIA"** — Entity deep-dive with connections

## PRE-RECORDING CHECKLIST:
- [ ] Tab 1: localhost:3000 open (empty dashboard)
- [ ] Tab 2: localhost:3000/graph open (pre-loaded with 161 entities, 6 predictions)
- [ ] Backend running (python3 main.py)
- [ ] Docker running (Neo4j + Redis)
- [ ] Test all 3 demo queries before recording
- [ ] Browser fullscreen, dark mode, no bookmarks bar
- [ ] Voice clear and confident, don't rush

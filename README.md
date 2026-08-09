# PRECOG — Predictive Causal Context Graph

> **The first system that scrapes the live web, builds a temporal-causal context graph, and predicts events before they happen — with explainable causal chains.**

Built for the [Into The Scrape-Verse Hackathon](https://www.wemakedevs.org/hackathons/scrape-verse) by WeMakeDevs x Bright Data.

---

## What is PRECOG?

PRECOG is an autonomous web intelligence engine that:

1. **Dynamically creates self-healing scrapers** via Bright Data Scraper Studio
2. **Builds a dual entity-event causal graph** from scraped data
3. **Detects weak signals** across multiple independent sources
4. **Predicts events** before they happen with explainable causal chains
5. **Catches contradictions** between sources with temporal analysis
6. **Self-heals at 3 levels** — native Scraper Studio + system regen + graph-driven creation

## The Gap PRECOG Fills

| Exists Today | What It Can't Do |
|---|---|
| Graphiti/Zep (context graphs) | Blind to the web — only internal data |
| E²RAG (entity-event graphs) | Static documents only — no live data |
| GraphRAG-Causal (causal reasoning) | Pre-annotated datasets — not real-time |
| BERTrend (weak signal detection) | No graph, no causal chains |
| Bright Data Scraper Studio | Returns flat JSON — no graph, no reasoning |

**PRECOG merges all 5 into one live system. This category doesn't exist yet.**

## Architecture

```
Layer 6: Intelligence Interface (NL Query + Predictions + Temporal Rewind)
Layer 5: Prediction Engine (Weak Signals + Causal Chains + Self-Scoring)
Layer 4: Reasoning Layer (Contradictions + Decision Traces + Fact Validation)
Layer 3: Dual Context Graph (Entity Graph + Event Graph + Bipartite Mapping)
Layer 2: Ingestion Pipeline (Entity Resolution + Causal Classification + Temporal Tagging)
Layer 1: Scraper Swarm (Bright Data Scraper Studio — dynamic creation via bdata CLI)
```

## Prediction Types

### Type 1: Convergent Weak Signals
Multiple independent signals from different scrapers converging toward one outcome.

### Type 2: Causal Chain Extrapolation
Graph has proven chain A→B→C. System predicts D based on entity relationships.

### Type 3: Temporal Acceleration
Events speeding up beyond historical baseline = something big incoming.

## Tech Stack

| Layer | Technology |
|---|---|
| Scraper Infrastructure | **Bright Data Scraper Studio** (CLI + API) |
| AI Backbone | **Claude API** (Sonnet) |
| Graph Database | **Neo4j** (bi-temporal model) |
| Vector Search | **Qdrant** |
| Backend API | **FastAPI** (Python) |
| Stream Processing | **Redis Streams** |
| Dashboard | **Next.js 15 + React Flow + D3.js + Tailwind** |
| Coding Agent | **Claude Code** |

## Project Structure

```
precog/
├── backend/
│   ├── scrapers/          # Scraper creation, execution, healing
│   ├── graph/             # Neo4j connection, entity-event model
│   ├── ai/                # Claude API — extraction, causal, prediction
│   ├── api/               # FastAPI routes
│   └── config/            # Scraper registry, settings
├── frontend/
│   ├── app/               # Next.js pages
│   ├── components/
│   │   ├── GraphExplorer/  # React Flow graph visualization
│   │   ├── PredictionFeed/ # Prediction cards
│   │   ├── Contradictions/ # Contradiction alerts
│   │   ├── ScraperStatus/  # Scraper health monitor
│   │   └── QueryBar/       # Natural language query
│   └── lib/               # API client, utilities
├── docs/                  # Architecture docs, pitch deck
└── docker-compose.yml     # Neo4j + Redis + Backend
```

## Quick Start

```bash
# 1. Clone
git clone https://github.com/optimus-prime-01/precog.git
cd precog

# 2. Setup environment
cp .env.example .env
# Add your API keys: BRIGHTDATA_API_KEY, ANTHROPIC_API_KEY

# 3. Start infrastructure
docker-compose up -d

# 4. Install backend
cd backend && pip install -r requirements.txt

# 5. Install frontend
cd frontend && npm install

# 6. Login to Bright Data
bdata login

# 7. Run
cd backend && python main.py    # Start backend
cd frontend && npm run dev      # Start dashboard
```

## How Prediction Works

```
Scrapers (every 15 min) → Claude API extracts entities + events
→ Neo4j graph populates → Causal edges form (A caused B)
→ Weak signals detected (4 independent signals converging)
→ Prediction generated with confidence + causal chain + sources
→ Dashboard shows prediction with full evidence trail
→ System self-scores when prediction resolves
```

Every prediction has:
- Confidence score (0.0 - 1.0)
- Full causal chain
- Source URLs for every signal
- Decision trace (complete reasoning)
- Timeframe estimate
- Self-scoring when resolved

## License

MIT

## Hackathon

- **Event:** Into The Scrape-Verse (Aug 17-23, 2026)
- **Sponsor:** Bright Data
- **Community:** WeMakeDevs
- **Prize Pool:** $15,000 + NVIDIA DGX Spark

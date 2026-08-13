"""
Prediction Engine — detects weak signals, builds causal chains, generates predictions.

Three prediction types:
1. Convergent Weak Signals — multiple independent signals converging toward one outcome
2. Causal Chain Extrapolation — extending proven A→B→C chains to predict D
3. Temporal Acceleration — events speeding up beyond historical baseline
"""

import asyncio

from graph.connection import neo4j_driver
from graph.models import Prediction, gen_id
from ai.claude_client import ask_claude_json
from config.settings import settings


CONVERGENCE_PROMPT = """You are a predictive intelligence engine. You analyze multiple independent signals
about the same entity/topic from DIFFERENT sources and determine if they CONVERGE toward a predictable outcome.

Rules:
- Only predict if 3+ independent signals point the same direction
- Each signal must come from a DIFFERENT source
- Confidence must reflect how strong the convergence is
- Always explain the causal reasoning
- Always suggest what confirming signals to watch for

Return JSON:
{
  "has_prediction": true/false,
  "prediction": "What will happen",
  "confidence": 0.0-1.0,
  "timeframe": "within X days/weeks",
  "reasoning": "Why these signals converge",
  "causal_chain": "Signal A + Signal B + Signal C → Outcome",
  "watch_for": ["confirming signal 1", "confirming signal 2"]
}"""


CAUSAL_CHAIN_PROMPT = """You are a causal chain extrapolation engine. Given a PROVEN causal chain
(A caused B caused C) and the entity relationship context, predict the NEXT event in the chain.

Rules:
- Only predict the NEXT logical step, not multiple steps ahead
- Use entity relationships to inform the prediction
- Confidence should reflect how certain the next step is
- The chain A→B→C is already PROVEN from scraped data. You only predict D.

Return JSON:
{
  "has_prediction": true/false,
  "prediction": "The next event",
  "confidence": 0.0-1.0,
  "timeframe": "within X days/weeks",
  "reasoning": "Why this is the logical next step",
  "chain_so_far": "A → B → C → [predicted D]"
}"""


class PredictionEngine:

    async def run_loop(self):
        """Run prediction analysis every 15 minutes."""
        while True:
            await asyncio.sleep(settings.scraper_interval_minutes * 60)
            await self.detect_all_predictions()

    def _log(self, msg, level="info"):
        try:
            from api.routes import add_log
            add_log("prediction", msg, level)
        except Exception:
            pass

    async def detect_all_predictions(self):
        """Run all prediction types."""
        self._log("Running prediction analysis...")
        print("[Prediction Engine] Running analysis...")
        await self._detect_from_all_events()
        await self._detect_convergent_signals()
        await self._detect_causal_chain_extensions()
        print("[Prediction Engine] Analysis complete.")

    async def _detect_from_all_events(self):
        """Analyze ALL recent events together for cross-cutting patterns."""
        async with neo4j_driver.session() as session:
            # Check if we already have predictions
            existing = await session.run("MATCH (p:Prediction) RETURN count(p) AS c")
            if (await existing.single())["c"] >= 5:
                return  # enough predictions already

            r = await session.run("""
                MATCH (evt:Event)
                OPTIONAL MATCH (ent:Entity)-[:PARTICIPATES_IN]->(evt)
                WITH evt, collect(ent.name) AS entities
                RETURN evt.title AS title, entities
                ORDER BY evt.ingestion_time DESC LIMIT 20
            """)
            events = [record.data() async for record in r]

            if len(events) < 3:
                return

            try:
                result = await ask_claude_json(
                    """You are a predictive intelligence engine. Analyze these recent events scraped from the web.
Find convergent patterns: multiple events pointing toward the same outcome, emerging trends, or accelerating patterns.
Generate 1-3 predictions based on the data.

Return JSON:
{"predictions": [{"text": "prediction text", "confidence": 0.7, "reasoning": "why this is likely", "timeframe": "within X days/weeks"}]}

If no meaningful prediction, return {"predictions": []}""",
                    f"Recent events: {events}",
                )
                for pred in result.get("predictions", []):
                    if pred.get("confidence", 0) >= settings.prediction_confidence_threshold:
                        pid = gen_id("pred_")
                        await session.run(
                            """CREATE (p:Prediction {
                                id: $id, text: $text, confidence: $conf,
                                prediction_type: 'convergent', reasoning: $reasoning,
                                timeframe: $timeframe, created_at: datetime(), resolved: false
                            })""",
                            id=pid, text=pred["text"], conf=pred["confidence"],
                            reasoning=pred.get("reasoning", ""), timeframe=pred.get("timeframe", ""),
                        )
                        self._log(f"Prediction: {pred['text'][:80]} (confidence: {pred['confidence']})", "success")
                        print(f"  🔮 Prediction: {pred['text'][:80]}... ({pred['confidence']})")
            except Exception as e:
                print(f"  Prediction error: {str(e)[:80]}")

    async def _detect_convergent_signals(self):
        """Type 1: Find entities with 2+ recent signals."""
        async with neo4j_driver.session() as session:
            # Find entities with multiple recent events
            result = await session.run(
                """
                MATCH (ent:Entity)-[:PARTICIPATES_IN]->(evt:Event)
                WHERE evt.ingestion_time > datetime() - duration('P7D')
                WITH ent, collect(DISTINCT evt.source_scraper) AS sources,
                     collect({title: evt.title, desc: evt.description,
                             source: evt.source_scraper, time: toString(evt.event_time),
                             id: evt.id}) AS signals
                WHERE size(signals) >= 2
                RETURN ent.name AS entity, ent.type AS type, signals
                """
            )

            entities_with_signals = [record.data() async for record in result]

            for item in entities_with_signals:
                await self._analyze_convergence(session, item)

    async def _analyze_convergence(self, session, item: dict):
        """Ask Claude if signals converge toward a prediction."""
        try:
            # Get entity's relationships for context
            ctx_result = await session.run(
                """
                MATCH (e:Entity {name: $name})-[r]-(connected:Entity)
                RETURN type(r) AS rel, connected.name AS name, connected.type AS type
                LIMIT 20
                """,
                name=item["entity"],
            )
            context = [record.data() async for record in ctx_result]

            user_prompt = f"""Entity: {item['entity']} ({item['type']})

Recent signals (last 7 days) from different sources:
{item['signals']}

Entity graph context (relationships):
{context}

Do these independent signals converge toward a predictable outcome?"""

            response = await ask_claude_json(CONVERGENCE_PROMPT, user_prompt)

            if response.get("has_prediction") and response.get("confidence", 0) >= settings.prediction_confidence_threshold:
                pred_id = gen_id("pred_")
                signal_ids = [s["id"] for s in item["signals"]]

                await session.run(
                    """
                    CREATE (p:Prediction {
                        id: $id,
                        text: $text,
                        confidence: $confidence,
                        prediction_type: 'convergent',
                        reasoning: $reasoning,
                        timeframe: $timeframe,
                        watch_for: $watch_for,
                        weak_signals: $signals,
                        created_at: datetime(),
                        resolved: false
                    })
                    """,
                    id=pred_id,
                    text=response["prediction"],
                    confidence=response["confidence"],
                    reasoning=response["reasoning"],
                    timeframe=response.get("timeframe", "unknown"),
                    watch_for=response.get("watch_for", []),
                    signals=signal_ids,
                )
                print(f"  🔮 Prediction: {response['prediction'][:80]}... (confidence: {response['confidence']})")

        except Exception as e:
            print(f"  Convergence analysis error: {e}")

    async def _detect_causal_chain_extensions(self):
        """Type 2: Find proven causal chains and predict the next event."""
        async with neo4j_driver.session() as session:
            # Find chains of 2+ causally linked events
            result = await session.run(
                """
                MATCH path = (e1:Event)-[:CAUSES*2..4]->(e_last:Event)
                WHERE e_last.ingestion_time > datetime() - duration('P7D')
                WITH nodes(path) AS chain_events
                RETURN [e IN chain_events | {id: e.id, title: e.title,
                       desc: e.description, time: toString(e.event_time)}] AS chain
                LIMIT 5
                """
            )

            chains = [record.data() async for record in result]

            for chain_data in chains:
                await self._extend_causal_chain(session, chain_data["chain"])

    async def _extend_causal_chain(self, session, chain: list[dict]):
        """Ask Claude to predict the next event in a causal chain."""
        try:
            # Get entity context for the last event in chain
            last_event_id = chain[-1]["id"]
            ctx_result = await session.run(
                """
                MATCH (evt:Event {id: $id})<-[:PARTICIPATES_IN]-(ent:Entity)-[r]-(other:Entity)
                RETURN ent.name AS entity, type(r) AS rel, other.name AS connected
                LIMIT 20
                """,
                id=last_event_id,
            )
            context = [record.data() async for record in ctx_result]

            user_prompt = f"""PROVEN causal chain (all events are scraped and verified):
{chain}

Entity relationship context:
{context}

What is the NEXT event in this causal chain?"""

            response = await ask_claude_json(CAUSAL_CHAIN_PROMPT, user_prompt)

            if response.get("has_prediction") and response.get("confidence", 0) >= settings.prediction_confidence_threshold:
                pred_id = gen_id("pred_")
                chain_ids = [e["id"] for e in chain]

                await session.run(
                    """
                    CREATE (p:Prediction {
                        id: $id,
                        text: $text,
                        confidence: $confidence,
                        prediction_type: 'causal_chain',
                        reasoning: $reasoning,
                        timeframe: $timeframe,
                        causal_chain: $chain,
                        created_at: datetime(),
                        resolved: false
                    })
                    """,
                    id=pred_id,
                    text=response["prediction"],
                    confidence=response["confidence"],
                    reasoning=response["reasoning"],
                    timeframe=response.get("timeframe", "unknown"),
                    chain=chain_ids,
                )
                print(f"  🔮 Chain prediction: {response['prediction'][:80]}... (confidence: {response['confidence']})")

        except Exception as e:
            print(f"  Chain extension error: {e}")

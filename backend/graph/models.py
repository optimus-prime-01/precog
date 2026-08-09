"""
Graph data models — Pydantic schemas for Entity, Event, Episode, and relationships.

Inspired by:
- Graphiti (Zep): episodic memory, evolving entity summaries, temporal edge validity
- Neo4j create-context-graph: decision traces with thought chains and causal relationships
- Financial decision trace patterns: tool call tracking, influence chains
"""

from datetime import datetime
from pydantic import BaseModel, Field
import uuid


def gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


# ---------------------------------------------------------------------------
# Episode Node (NEW — Graphiti episodic memory)
# Stores RAW scraped data as ground truth. All entities/events trace back here.
# ---------------------------------------------------------------------------

class Episode(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("ep_"))
    source: str = ""  # scraper name
    source_type: str = ""  # news, company, govt, social, finance
    content: str = ""  # raw JSON of the scraped item
    valid_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Entity Node — enriched with Graphiti-style evolving summary and labels
# ---------------------------------------------------------------------------

class Entity(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("ent_"))
    name: str
    type: str  # company, person, technology, product, location
    properties: dict = Field(default_factory=dict)
    aliases: list[str] = Field(default_factory=list)
    # Graphiti-inspired fields
    summary: str = ""  # evolving summary of surrounding edges
    labels: list[str] = Field(default_factory=list)  # categorical tags
    attributes: dict = Field(default_factory=dict)  # custom key-value properties
    valid_at: datetime | None = None  # temporal validity start
    invalid_at: datetime | None = None  # temporal validity end
    group_id: str = ""  # multi-tenant / namespace support
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Event Node — with episode linkage
# ---------------------------------------------------------------------------

class Event(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("evt_"))
    title: str
    description: str = ""
    event_time: datetime  # When it happened in reality
    ingestion_time: datetime = Field(default_factory=datetime.utcnow)  # When we scraped it
    validity_window_days: int = 30  # TTL before re-verification
    confidence: float = 0.5
    source_scraper: str = ""
    source_url: str = ""
    entities_involved: list[str] = Field(default_factory=list)  # Entity IDs
    # Graphiti-inspired fields
    episode_id: str = ""  # links to raw scraped Episode node
    source_description: str = ""  # human-readable description of the data source


# ---------------------------------------------------------------------------
# EntityEdge — with Graphiti-style temporal validity
# ---------------------------------------------------------------------------

class EntityEdge(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("ee_"))
    source_entity_id: str
    target_entity_id: str
    relation_type: str  # e.g. PARTNER_OF, COMPETES_WITH, ACQUIRED
    fact: str = ""  # the factual statement this edge represents
    confidence: float = 0.5
    reasoning: str = ""
    # Temporal validity (Graphiti pattern)
    valid_at: datetime | None = None  # when fact became true
    invalid_at: datetime | None = None  # when fact stopped being true
    expired_at: datetime | None = None  # when edge was invalidated by new data
    episode_id: str = ""  # episode that created this edge
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# CausalEdge — kept for backward compatibility
# ---------------------------------------------------------------------------

class CausalEdge(BaseModel):
    cause_event_id: str
    effect_event_id: str
    confidence: float
    reasoning: str
    trace_id: str = Field(default_factory=lambda: gen_id("dt_"))


# ---------------------------------------------------------------------------
# Contradiction — unchanged
# ---------------------------------------------------------------------------

class Contradiction(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("ctr_"))
    entity_name: str
    fact_a: str
    source_a: str
    time_a: datetime
    fact_b: str
    source_b: str
    time_b: datetime
    analysis: str = ""
    status: str = "active"  # active, resolved, monitoring
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Prediction — with resolution trace linkage
# ---------------------------------------------------------------------------

class Prediction(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("pred_"))
    text: str
    confidence: float
    prediction_type: str  # convergent, causal_chain, acceleration
    causal_chain: list[str] = Field(default_factory=list)  # Event IDs
    weak_signals: list[str] = Field(default_factory=list)
    reasoning: str = ""
    timeframe: str = ""
    watch_for: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False
    resolved_at: datetime | None = None
    was_correct: bool | None = None
    # Link to the decision trace for when prediction resolves
    resolution_trace_id: str = ""


# ---------------------------------------------------------------------------
# DecisionTrace — upgraded with Neo4j create-context-graph patterns
# ---------------------------------------------------------------------------

class DecisionTrace(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("dt_"))
    action: str  # CREATE_ENTITY, CREATE_EVENT, ADD_CAUSAL_EDGE, PREDICTION, CONTRADICTION
    target: str  # What was affected
    reasoning: str
    sources: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Neo4j create-context-graph enhancements
    thought_chain: list[str] = Field(default_factory=list)  # sequential reasoning steps
    tool_calls: list[str] = Field(default_factory=list)  # scraper/API calls made
    causal_relationships: list[str] = Field(default_factory=list)  # dependencies between decisions
    influenced_by: list[str] = Field(default_factory=list)  # IDs of traces that influenced this one

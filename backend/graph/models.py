"""
Graph data models — Pydantic schemas for Entity, Event, and relationships.
"""

from datetime import datetime
from pydantic import BaseModel, Field
import uuid


def gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class Entity(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("ent_"))
    name: str
    type: str  # company, person, technology, product, location
    properties: dict = Field(default_factory=dict)
    aliases: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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


class CausalEdge(BaseModel):
    cause_event_id: str
    effect_event_id: str
    confidence: float
    reasoning: str
    trace_id: str = Field(default_factory=lambda: gen_id("dt_"))


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


class DecisionTrace(BaseModel):
    id: str = Field(default_factory=lambda: gen_id("dt_"))
    action: str  # CREATE_ENTITY, CREATE_EVENT, ADD_CAUSAL_EDGE, PREDICTION, CONTRADICTION
    target: str  # What was affected
    reasoning: str
    sources: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

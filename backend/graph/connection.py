"""
Neo4j connection and schema initialization.
Dual Entity-Event graph with bi-temporal data model.
Includes Episode nodes (Graphiti episodic memory) and temporal edge indexes.
"""

from neo4j import AsyncGraphDatabase

from config.settings import settings

neo4j_driver = AsyncGraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_user, settings.neo4j_password),
)


async def init_schema():
    """Initialize Neo4j constraints and indexes for the dual graph."""
    async with neo4j_driver.session() as session:
        # Entity constraints
        await session.run(
            "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE"
        )
        await session.run(
            "CREATE INDEX entity_name IF NOT EXISTS FOR (e:Entity) ON (e.name)"
        )
        await session.run(
            "CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)"
        )
        await session.run(
            "CREATE INDEX entity_group IF NOT EXISTS FOR (e:Entity) ON (e.group_id)"
        )

        # Event constraints
        await session.run(
            "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE"
        )
        await session.run(
            "CREATE INDEX event_time IF NOT EXISTS FOR (e:Event) ON (e.event_time)"
        )
        await session.run(
            "CREATE INDEX event_ingestion IF NOT EXISTS FOR (e:Event) ON (e.ingestion_time)"
        )
        await session.run(
            "CREATE INDEX event_episode IF NOT EXISTS FOR (e:Event) ON (e.episode_id)"
        )

        # Episode constraints (Graphiti episodic memory)
        await session.run(
            "CREATE CONSTRAINT episode_id IF NOT EXISTS FOR (ep:Episode) REQUIRE ep.id IS UNIQUE"
        )
        await session.run(
            "CREATE INDEX episode_source IF NOT EXISTS FOR (ep:Episode) ON (ep.source)"
        )
        await session.run(
            "CREATE INDEX episode_valid_at IF NOT EXISTS FOR (ep:Episode) ON (ep.valid_at)"
        )

        # EntityEdge temporal indexes (relationship property indexes require Neo4j 5.7+)
        # These are composite indexes on the EntityEdge node for fast temporal queries
        await session.run(
            "CREATE CONSTRAINT entity_edge_id IF NOT EXISTS FOR (ee:EntityEdge) REQUIRE ee.id IS UNIQUE"
        )
        await session.run(
            "CREATE INDEX entity_edge_valid_at IF NOT EXISTS FOR (ee:EntityEdge) ON (ee.valid_at)"
        )
        await session.run(
            "CREATE INDEX entity_edge_invalid_at IF NOT EXISTS FOR (ee:EntityEdge) ON (ee.invalid_at)"
        )
        await session.run(
            "CREATE INDEX entity_edge_expired_at IF NOT EXISTS FOR (ee:EntityEdge) ON (ee.expired_at)"
        )

        # Decision Trace constraints and indexes
        await session.run(
            "CREATE CONSTRAINT trace_id IF NOT EXISTS FOR (t:DecisionTrace) REQUIRE t.id IS UNIQUE"
        )
        await session.run(
            "CREATE INDEX trace_action IF NOT EXISTS FOR (t:DecisionTrace) ON (t.action)"
        )
        await session.run(
            "CREATE INDEX trace_created IF NOT EXISTS FOR (t:DecisionTrace) ON (t.created_at)"
        )

        # Prediction constraints
        await session.run(
            "CREATE CONSTRAINT prediction_id IF NOT EXISTS FOR (p:Prediction) REQUIRE p.id IS UNIQUE"
        )

    print("[Neo4j] Schema initialized")


async def get_session():
    return neo4j_driver.session()

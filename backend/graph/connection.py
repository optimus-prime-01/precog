"""
Neo4j connection and schema initialization.
Dual Entity-Event graph with bi-temporal data model.
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

        # Decision Trace constraints
        await session.run(
            "CREATE CONSTRAINT trace_id IF NOT EXISTS FOR (t:DecisionTrace) REQUIRE t.id IS UNIQUE"
        )

        # Prediction constraints
        await session.run(
            "CREATE CONSTRAINT prediction_id IF NOT EXISTS FOR (p:Prediction) REQUIRE p.id IS UNIQUE"
        )

    print("[Neo4j] Schema initialized")


async def get_session():
    return neo4j_driver.session()

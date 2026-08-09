import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from graph.connection import neo4j_driver, init_schema
from api.routes import router
from scrapers.orchestrator import ScraperOrchestrator
from ai.prediction_engine import PredictionEngine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_schema()
    orchestrator = ScraperOrchestrator()
    prediction_engine = PredictionEngine()
    app.state.orchestrator = orchestrator
    app.state.prediction_engine = prediction_engine

    # Start background scraping loop
    scrape_task = asyncio.create_task(orchestrator.run_loop())
    predict_task = asyncio.create_task(prediction_engine.run_loop())

    yield

    # Shutdown
    scrape_task.cancel()
    predict_task.cancel()
    neo4j_driver.close()


app = FastAPI(
    title="PRECOG API",
    description="Predictive Causal Context Graph",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI, Query, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import asyncio
import logging
from typing import Optional, List, Dict, Any

from agent_crawler import D2CCrawlerAgent
from search_engine import SearchIndexer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("D2CIndexAPI")

app = FastAPI(
    title="D2C Index AI Web Crawler & Search Engine API",
    description="Multi-threaded e-commerce web scraping pipeline and sub-50ms search indexer.",
    version="2.4.0"
)

# Enable CORS for web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

search_engine = SearchIndexer()

class CrawlRequest(BaseModel):
    url: str

class CrawlResponse(BaseModel):
    status: str
    message: str
    url: str

async def run_crawler_task(url: str):
    """Async background task that crawls URL and pushes catalog to search index."""
    try:
        agent = D2CCrawlerAgent(target_url=url)
        products = await agent.run()
        if products:
            search_engine.index_products(products)
            logger.info(f"Successfully processed and indexed {len(products)} items for {url}")
    except Exception as e:
        logger.error(f"Error during background crawl task for {url}: {e}")

@app.get("/")
async def root():
    return {
        "service": "D2C Index AI Crawling Engine API",
        "status": "online",
        "version": "2.4.0"
    }

@app.post("/api/v1/crawl", response_model=CrawlResponse)
async def trigger_crawl(request: CrawlRequest, background_tasks: BackgroundTasks):
    """
    Accepts any D2C brand URL (e.g. https://snitch.co.in) and triggers
    asynchronous multi-stage crawling & normalization agent in the background.
    """
    if not request.url or len(request.url.strip()) < 4:
        raise HTTPException(status_code=400, detail="Invalid target website URL provided.")

    background_tasks.add_task(run_crawler_task, request.url)
    
    return CrawlResponse(
        status="initiated",
        message=f"AI Crawler Agent dispatched for {request.url}. Catalog extraction in progress.",
        url=request.url
    )

@app.post("/api/v1/crawl/sync")
async def trigger_crawl_sync(request: CrawlRequest):
    """
    Synchronous crawl endpoint for instant preview in web applications.
    """
    if not request.url or len(request.url.strip()) < 4:
        raise HTTPException(status_code=400, detail="Invalid target website URL provided.")

    agent = D2CCrawlerAgent(target_url=request.url)
    products = await agent.run()
    search_engine.index_products(products)

    return {
        "status": "success",
        "brand_name": agent.brand_name,
        "total_products": len(products),
        "products": products
    }

@app.get("/api/v1/search")
async def search_products(q: str = Query(..., min_length=1)):
    """Handles instant search queries with sub-50ms latency."""
    hits = search_engine.query(search_text=q)
    return {
        "query": q,
        "total_results": len(hits),
        "results": hits
    }

# Run with: uvicorn main:app --reload --port 8000

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.database import engine, Base, SessionLocal
from app.routers import ships, combat
import app.models  # noqa: F401 — ensure models are registered before create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed if empty
    async with SessionLocal() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM ships"))
        count = result.scalar()
        if count == 0:
            from app.seed_data import run_seed
            await run_seed(db)
        else:
            print(f"  DB already has {count} ships — skipping seed.")

    yield


app = FastAPI(title="Starfire", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ships.router)
app.include_router(combat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import clients, meetings, briefs, transcripts, preferences, portfolio
from routers.demo import router as demo_router, _reset_daniel_demo_meeting

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Add new columns to existing tables that SQLAlchemy won't auto-migrate."""
    from sqlalchemy import text
    migrations = [
        "ALTER TABLE post_call_analyses ADD COLUMN draft_email TEXT",
    ]
    with engine.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_migrations()
    if os.getenv("RESET_DEMO_ON_STARTUP", "").lower() == "true":
        db = SessionLocal()
        try:
            result = _reset_daniel_demo_meeting(db)
            print(f"[demo reset] {result}")
        finally:
            db.close()
    yield


app = FastAPI(title="Advisor Prep API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])
app.include_router(briefs.router, prefix="/api/briefs", tags=["briefs"])
app.include_router(transcripts.router, prefix="/api/transcripts", tags=["transcripts"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["preferences"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(demo_router, prefix="/api/demo", tags=["demo"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Advisor Prep API"}

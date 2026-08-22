from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import close_mongo_client, get_mongo_client
from app.routers import channels, fetch, title, videos

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_mongo_client()
    yield
    await close_mongo_client()


app = FastAPI(title="CrackEd API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(channels.router)
app.include_router(fetch.router)
app.include_router(title.router)
app.include_router(videos.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "CrackEd"}

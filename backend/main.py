import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import status, profile, simulate

app = FastAPI(title="冷房タイミングガイド API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()


app.include_router(status.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")


@app.get("/healthz")
def health():
    return {"status": "ok"}

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from database import init_db
from routers import status, profile, simulate

app = FastAPI(title="冷房タイミングガイド API")

# フロントエンドは常にnginx/vite経由の同一オリジンでAPIを呼び出すため、
# ブラウザからのクロスオリジンアクセスを許可するCORS設定は不要（設計書2.9のセキュリティ方針）


@app.on_event("startup")
async def startup():
    init_db()


app.include_router(status.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")


@app.get("/healthz")
def health():
    return {"status": "ok"}

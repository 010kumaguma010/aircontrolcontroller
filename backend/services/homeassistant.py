import os
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

HA_BASE_URL = os.getenv("HA_BASE_URL", "")
HA_TOKEN = os.getenv("HA_LONG_LIVED_TOKEN", "")
HA_TEMP_ENTITY = os.getenv("HA_ROOM_TEMP_ENTITY_ID", "")
HA_HUMID_ENTITY = os.getenv("HA_ROOM_HUMIDITY_ENTITY_ID", "")

STALE_THRESHOLD_MINUTES = 30


async def fetch_state(entity_id: str) -> dict:
    url = f"{HA_BASE_URL}/api/states/{entity_id}"
    headers = {"Authorization": f"Bearer {HA_TOKEN}"}
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def get_room_data() -> tuple[Optional[float], Optional[float], Optional[str], bool, Optional[str]]:
    """Returns (temp, humidity, observed_at_iso, is_stale, error_message)"""
    if not all([HA_BASE_URL, HA_TOKEN, HA_TEMP_ENTITY]):
        return None, None, None, False, "Home Assistant設定が未構成です"

    try:
        temp_state = await fetch_state(HA_TEMP_ENTITY)
        raw_state = temp_state.get("state", "")
        try:
            temp = float(raw_state)
        except (ValueError, TypeError):
            return None, None, None, False, f"センサー値が無効です（state: {raw_state!r}）。センサーがオフラインの可能性があります"

        observed_at = temp_state.get("last_updated")

        humidity = None
        if HA_HUMID_ENTITY:
            humid_state = await fetch_state(HA_HUMID_ENTITY)
            try:
                humidity = float(humid_state.get("state", ""))
            except (ValueError, TypeError):
                humidity = None  # 湿度は表示用のみ。取得不可でも処理継続

        is_stale = False
        if observed_at:
            observed_dt = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
            age = datetime.now(timezone.utc) - observed_dt
            is_stale = age > timedelta(minutes=STALE_THRESHOLD_MINUTES)

        return temp, humidity, observed_at, is_stale, None

    except Exception as e:
        return None, None, None, False, f"HA接続エラー: {e}"

import time
import httpx
from datetime import datetime
from models import HourlyForecast

LATITUDE = 35.8265
LONGITUDE = 139.8236
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL = 300  # 予報は5分キャッシュ（1時間単位のデータなので十分）

_cache: dict = {"data": None, "ts": 0.0}


def _efficiency(temp: float) -> str:
    if temp <= 24:
        return "excellent"
    elif temp <= 27:
        return "good"
    elif temp <= 31:
        return "fair"
    return "poor"


async def fetch_forecast() -> list[HourlyForecast]:
    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["ts"] < CACHE_TTL:
        return _cache["data"]

    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "hourly": "temperature_2m,relative_humidity_2m",
        "forecast_days": 1,
        "timezone": "Asia/Tokyo",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    times = data["hourly"]["time"]
    temps = data["hourly"]["temperature_2m"]
    humids = data["hourly"]["relative_humidity_2m"]

    result = [
        HourlyForecast(
            time=t,
            temperature=temp,
            humidity=hum,
            efficiency=_efficiency(temp),
        )
        for t, temp, hum in zip(times, temps, humids)
    ]
    _cache["data"] = result
    _cache["ts"] = now
    return result


def get_temp_at_hour(forecast: list[HourlyForecast], hour: int) -> float:
    """指定した時間帯（運転開始時刻の時など）の外気温を返す。見つからない場合は 30.0℃。"""
    return next(
        (f.temperature for f in forecast if datetime.fromisoformat(f.time).hour == hour),
        30.0,
    )

import httpx
from models import HourlyForecast

LATITUDE = 35.8265
LONGITUDE = 139.8236
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _efficiency(temp: float) -> str:
    if temp <= 24:
        return "excellent"
    elif temp <= 27:
        return "good"
    elif temp <= 31:
        return "fair"
    return "poor"


async def fetch_forecast() -> list[HourlyForecast]:
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

    return [
        HourlyForecast(
            time=t,
            temperature=temp,
            humidity=hum,
            efficiency=_efficiency(temp),
        )
        for t, temp, hum in zip(times, temps, humids)
    ]

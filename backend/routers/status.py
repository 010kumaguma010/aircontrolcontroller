from fastapi import APIRouter
from models import StatusResponse
from services.openmeteo import fetch_forecast
from services.homeassistant import get_room_data
from services.simulation import recommend_target_temp

router = APIRouter()


@router.get("/status", response_model=StatusResponse)
async def get_status():
    forecast = await fetch_forecast()
    temp, humidity, observed_at, is_stale, ha_error = await get_room_data()

    return StatusResponse(
        outside_temp_forecast=forecast,
        current_room_temp=temp,
        current_humidity=humidity,
        observed_at=observed_at,
        is_stale=is_stale,
        ha_error=ha_error,
        recommended_target_temp=recommend_target_temp(humidity),
    )

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import SimulateRequest, SimulateResponse
from database import get_db, ProfileRecord
from services.homeassistant import get_room_data
from services.openmeteo import fetch_forecast
from services.simulation import build_response

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse)
async def simulate(body: SimulateRequest, db: Session = Depends(get_db)):
    profile = db.query(ProfileRecord).filter_by(id=1).first()
    if not profile:
        raise HTTPException(status_code=400, detail="部屋プロファイルが未登録です")

    current_temp, _, _, _, ha_error = await get_room_data()
    if current_temp is None:
        raise HTTPException(status_code=503, detail=f"室温を取得できません: {ha_error}")

    forecast = await fetch_forecast()
    arrival_parts = body.arrival_time.split(":")
    arrival_hour = int(arrival_parts[0])
    outside_temp = next(
        (f.temperature for f in forecast if int(f.time.split("T")[1].split(":")[0]) == arrival_hour),
        forecast[12].temperature if len(forecast) > 12 else 30.0,
    )

    return build_response(
        current_temp=current_temp,
        target_temp=body.target_temp,
        arrival_time_str=body.arrival_time,
        outside_temp=outside_temp,
        tatami_size=profile.tatami_size,
        aircon_kw=profile.aircon_cooling_kw,
        insulation_level=profile.insulation_level,
    )

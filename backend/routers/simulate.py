from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import SimulateRequest, SimulateResponse
from database import get_db, ProfileRecord
from services.homeassistant import get_room_data
from services.openmeteo import fetch_forecast
from services.simulation import build_response, recommend_target_temp

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse)
async def simulate(body: SimulateRequest, db: Session = Depends(get_db)):
    profile = db.query(ProfileRecord).filter_by(id=1).first()
    if not profile:
        raise HTTPException(status_code=400, detail="部屋プロファイルが未登録です")

    current_temp, humidity, _, _, ha_error = await get_room_data()
    if current_temp is None:
        raise HTTPException(status_code=503, detail=f"室温を取得できません: {ha_error}")

    target_temp = body.target_temp
    if target_temp is None:
        target_temp = recommend_target_temp(humidity)
        if target_temp is None:
            raise HTTPException(
                status_code=400,
                detail="目標室温が未指定で、湿度からのおすすめ値も算出できません。目標室温を入力してください。",
            )

    forecast = await fetch_forecast()

    return build_response(
        current_temp=current_temp,
        target_temp=target_temp,
        forecast=forecast,
        tatami_size=profile.tatami_size,
        aircon_kw=profile.aircon_cooling_kw,
        insulation_level=profile.insulation_level,
        occupant_load=profile.occupant_load,
    )

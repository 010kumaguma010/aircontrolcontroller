from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class HourlyForecast(BaseModel):
    time: str
    temperature: float
    humidity: Optional[float] = None
    efficiency: str  # excellent / good / fair / poor


class StatusResponse(BaseModel):
    outside_temp_forecast: list[HourlyForecast]
    current_room_temp: Optional[float]
    current_humidity: Optional[float]
    observed_at: Optional[str]
    is_stale: bool
    ha_error: Optional[str] = None
    recommended_target_temp: Optional[float] = None


class ProfileResponse(BaseModel):
    room_name: str
    tatami_size: float
    insulation_level: str
    aircon_cooling_kw: float
    occupant_load: float
    updated_at: Optional[str]


class ProfileUpdate(BaseModel):
    room_name: str
    tatami_size: float
    insulation_level: Literal["木造", "RC造", "その他"]
    aircon_cooling_kw: float
    occupant_load: float


class CurvePoint(BaseModel):
    time: str
    predicted_temp: float


class SimulateRequest(BaseModel):
    # 未指定の場合、現在の室内湿度から不快指数(DI)ベースでおすすめ値を算出して使用する
    target_temp: Optional[float] = None


class SimulateResponse(BaseModel):
    start_time: Optional[str]
    strong_duration_min: Optional[float]
    switch_time: Optional[str]
    used_target_temp: Optional[float]
    target_reached: Optional[bool]
    predicted_curve: list[CurvePoint]
    warning: Optional[str]

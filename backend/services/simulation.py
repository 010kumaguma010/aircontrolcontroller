from datetime import datetime, timedelta
from typing import Optional
from models import CurvePoint, SimulateResponse

# 断熱性係数 (kW/畳/℃) - 仮値、実測比較で補正
INSULATION_COEF = 0.012
# 熱容量係数 (kJ/℃/畳)
THERMAL_MASS_PER_TATAMI = 60
# 到着予定時刻より何分前に目標室温へ到達させ、維持運転へ切り替えるか（設計書2.6のワイヤーフレーム例に合わせた固定値）
ARRIVAL_BUFFER_MIN = 15

INSULATION_LEVEL_COEF = {
    "木造": 1.0,
    "RC造": 0.7,
    "その他": 0.9,
}


def simulate(
    current_temp: float,
    target_temp: float,
    outside_temp: float,
    tatami_size: float,
    aircon_kw: float,
    insulation_level: str,
    occupant_load: float,
) -> dict:
    coef_multiplier = INSULATION_LEVEL_COEF.get(insulation_level, 1.0)
    effective_insulation = INSULATION_COEF * coef_multiplier

    heat_intrusion = effective_insulation * tatami_size * (outside_temp - target_temp)
    effective_cooling = aircon_kw - heat_intrusion - occupant_load

    if effective_cooling <= 0:
        return {"warning": "目標室温への到達は困難です（外気温が高すぎる、またはエアコン能力不足）"}

    thermal_mass = THERMAL_MASS_PER_TATAMI * tatami_size
    heat_to_remove = thermal_mass * (current_temp - target_temp)

    if heat_to_remove <= 0:
        return {"duration_min": 0.0, "warning": None}

    # kJ ÷ kW ÷ 60 = 分
    duration_min = heat_to_remove / effective_cooling / 60

    if duration_min > 480:
        return {"warning": "計算上、到達に8時間以上かかります。目標室温や到着時刻を見直してください"}

    return {"duration_min": duration_min, "warning": None}


def build_response(
    current_temp: float,
    target_temp: float,
    arrival_time_str: str,
    outside_temp: float,
    tatami_size: float,
    aircon_kw: float,
    insulation_level: str,
    occupant_load: float,
) -> SimulateResponse:
    result = simulate(current_temp, target_temp, outside_temp, tatami_size, aircon_kw, insulation_level, occupant_load)

    if result.get("warning") and "duration_min" not in result:
        return SimulateResponse(
            start_time=None,
            strong_duration_min=None,
            switch_time=None,
            predicted_curve=[],
            warning=result["warning"],
        )

    duration_min: float = result["duration_min"]

    today = datetime.now().date()
    arrival_dt = datetime.strptime(f"{today} {arrival_time_str}", "%Y-%m-%d %H:%M")
    # 到着予定時刻の ARRIVAL_BUFFER_MIN 分前に目標室温へ到達させ、以降は維持運転にする
    switch_dt = arrival_dt - timedelta(minutes=ARRIVAL_BUFFER_MIN)
    start_dt = switch_dt - timedelta(minutes=duration_min)

    curve = _build_curve(current_temp, target_temp, start_dt, duration_min)

    return SimulateResponse(
        start_time=start_dt.strftime("%H:%M"),
        strong_duration_min=round(duration_min, 1),
        switch_time=switch_dt.strftime("%H:%M"),
        predicted_curve=curve,
        warning=result.get("warning"),
    )


def _build_curve(
    current_temp: float,
    target_temp: float,
    start_dt: datetime,
    duration_min: float,
) -> list[CurvePoint]:
    points: list[CurvePoint] = []
    steps = max(int(duration_min), 1)
    for i in range(steps + 1):
        progress = i / steps if steps > 0 else 1.0
        temp = current_temp - (current_temp - target_temp) * progress
        t = start_dt + timedelta(minutes=i)
        points.append(CurvePoint(time=t.strftime("%H:%M"), predicted_temp=round(temp, 1)))
    return points

from datetime import datetime, timedelta, time as dt_time
from typing import Optional
from models import CurvePoint, HourlyForecast, SimulateResponse
from services.openmeteo import get_temp_at_hour

# 断熱性係数 (kW/畳/℃) - 仮値、実測比較で補正
INSULATION_COEF = 0.012
# 熱容量係数 (kJ/℃/畳)
THERMAL_MASS_PER_TATAMI = 60

INSULATION_LEVEL_COEF = {
    "木造": 1.0,
    "RC造": 0.7,
    "その他": 0.9,
}

# 目標室温おすすめ値の算出に使う不快指数(DI)の目標値（「快い」〜「やや暑い」境界付近）
DI_TARGET = 74.0
RECOMMENDED_TEMP_MIN = 24.0
RECOMMENDED_TEMP_MAX = 29.0


def recommend_target_temp(room_humidity: Optional[float]) -> Optional[float]:
    """不快指数(DI) = 0.81T + 0.01RH(0.99T-14.3) + 46.3 が DI_TARGET になる室温Tを逆算する。
    室内湿度が取得できない場合はおすすめ値を算出しない。"""
    if room_humidity is None:
        return None

    h = room_humidity
    denom = 0.81 + 0.0099 * h
    if denom <= 0:
        return None

    temp = (DI_TARGET - 46.3 + 0.143 * h) / denom
    temp = max(RECOMMENDED_TEMP_MIN, min(RECOMMENDED_TEMP_MAX, temp))
    return round(temp * 2) / 2


def _good_windows(forecast: list[HourlyForecast]) -> list[tuple[int, int]]:
    """効率が excellent/good な時間帯を連続区間（開始時, 終了時）のリストで返す"""
    windows: list[tuple[int, int]] = []
    in_window = False
    start_hour = 0
    hours = [(datetime.fromisoformat(f.time).hour, f.efficiency) for f in forecast]

    for i, (hour, efficiency) in enumerate(hours):
        good = efficiency in ("excellent", "good")
        if good and not in_window:
            in_window = True
            start_hour = hour
        elif not good and in_window:
            in_window = False
            windows.append((start_hour, hours[i - 1][0]))

    if in_window and hours:
        windows.append((start_hour, hours[-1][0]))

    return windows


def _best_window(forecast: list[HourlyForecast]) -> Optional[tuple[int, int]]:
    windows = _good_windows(forecast)
    if not windows:
        return None
    return max(windows, key=lambda w: w[1] - w[0])


def _physical_duration(
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
        return {"warning": "計算上、到達に8時間以上かかります。目標室温を見直してください"}

    return {"duration_min": duration_min, "warning": None}


def build_response(
    current_temp: float,
    target_temp: float,
    forecast: list[HourlyForecast],
    tatami_size: float,
    aircon_kw: float,
    insulation_level: str,
    occupant_load: float,
    now: Optional[datetime] = None,
) -> SimulateResponse:
    now = now or datetime.now()
    empty = lambda warning: SimulateResponse(
        start_time=None,
        strong_duration_min=None,
        switch_time=None,
        used_target_temp=target_temp,
        target_reached=None,
        predicted_curve=[],
        warning=warning,
    )

    window = _best_window(forecast)
    if window is None:
        # 効率の良い時間帯が本日ない場合は、今から開始した場合の参考値を返す
        start_dt = now
        window_end_dt = None
        info_prefix = "本日は効率の良い時間帯がありません。参考として今から開始した場合の計算結果です。"
    else:
        win_start_hour, win_end_hour = window
        today = now.date()
        win_start_dt = datetime.combine(today, dt_time(win_start_hour, 0))
        window_end_dt = datetime.combine(today, dt_time(win_end_hour, 59, 59))

        if now > window_end_dt:
            return empty("本日の効率的な時間帯はすでに終了しました。次の好機は明日以降です")

        start_dt = max(now, win_start_dt)
        info_prefix = None

    outside_temp = get_temp_at_hour(forecast, start_dt.hour)

    result = _physical_duration(
        current_temp=current_temp,
        target_temp=target_temp,
        outside_temp=outside_temp,
        tatami_size=tatami_size,
        aircon_kw=aircon_kw,
        insulation_level=insulation_level,
        occupant_load=occupant_load,
    )

    if result.get("warning") and "duration_min" not in result:
        return empty(result["warning"])

    duration_min: float = result["duration_min"]

    if window is not None:
        available_min = (window_end_dt - start_dt).total_seconds() / 60
    else:
        available_min = duration_min

    actual_duration = min(duration_min, available_min)
    switch_dt = start_dt + timedelta(minutes=actual_duration)
    target_reached = duration_min <= available_min

    curve = _build_curve(current_temp, target_temp, start_dt, duration_min, actual_duration)

    warning = None
    if not target_reached:
        warning = (
            f"効率的な時間帯内には目標室温へ到達できません（到達まで約{duration_min:.0f}分必要ですが、"
            f"好機は{switch_dt.strftime('%H:%M')}に終了します）。目標室温を上げるか、日を改めての検討を推奨します"
        )
    if info_prefix:
        warning = f"{info_prefix} {warning}" if warning else info_prefix

    return SimulateResponse(
        start_time=start_dt.strftime("%H:%M"),
        strong_duration_min=round(actual_duration, 1),
        switch_time=switch_dt.strftime("%H:%M"),
        used_target_temp=target_temp,
        target_reached=target_reached,
        predicted_curve=curve,
        warning=warning,
    )


def _build_curve(
    current_temp: float,
    target_temp: float,
    start_dt: datetime,
    duration_min: float,
    actual_duration_min: float,
) -> list[CurvePoint]:
    points: list[CurvePoint] = []
    steps = max(int(actual_duration_min), 1)
    for i in range(steps + 1):
        elapsed = min(i, actual_duration_min)
        progress = elapsed / duration_min if duration_min > 0 else 1.0
        temp = current_temp - (current_temp - target_temp) * progress
        t = start_dt + timedelta(minutes=i)
        points.append(CurvePoint(time=t.strftime("%H:%M"), predicted_temp=round(temp, 1)))
    return points

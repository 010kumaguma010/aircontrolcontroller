import { useState, useEffect, useCallback } from "react";
import { api } from "./api/client";
import type { StatusData, ProfileData, SimulateResult } from "./api/client";
import StatusCard from "./components/StatusCard";
import SimulationPanel from "./components/SimulationPanel";
import TempChart from "./components/TempChart";
import HourlyBar from "./components/HourlyBar";
import AutoComment from "./components/AutoComment";
import StatsSummary from "./components/StatsSummary";
import ProfileSettings from "./components/ProfileSettings";

export default function App() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [simResult, setSimResult] = useState<SimulateResult | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingSimulate, setLoadingSimulate] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const [s, p] = await Promise.all([api.getStatus(), api.getProfile()]);
      setStatus(s);
      setProfile(p);
    } catch (e) {
      setStatusError(String(e));
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSimulate = async (targetTemp: number | null) => {
    setLoadingSimulate(true);
    try {
      const result = await api.simulate(targetTemp);
      setSimResult(result);
    } catch (e) {
      let warning = "シミュレーションに失敗しました";
      try {
        const msg = e instanceof Error ? e.message : String(e);
        const parsed = JSON.parse(msg);
        if (parsed.detail) warning = parsed.detail;
      } catch {
        if (e instanceof Error) warning = e.message;
      }
      setSimResult({
        start_time: null,
        strong_duration_min: null,
        switch_time: null,
        used_target_temp: null,
        target_reached: null,
        predicted_curve: [],
        warning,
      });
    } finally {
      setLoadingSimulate(false);
    }
  };

  const forecast = status?.outside_temp_forecast ?? [];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              ❄️ 冷房プランナー
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {profile?.room_name ?? "—"} / {today}
            </p>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            {loadingStatus ? "更新中" : "更新"}
          </button>
        </header>

        {/* Room status */}
        <StatusCard status={status} loading={loadingStatus} error={statusError} />

        {/* Auto comment */}
        {forecast.length > 0 && <AutoComment forecast={forecast} />}

        {/* Stats */}
        {forecast.length > 0 && <StatsSummary forecast={forecast} />}

        {/* Simulation */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-2">予冷シミュレーション</h2>
          <SimulationPanel
            onSimulate={handleSimulate}
            result={simResult}
            loading={loadingSimulate}
            hasRoomTemp={status?.current_room_temp !== null && status?.current_room_temp !== undefined}
            recommendedTargetTemp={status?.recommended_target_temp ?? null}
          />
        </section>

        {/* Chart */}
        {forecast.length > 0 && (
          <TempChart
            forecast={forecast}
            predictedCurve={simResult?.predicted_curve ?? []}
            targetTemp={simResult?.used_target_temp ?? status?.recommended_target_temp ?? 26.0}
          />
        )}

        {/* Hourly bar */}
        {forecast.length > 0 && <HourlyBar forecast={forecast} />}

        {/* Profile */}
        <ProfileSettings profile={profile} onUpdate={setProfile} />

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pb-4">
          気象データ: Open-Meteo / 室温: Home Assistant (Nature Remo)
        </footer>
      </div>
    </div>
  );
}

import type { HourlyForecast } from "../api/client";

interface Props {
  forecast: HourlyForecast[];
}

export default function StatsSummary({ forecast }: Props) {
  if (forecast.length === 0) return null;

  const temps = forecast.map((f) => f.temperature);
  const minTemp = Math.min(...temps).toFixed(1);
  const maxTemp = Math.max(...temps).toFixed(1);
  const efficientHours = forecast.filter(
    (f) => f.efficiency === "excellent" || f.efficiency === "good"
  ).length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="最低気温" value={`${minTemp}℃`} color="text-blue-300" />
      <StatCard label="最高気温" value={`${maxTemp}℃`} color="text-red-300" />
      <StatCard label="高効率時間" value={`${efficientHours}時間`} color="text-emerald-300" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

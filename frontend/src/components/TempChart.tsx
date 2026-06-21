import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { HourlyForecast, CurvePoint } from "../api/client";

const EFFICIENCY_COLOR: Record<string, string> = {
  excellent: "#34d399",
  good: "#fbbf24",
  fair: "#fb923c",
  poor: "#f87171",
};

interface Props {
  forecast: HourlyForecast[];
  predictedCurve: CurvePoint[];
  targetTemp: number;
}

function formatHour(time: string) {
  const t = new Date(time);
  return `${t.getHours()}時`;
}

export default function TempChart({ forecast, predictedCurve, targetTemp }: Props) {
  const forecastData = forecast.map((f) => ({
    label: formatHour(f.time),
    time: f.time,
    outside: f.temperature,
    efficiency: f.efficiency,
    dot: EFFICIENCY_COLOR[f.efficiency],
  }));

  // curveMap: hour number → predicted temp (first point of each hour)
  const curveMap = new Map<number, number>();
  for (const p of predictedCurve) {
    const h = parseInt(p.time.split(":")[0], 10);
    if (!curveMap.has(h)) curveMap.set(h, p.predicted_temp);
  }

  const merged = forecastData.map((d) => ({
    ...d,
    predicted: curveMap.get(new Date(d.time).getHours()) ?? null,
  }));

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">外気温・室温推移</h2>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={merged} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            domain={["auto", "auto"]}
            unit="℃"
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8", fontSize: 12 }}
            itemStyle={{ color: "#e2e8f0", fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
          />
          <ReferenceLine
            y={targetTemp}
            stroke="#60a5fa"
            strokeDasharray="4 2"
            label={{ value: `目標${targetTemp}℃`, fill: "#60a5fa", fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="outside"
            name="外気温"
            fill="#1e3a5f"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          {predictedCurve.length > 0 && (
            <Line
              type="monotone"
              dataKey="predicted"
              name="予測室温"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3 flex-wrap">
        {Object.entries(EFFICIENCY_COLOR).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-400">
              {key === "excellent" ? "最高 (〜24℃)"
                : key === "good" ? "良好 (〜27℃)"
                : key === "fair" ? "普通 (〜31℃)"
                : "非効率 (32℃〜)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

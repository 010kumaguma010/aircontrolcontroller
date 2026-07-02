import type { HourlyForecast } from "../api/client";

const COLORS: Record<string, string> = {
  excellent: "bg-emerald-400",
  good: "bg-amber-400",
  fair: "bg-orange-400",
  poor: "bg-red-400",
};

interface Props {
  forecast: HourlyForecast[];
}

export default function HourlyBar({ forecast }: Props) {
  const now = new Date().getHours();

  return (
    <div className="bg-slate-800 rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">時間別効率</h2>
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {forecast.map((f) => {
          const hour = new Date(f.time).getHours();
          const isNow = hour === now;
          return (
            <div key={f.time} className="flex flex-col items-center flex-1 min-w-[26px]">
              <div
                className={`w-full rounded-sm ${COLORS[f.efficiency]} ${isNow ? "ring-2 ring-white" : ""}`}
                style={{ height: 40 }}
                title={`${hour}時: ${f.temperature}℃`}
              />
              <span className={`text-[10px] mt-1 ${isNow ? "text-white font-bold" : "text-slate-500"}`}>
                {hour % 3 === 0 ? `${hour}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

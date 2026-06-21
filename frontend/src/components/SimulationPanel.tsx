import { useState } from "react";
import type { SimulateResult } from "../api/client";

interface Props {
  onSimulate: (targetTemp: number, arrivalTime: string) => Promise<void>;
  result: SimulateResult | null;
  loading: boolean;
  hasRoomTemp: boolean;
}

export default function SimulationPanel({ onSimulate, result, loading, hasRoomTemp }: Props) {
  const [targetTemp, setTargetTemp] = useState(26.0);
  const [arrivalTime, setArrivalTime] = useState("18:30");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate(targetTemp, arrivalTime);
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-5 space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">目標室温</label>
            <div className="relative">
              <input
                type="number"
                min={18}
                max={30}
                step={0.5}
                value={targetTemp}
                onChange={(e) => setTargetTemp(Number(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-right pr-8 text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">℃</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">到着予定時刻</label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !hasRoomTemp}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          {loading ? "計算中…" : result ? "再計算" : "計算する"}
        </button>

        {!hasRoomTemp && (
          <p className="text-xs text-amber-400 text-center">
            室温が取得できないためシミュレーション不可
          </p>
        )}
      </form>

      {result && (
        <div className="border-t border-slate-700 pt-4 space-y-3">
          {result.warning ? (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
              <p className="text-red-300 text-sm">{result.warning}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <ResultItem label="運転開始" value={result.start_time ?? "—"} unit="" accent="blue" />
                <ResultItem label="強運転" value={`${result.strong_duration_min?.toFixed(0) ?? "—"}`} unit="分" accent="purple" />
                <ResultItem label="維持切替" value={result.switch_time ?? "—"} unit="" accent="teal" />
              </div>
              <p className="text-xs text-slate-500 text-center">
                ※ 簡易計算のため目安です
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultItem({ label, value, unit, accent }: {
  label: string;
  value: string;
  unit: string;
  accent: "blue" | "purple" | "teal";
}) {
  const colors = {
    blue: "text-blue-300",
    purple: "text-purple-300",
    teal: "text-teal-300",
  };
  return (
    <div className="bg-slate-700/50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colors[accent]}`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

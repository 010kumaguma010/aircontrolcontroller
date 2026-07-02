import { useState, useEffect } from "react";
import type { SimulateResult } from "../api/client";

interface Props {
  onSimulate: (targetTemp: number | null) => Promise<void>;
  result: SimulateResult | null;
  loading: boolean;
  hasRoomTemp: boolean;
  recommendedTargetTemp: number | null;
}

export default function SimulationPanel({
  onSimulate,
  result,
  loading,
  hasRoomTemp,
  recommendedTargetTemp,
}: Props) {
  const [targetTemp, setTargetTemp] = useState<number | null>(null);
  const [useRecommended, setUseRecommended] = useState(true);

  // 湿度からのおすすめ値が届いたら、ユーザーが手動入力していない限り初期値として反映する
  useEffect(() => {
    if (useRecommended && recommendedTargetTemp !== null) {
      setTargetTemp(recommendedTargetTemp);
    }
  }, [recommendedTargetTemp, useRecommended]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate(useRecommended ? null : targetTemp);
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-5 space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-slate-400">目標室温</label>
            {recommendedTargetTemp !== null && (
              <button
                type="button"
                onClick={() => setUseRecommended((v) => !v)}
                className="text-xs text-teal-400 hover:text-teal-300"
              >
                {useRecommended ? `おすすめ値 ${recommendedTargetTemp.toFixed(1)}℃使用中` : "おすすめ値を使う"}
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              min={18}
              max={30}
              step={0.5}
              value={targetTemp ?? ""}
              onChange={(e) => {
                setUseRecommended(false);
                setTargetTemp(e.target.value === "" ? null : Number(e.target.value));
              }}
              placeholder={recommendedTargetTemp !== null ? undefined : "例: 26.0"}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-right pr-8 text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">℃</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            現在の室内湿度から不快指数ベースで算出したおすすめ値です。手動入力でも上書きできます。
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !hasRoomTemp || (!useRecommended && targetTemp === null)}
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
          {result.warning && !result.start_time ? (
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
              {result.warning && (
                <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-3">
                  <p className="text-amber-300 text-sm">{result.warning}</p>
                </div>
              )}
              <p className="text-xs text-slate-500 text-center">
                ※ 簡易計算のため目安です。切替時刻は本日最長の高効率時間帯の終了時刻を基準にしています
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

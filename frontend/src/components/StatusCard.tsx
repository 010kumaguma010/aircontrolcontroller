import type { StatusData } from "../api/client";

interface Props {
  status: StatusData | null;
  loading: boolean;
  error: string | null;
}

function formatObservedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function StatusCard({ status, loading, error }: Props) {
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-32 mb-3" />
        <div className="h-10 bg-slate-700 rounded w-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-2xl p-5">
        <p className="text-red-400 text-sm">データ取得エラー: {error}</p>
      </div>
    );
  }

  if (!status) return null;

  const hasRoom = status.current_room_temp !== null;

  return (
    <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {hasRoom ? (
          <div>
            <p className="text-xs text-slate-400 mb-1">現在室温</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-blue-300">
                {status.current_room_temp?.toFixed(1)}
              </span>
              <span className="text-xl text-slate-400 pb-1">℃</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400 mb-1">現在室温</p>
            <p className="text-slate-500 text-sm mt-2">
              {status.ha_error ?? "取得不可"}
            </p>
          </div>
        )}

        {status.current_humidity !== null && (
          <div>
            <p className="text-xs text-slate-400 mb-1">湿度</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-semibold text-teal-300">
                {status.current_humidity?.toFixed(0)}
              </span>
              <span className="text-lg text-slate-400 pb-0.5">%</span>
            </div>
          </div>
        )}
      </div>

      {status.observed_at && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            取得時刻: {formatObservedAt(status.observed_at)}
          </span>
          {status.is_stale && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded px-2 py-0.5">
              データが古い
            </span>
          )}
        </div>
      )}
    </div>
  );
}

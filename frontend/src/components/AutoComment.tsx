import type { HourlyForecast } from "../api/client";

interface Props {
  forecast: HourlyForecast[];
}

function getGoodWindows(forecast: HourlyForecast[]): { start: number; end: number }[] {
  const windows: { start: number; end: number }[] = [];
  let inWindow = false;
  let start = 0;

  forecast.forEach((f, i) => {
    const isGood = f.efficiency === "excellent" || f.efficiency === "good";
    if (isGood && !inWindow) {
      inWindow = true;
      start = new Date(f.time).getHours();
    } else if (!isGood && inWindow) {
      inWindow = false;
      windows.push({ start, end: new Date(forecast[i - 1].time).getHours() });
    }
  });
  if (inWindow && forecast.length > 0) {
    windows.push({ start, end: new Date(forecast[forecast.length - 1].time).getHours() });
  }
  return windows;
}

export default function AutoComment({ forecast }: Props) {
  if (forecast.length === 0) return null;

  const windows = getGoodWindows(forecast);
  const now = new Date().getHours();

  let icon = "❄️";
  let message = "";

  if (windows.length === 0) {
    icon = "🌡️";
    message = "本日は一日中気温が高め。早い時間帯での予冷を推奨します。";
  } else {
    const topWindow = windows.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));

    if (now >= topWindow.start && now <= topWindow.end) {
      icon = "✅";
      message = `今が好機（〜${topWindow.end}時）。一気に冷やすタイミングです。`;
    } else if (topWindow.start > now) {
      icon = "⏰";
      message = `${topWindow.start}時〜${topWindow.end}時が好機。その時間に先行冷房を推奨します。`;
    } else {
      const future = windows.find((w) => w.start > now);
      if (future) {
        icon = "⏰";
        message = `${future.start}時以降に次のチャンスがあります。`;
      } else {
        icon = "🕐";
        message = "今日の好機は過ぎました。夕方〜夜間の気温低下後に再冷房を検討してください。";
      }
    }
  }

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-2xl p-4 flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm text-slate-200 leading-relaxed">{message}</p>
    </div>
  );
}

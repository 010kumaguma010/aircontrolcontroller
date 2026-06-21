const BASE = "/api";

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number | null;
  efficiency: "excellent" | "good" | "fair" | "poor";
}

export interface StatusData {
  outside_temp_forecast: HourlyForecast[];
  current_room_temp: number | null;
  current_humidity: number | null;
  observed_at: string | null;
  is_stale: boolean;
  ha_error: string | null;
}

export interface ProfileData {
  room_name: string;
  tatami_size: number;
  insulation_level: string;
  aircon_cooling_kw: number;
  occupant_load: number;
  updated_at: string | null;
}

export interface CurvePoint {
  time: string;
  predicted_temp: number;
}

export interface SimulateResult {
  start_time: string | null;
  strong_duration_min: number | null;
  switch_time: string | null;
  predicted_curve: CurvePoint[];
  warning: string | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getStatus: () => get<StatusData>("/status"),
  getProfile: () => get<ProfileData>("/profile"),
  updateProfile: (data: Omit<ProfileData, "updated_at">) =>
    post<ProfileData>("/profile", data),
  simulate: (target_temp: number, arrival_time: string) =>
    post<SimulateResult>("/simulate", { target_temp, arrival_time }),
};

import { useState, useEffect } from "react";
import type { ProfileData } from "../api/client";
import { api } from "../api/client";

interface Props {
  profile: ProfileData | null;
  onUpdate: (p: ProfileData) => void;
}

export default function ProfileSettings({ profile, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<ProfileData, "updated_at"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const { updated_at: _, ...rest } = profile;
      setForm(rest);
    }
  }, [profile]);

  if (!form) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateProfile(form);
      onUpdate(updated);
      setOpen(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-sm font-semibold text-slate-300">部屋プロファイル設定</span>
        <span className="text-slate-500 text-lg">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-700 pt-4">
          <Field
            label="部屋名"
            value={form.room_name}
            onChange={(v) => setForm({ ...form, room_name: v })}
          />
          <Field
            label="畳数"
            type="number"
            value={String(form.tatami_size)}
            onChange={(v) => setForm({ ...form, tatami_size: Number(v) })}
            unit="畳"
          />
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">断熱性</label>
            <select
              value={form.insulation_level}
              onChange={(e) => setForm({ ...form, insulation_level: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="木造">木造</option>
              <option value="RC造">RC造</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <Field
            label="エアコン冷房能力"
            type="number"
            value={String(form.aircon_cooling_kw)}
            onChange={(v) => setForm({ ...form, aircon_cooling_kw: Number(v) })}
            unit="kW"
            step="0.1"
          />
          <Field
            label="室内発熱（人+機器）"
            type="number"
            value={String(form.occupant_load)}
            onChange={(v) => setForm({ ...form, occupant_load: Number(v) })}
            unit="kW"
            step="0.1"
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold rounded-xl py-2.5 transition-colors"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  unit,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  unit?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

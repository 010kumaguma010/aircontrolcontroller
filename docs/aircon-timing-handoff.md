# 冷房タイミングガイド（内部版） — 実装引き継ぎサマリー

作成日: 2026-06-19（2026-07-02改訂: モデルを効率窓ベースに全面変更）
対象ドキュメント: `aircon-timing-spec-internal.md`（要件定義・基本設計、確定済み）

このファイルは、別セッション/別ツールで実装を始める際に必要な情報を一箇所にまとめたものです。詳細は本体の設計書を参照してください。

---

## 1. 何を作るか（1行で）

Home Assistant経由のNature Remo実測値 ＋ Open-Meteo外気温予報を使い、ワンルームの冷房を「本日の効率窓（外気温が低く効率の良い時間帯）を使って、いつ強く運転開始し、いつ維持運転に切り替えるべきか」を計算して表示する、自分専用のWebツール。到着予定時刻からの逆算は行わない（廃止済み）。

## 2. システム構成

```
スマホ/PCブラウザ
  ↓ HTTPS (Cloudflare Access, Entra ID認証)
Cloudflare Tunnel（既存のkumaguma基盤を流用）
  ↓
home lab Dockerホスト (192.168.100.30)
  ├─ フロントエンド: React + Vite
  └─ バックエンド: FastAPI (Python)
       ├─ Open-Meteo API（外気温予報、認証不要）
       ├─ Home Assistant REST API（室温・湿度、Long-Lived Token使用）
       └─ SQLite（部屋プロファイル、単一固定レコード）
```

- 新規Dockerコンテナとして既存ホストに追加。**他コンテナとはネットワーク分離**（専用docker network）
- 外部公開しない。Cloudflare Access配下のみ
- LLM API等の課金サービスは使わない（完全無料運用）

## 3. 必要な環境変数 / シークレット

| 変数名 | 用途 | 備考 |
|---|---|---|
| `HA_BASE_URL` | Home AssistantのベースURL | 例: `http://192.168.100.xx:8123` |
| `HA_LONG_LIVED_TOKEN` | HA REST API認証用トークン | `.env`管理、`.gitignore`必須。可能ならDocker secrets検討（優先度低） |
| `HA_ROOM_TEMP_ENTITY_ID` | 室温センサーのentity_id | Nature Remo連携済みのHA上で確認が必要 |
| `HA_ROOM_HUMIDITY_ENTITY_ID` | 湿度センサーのentity_id | 同上 |

**実装前に確認が必要なこと：** HA上でNature Remoの室温/湿度センサーのentity_idを確認しておく（設計書4章で唯一残っていた確認系タスク）。

## 4. バックエンドAPI仕様（実装済み）

```
GET  /api/status
  → { outside_temp_forecast: [...], current_room_temp, current_humidity, observed_at,
      is_stale, ha_error, recommended_target_temp }

GET  /api/profile
  → { room_name, tatami_size, insulation_level, aircon_cooling_kw, occupant_load, updated_at }

POST /api/profile
  Body: { room_name, tatami_size, insulation_level, aircon_cooling_kw, occupant_load }
  → 更新後のプロファイルを返す

POST /api/simulate
  Body: { target_temp }  ※ 省略可。省略時は室内湿度からのおすすめ値を使用
  → {
      start_time,
      strong_duration_min,
      switch_time,
      used_target_temp,
      target_reached,
      predicted_curve: [{ time, predicted_temp }],
      warning: null | "到達困難" | "本日の効率窓は終了" | "効率窓内に到達不可" など
    }
```

到着予定時刻（`arrival_time`）は廃止済み。効率窓（本日最長の高効率連続時間帯）を検出し、運転開始・切替時刻を決定する。

## 5. 予冷シミュレーションの計算ロジック（実装済みロジックのサマリー）

実装は `backend/services/simulation.py` を参照。要点：

```python
# 単位: kW, kJ, ℃, 分 を明示的に統一

INSULATION_COEF = 0.012        # kW / 畳 / ℃
THERMAL_MASS_PER_TATAMI = 60    # kJ / ℃ / 畳
INSULATION_LEVEL_COEF = {"木造": 1.0, "RC造": 0.7, "その他": 0.9}

# Step A: 当日の外気温予報からexcellent/good連続区間（効率窓）を検出し、最長のものを採用
# Step B: 運転開始時刻を決定
#   - 効率窓の中にいる → 今すぐ開始
#   - 効率窓がこれから来る → 効率窓の開始時刻
#   - 効率窓が既に終了 → シミュレーション不可（警告）
#   - 効率窓が本日存在しない → 参考値として今から開始した場合を計算

def physical_duration(current_temp, target_temp, outside_temp, tatami_size, aircon_kw, insulation_level, occupant_load):
    coef = INSULATION_LEVEL_COEF.get(insulation_level, 1.0)
    heat_intrusion = INSULATION_COEF * coef * tatami_size * (outside_temp - target_temp)
    effective_cooling = aircon_kw - heat_intrusion - occupant_load  # occupant_loadはプロファイルの保存値

    if effective_cooling <= 0:
        return {"warning": "目標室温への到達は困難です（外気温が高すぎる、またはエアコン能力不足）"}

    thermal_mass = THERMAL_MASS_PER_TATAMI * tatami_size
    heat_to_remove = thermal_mass * (current_temp - target_temp)
    duration_min = heat_to_remove / effective_cooling / 60

    if duration_min > 480:
        return {"warning": "計算上、到達に8時間以上かかります。目標室温を見直してください"}

    return {"duration_min": duration_min, "warning": None}

# Step D: 切替時刻 = min(効率窓の終了時刻, 運転開始時刻 + 到達時間)
#   到達時間の方が長ければ target_reached=False として警告
```

**目標室温おすすめ値（不快指数DIベース）**:
```python
DI_TARGET = 74.0
def recommend_target_temp(room_humidity):
    h = room_humidity
    t = (DI_TARGET - 46.3 + 0.143 * h) / (0.81 + 0.0099 * h)
    return clamp(round(t * 2) / 2, 24.0, 29.0)
```

**検証済みの数値例**：
```
入力: 畳数14, 外気温33℃, 目標26℃, 現在29.5℃, エアコン4.0kW
期待値: 到達時間 ≈ 19.4分
```

## 6. UI要件（要点のみ）

- 現在室温・湿度・**取得時刻（タイムスタンプ）**を表示
- 取得値が**30分以上前**なら「データが古い」と警告表示
- 目標室温を入力（未入力時はおすすめ値を使用、上書き可）→ [計算する/再計算]ボタン。到着予定時刻の入力欄は廃止
- 結果表示：推奨運転開始時刻、強運転継続時間、維持切替時刻
- グラフ：外気温×室温の推移（予測ライン／実測ライン重ね表示）
- シミュレーション結果に「簡易計算のため目安です」の注記
- 部屋プロファイル設定UI（ワンルーム単一、複数部屋管理は作らない）

## 7. 初期スコープ外（作らないもの）

- エアコンの自動制御（HA経由のON/OFF操作）
- 複数部屋・複数プロファイル管理
- LLM/AI連携によるアドバイス文生成
- 暖房（冬季）対応
- 学習による係数自動補正（最初は仮置き係数固定で運用）

## 8. 実装時に決めればよい事項（設計書では未確定のまま、ブロッカーではない）

- F-08（実測比較）のポーリング間隔・スケジューラ方式（APScheduler等の技術選定）
- 実効冷房能力≦0 と 480分超 の警告文言を分けるかどうか（最初は同じ文言でも可）
- Docker secretsを使うか環境変数のみにするか（環境変数のみでも十分という判断もあり）

## 9. 参照ドキュメント

- `aircon-timing-spec-internal.md` … 本サマリーの元になっている正式な要件定義・基本設計書。詳細はこちらを参照
- `aircon-timing-spec-external.md` … 外部公開版（後続フェーズ）。内部版の検証結果（係数等）をこちらにも反映予定

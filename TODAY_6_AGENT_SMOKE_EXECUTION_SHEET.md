# VIVA HAIR 今日 6-Agent Smoke 執行表

## 使用方式
- 今日全部 agent 先跑真資料 smoke，不開新功能。
- 每條 case 都要填：
  - `staff_id`
  - `service_id`
  - `date`
  - 如有需要再填 `location_id` / `resource_id`
- 每次後台修改設定後，固定流程：
  1. 儲存
  2. refresh 後台
  3. 打開前台 booking 頁
  4. 檢查 datepicker 狀態
  5. 檢查 `month-summary.status / reason`
  6. 如可預約，再檢查時間下拉

## Severity 規則
- `pass`：結果完全符合預期
- `P3`：純 UI / 文案 / 排版問題
- `P2`：前後台結果大致正確，但提示、cache、或顯示層有誤導
- `P1`：後台儲存成功，但前台結果不對照
- `P0`：booking truth / auth / data corruption

## Gate 規則
- 只有少量 `P2/P3`：`Conditional GO`
- 全綠：`GO`
- 任一 `P0/P1`：`NO-GO`

---

## Agent 1：Weekly Schedule 上班日
- Owner:
- `staff_id`:
- `service_id`:
- `date`:
- 後台設定：
  - 上班時間：
  - 下班時間：
  - 無休息 / 無休假 / 無封鎖：
- 預期：
  - `month-summary.status = available`
  - 前台日期可選
  - 時間下拉有正確時段
  - 最後可約時段跟下班時間一致
- 實際：
  - `month-summary.status`:
  - `month-summary.reason`:
  - `availableCount`:
  - slots:
  - 前台日期狀態：
  - 前台時間下拉狀態：
- Refresh 後結果：
- Severity:
- Follow-up:

## Agent 2：Weekly Schedule 休息日
- Owner:
- `staff_id`:
- `service_id`:
- `date`:
- 後台設定：
  - 休息日 / 無排班 / 假期：
- 預期：
  - `month-summary.status = off`
  - 前台日期灰色不可選
  - 不應再打單日 availability
- 實際：
  - `month-summary.status`:
  - `month-summary.reason`:
  - 前台日期狀態：
  - 是否仍可點：
  - 是否仍載入時段：
- Refresh 後結果：
- Severity:
- Follow-up:

## Agent 3：有班但已滿 / 資源滿
- Owner:
- `staff_id`:
- `service_id`:
- `date`:
- `resource_id`:
- 後台設定：
  - 上班時間：
  - 已有 booking / resource full：
- 預期：
  - `month-summary.status = full`
  - 前台顯示 `已滿`
  - 不可誤判成 `休息`
  - 文案可解釋
- 實際：
  - `month-summary.status`:
  - `month-summary.reason`:
  - `availableCount`:
  - 前台日期狀態：
  - 前台畫面訊息：
- Refresh 後結果：
- Severity:
- Follow-up:

## Agent 4：日期覆蓋，休息改上班
- Owner:
- `staff_id`:
- `service_id`:
- `date`:
- 後台設定：
  - 原本 weekly 狀態：
  - override 內容：
  - override 後上班時間：
  - override 後下班時間：
- 預期：
  - 原本 `off` 的日期變成 `available` 或 `full`
  - 前台不再顯示休息
  - 如有位可見時段
- 實際：
  - `month-summary.status`:
  - `month-summary.reason`:
  - slots:
  - 前台日期狀態：
  - 前台時間下拉狀態：
- Refresh 後結果：
- Severity:
- Follow-up:

## Agent 5：Break / Time Off / Blocked Slot 只扣部分時段
- Owner:
- `staff_id`:
- `service_id`:
- `date`:
- 後台設定：
  - 上班時間：
  - 下班時間：
  - 固定休息時段：
  - 休假時段：
  - 封鎖時段：
- 預期：
  - 不應整日變成 `off`
  - 只扣部分時段
  - slots 與設定對照
- 實際：
  - `month-summary.status`:
  - `month-summary.reason`:
  - `availableCount`:
  - slots:
  - 前台日期狀態：
  - 前台時間下拉狀態：
- Refresh 後結果：
- Severity:
- Follow-up:

## Agent 6：QA / Gate Keeper
- Owner：Codex / 今日自動化執行主線
- Build：
- Smoke 完成數：
- `P0`:
- `P1`:
- `P2`:
- `P3`:
- Blocking findings:
- Known issues:
- 最終 Decision:

---

## 共通補充檢查
- Staff / holiday / service / resource 儲存後，前台是否仍顯示舊 cache：
  - `yes / no`
- 修改下班時間後，最後可約時段是否同步變更：
  - `yes / no`
- `full` 是否清楚區分於 `off`：
  - `yes / no`
- 前台是否仍有亂碼 / 高頻英文殘留：
  - `yes / no`
- 是否影響 booking create：
  - `yes / no`

---

## 今日已執行的自動化結果

### `npm run build`
- 結果：`pass`
- 已成功通過 production build

### `node scripts/phase2-live-smoke.mjs --base-url=http://localhost:3000`
- 結果：`partial`
- Pass：
  - `bookings_detail_seed_ready`
  - `transaction_edit_save_roundtrip`
  - `customer_operational_seed_ready`
- Fail / Blocked：
  - `controlled_booking_create` -> `environment_invalid`
  - `controlled_booking_reschedule` -> `blocked (environment_invalid)`
  - `controlled_booking_cancel` -> `blocked (environment_invalid)`
  - `availability_resource_full` -> `environment_invalid`
  - `holiday_provider_group_enforcement` -> `environment_invalid`
- 診斷：
  - `GET /api/public/availability-version` -> `404`
  - `GET /api/availability` -> `500`
  - error: `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`

### `node scripts/release-gate-smoke.mjs --base-url=http://localhost:3000`
- 結果：`blocked`
- Blocker：
  - `Availability environment probe failed`
- 診斷：
  - `diagnostic_category = environment_invalid`
  - `environment_probe.status = 404`

---

## 2026-03-20 根因追查 Round（更新）

### 已完成修正
- smoke scripts 已統一預設 host 為 `http://localhost:3000`
- `phase2-live-smoke.mjs` 已加入：
  - account auth preflight probe
  - availability environment probe
  - `auth_session_invalid / environment_invalid / availability_error` 診斷分類
- `release-gate-smoke.mjs` 已加入：
  - availability environment probe
  - month-summary aware `findSlot()`
  - create / reschedule / rollback / ticket baseline 的 seed-aware 診斷
  - fallback report 輸出
- phase2 service query 已補 optional column fallback：
  - `buffer_min`
  - `slot_step_min`
  - `min_booking_qty`
  - `max_booking_qty`
  - `booking_mode`

### 目前根因判定
- `controlled_booking_create = 401` 原先表面像 auth 問題，但目前更高優先級根因是：
  - smoke 打到的 `localhost:3000` 服務不是完整、帶正確 env 的目標 app instance
- `availability / holiday = 500` 目前不是 holiday / resource 規則本身壞掉，而是：
  - 目標 server instance 缺少必要 env，或不是最新 app instance
- `release-gate no create slot` 已補成可診斷 baseline，但在 environment invalid 解決前，仍未能有效驗證 create slot

### 今日 Gate
- 當前判定：`NO-GO`
- 下一步：
  1. 先確認 / 啟動正確的本地 Next server instance（帶 `.env.local`）
  2. 再重跑：
     - `node scripts/phase2-live-smoke.mjs --base-url=http://localhost:3000`
     - `node scripts/release-gate-smoke.mjs --base-url=http://localhost:3000`
  3. 若 environment probe 綠燈，再看 auth / seed / availability 真 blocker

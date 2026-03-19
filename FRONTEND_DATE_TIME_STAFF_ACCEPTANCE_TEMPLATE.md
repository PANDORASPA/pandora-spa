# 前台日期 / 時間 / Staff 排班對照驗收模板

## 基本資料
- 日期：
- Owner / Agent：
- 環境：
- Staff ID：
- Service ID：
- Location ID：
- 測試月份：
- 測試日期：

## 後台設定快照
- `staff.schedule[weekday]`：
- `staff.daysoff`：
- `staff_shifts`：
- `staff_breaks`：
- `staff_time_off`：
- `blocked_slots`：
- `holiday_scope_hit`：
- `service_scope_snapshot`：
- `resource_state_snapshot`：

## API / 前台結果
- `month_summary.status`：
- `month_summary.reason`：
- `month_summary.availableCount`：
- `single_day_availability`：
- `frontend_month_status`：
- `frontend_day_result`：
- `network_timing_ms`：
- `diagnosis_category`：

## 高訊號 Smoke 情境
### 1. 每週時間表有班 -> `available`
- 預期：
  - 月曆日期顯示可預約
  - 點入後可載入時段下拉
- 實際：
- 結果：`pass / fail`
- 備註：

### 2. 每週時間表休息 -> `off`
- 預期：
  - 月曆日期灰色不可選
  - 不再打單日 availability
- 實際：
- 結果：`pass / fail`
- 備註：

### 3. 有班但資源滿 -> `full`
- 預期：
  - 月曆日期保留可見
  - 顯示已滿，不誤當休息
- 實際：
- 結果：`pass / fail`
- 備註：

### 4. 日期覆蓋：休息 -> 上班
- 預期：
  - 原本休息日轉成可預約或已滿
  - 不再維持灰色休息
- 實際：
- 結果：`pass / fail`
- 備註：

### 5. Break / Time Off / Blocked Slot 只扣部分時段
- 預期：
  - 不應把整天誤判成 `off`
  - dropdown 只扣掉受影響時段
- 實際：
- 結果：`pass / fail`
- 備註：

### 6. 下班時間修改後同步影響前台
- 預期：
  - 儲存成功
  - refresh 後值仍存在
  - 前台最後可預約時段跟著改變
- 實際：
- 結果：`pass / fail`
- 備註：

### 7. 同月切換兩個服務
- 預期：
  - 一個服務 `full`、另一個 `available` 時可分清
  - 同月切換不應重新卡很久
- 實際：
- 結果：`pass / fail`
- 備註：

## Findings
- Severity：`P0 / P1 / P2 / P3`
- 描述：
- 跟進 owner：
- ETA：

## 今日判定
- Decision：`GO / Conditional GO / NO-GO`
- 備註：

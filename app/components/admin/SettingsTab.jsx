'use client'

import { useEffect, useState } from 'react'

const DAY_OPTIONS = [
  { key: '0', label: '日' },
  { key: '1', label: '一' },
  { key: '2', label: '二' },
  { key: '3', label: '三' },
  { key: '4', label: '四' },
  { key: '5', label: '五' },
  { key: '6', label: '六' },
]

const normalizeDaysOff = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value !== 'string') return [String(value).trim()].filter(Boolean)

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item).trim()).filter(Boolean)
        : [String(parsed).trim()].filter(Boolean)
    } catch {
      return []
    }
  }

  return trimmed
    .split(',')
    .map((item) => String(item).trim())
    .filter(Boolean)
}

export default function SettingsTab({ settings, saveSettings, saving = false }) {
  const [draft, setDraft] = useState(settings || {})

  useEffect(() => {
    setDraft(settings || {})
  }, [settings])

  const isDirty = JSON.stringify(draft || {}) !== JSON.stringify(settings || {})

  const updateSetting = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    await saveSettings(draft)
  }

  const currentDaysOff = normalizeDaysOff(draft.days_off)
  const toggleDayOff = (dayKey) => {
    const nextDaysOff = currentDaysOff.includes(dayKey)
      ? currentDaysOff.filter((item) => item !== dayKey)
      : [...currentDaysOff, dayKey]

    updateSetting('days_off', JSON.stringify(nextDaysOff))
  }

  const businessHours = String(draft.business_hours || '11:00 - 20:00')
    .split('-')
    .map((item) => item.trim())
  const businessStart = businessHours[0] || '11:00'
  const businessEnd = businessHours[1] || '20:00'

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '16px 18px',
          background: '#fff',
          borderRadius: '14px',
          border: '1px solid var(--gray)',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text)' }}>店舖設定草稿</div>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            {isDirty ? '有未儲存修改' : '目前設定已同步'}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="btn btn-small btn-interactive"
          style={{ background: '#34D399' }}
        >
          {saving && <span className="spinner"></span>}
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>店舖基本資料</h3>

          <div style={{ marginBottom: '16px' }}>
            <label>店名</label>
            <input
              type="text"
              value={draft.shop_name || ''}
              onChange={(e) => updateSetting('shop_name', e.target.value)}
              placeholder="例如：VIVA HAIR"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>地址</label>
            <input
              type="text"
              value={draft.address || ''}
              onChange={(e) => updateSetting('address', e.target.value)}
              placeholder="店舖地址"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>電話 / WhatsApp</label>
            <input
              type="text"
              value={draft.phone || ''}
              onChange={(e) => updateSetting('phone', e.target.value)}
              placeholder="聯絡電話"
            />
          </div>
        </div>

        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>店舖營業與休息</h3>

          <div style={{ marginBottom: '20px' }}>
            <label>營業時間</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="time"
                value={businessStart}
                onChange={(e) => updateSetting('business_hours', `${e.target.value} - ${businessEnd}`)}
                style={{ padding: '10px' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>至</span>
              <input
                type="time"
                value={businessEnd}
                onChange={(e) => updateSetting('business_hours', `${businessStart} - ${e.target.value}`)}
                style={{ padding: '10px' }}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '8px' }}>
              這個時間會作為全店可預約時段的基準。
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>店舖全體休息日</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {DAY_OPTIONS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDayOff(day.key)}
                  className="btn-interactive"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    border: '1px solid ' + (currentDaysOff.includes(day.key) ? '#ef4444' : 'var(--gray)'),
                    background: currentDaysOff.includes(day.key) ? '#fef2f2' : '#fff',
                    color: currentDaysOff.includes(day.key) ? '#ef4444' : 'var(--text)',
                    fontWeight: currentDaysOff.includes(day.key) ? 700 : 500,
                  }}
                >
                  星期{day.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '10px' }}>
              這裡只代表全店休息日，不是員工個人休假。
            </p>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>預約與取消政策</h3>

          <div style={{ marginBottom: '16px' }}>
            <label>預約政策</label>
            <textarea
              value={draft.booking_policy || ''}
              onChange={(e) => updateSetting('booking_policy', e.target.value)}
              placeholder="顯示在預約頁面的說明..."
              style={{ minHeight: '100px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>取消政策</label>
            <textarea
              value={draft.cancellation_policy || ''}
              onChange={(e) => updateSetting('cancellation_policy', e.target.value)}
              placeholder="描述取消或改期規則..."
              style={{ minHeight: '100px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

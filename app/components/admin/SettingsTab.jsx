'use client'

import { useEffect, useState } from 'react'

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
    } catch (e) {
      return []
    }
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
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

  const toggleDayOff = (dayName) => {
    const currentDaysOff = normalizeDaysOff(draft.days_off)
    const nextDaysOff = currentDaysOff.includes(dayName)
      ? currentDaysOff.filter((item) => item !== dayName)
      : [...currentDaysOff, dayName]

    updateSetting('days_off', JSON.stringify(nextDaysOff))
  }

  const handleSave = async () => {
    await saveSettings(draft)
  }

  const daysOff = normalizeDaysOff(draft.days_off)
  const businessHours = String(draft.business_hours || '11:00 - 20:00').split('-').map((item) => item.trim())
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
          <div style={{ fontWeight: 800, color: 'var(--text)' }}>設定草稿</div>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            {isDirty ? '有未儲存變更' : '目前已與資料庫同步'}
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
          {saving ? '鍎插瓨涓?..' : '儲存設定'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>店舖基本設定</h3>
          <div style={{ marginBottom: '16px' }}>
            <label>店名</label>
            <input
              type="text"
              value={draft.shop_name || ''}
              onChange={(e) => updateSetting('shop_name', e.target.value)}
              placeholder="例如: VIVA SALON"
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
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>營業與休息設定</h3>

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
              會影響預約頁面的可用時段計算
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>每週休息日</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDayOff(day)}
                  className="btn-interactive"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    border: '1px solid ' + (daysOff.includes(day) ? '#ef4444' : 'var(--gray)'),
                    background: daysOff.includes(day) ? '#fef2f2' : '#fff',
                    color: daysOff.includes(day) ? '#ef4444' : 'var(--text)',
                    fontWeight: daysOff.includes(day) ? 700 : 500,
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '10px' }}>
              紅色代表店舖全日休息日
            </p>
          </div>
        </div>

        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>預約與取消政策</h3>
          <div style={{ marginBottom: '16px' }}>
            <label>預約條款</label>
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
              placeholder="描述取消預約的規則..."
              style={{ minHeight: '100px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

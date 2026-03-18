'use client'

import { useEffect, useState } from 'react'

const DAY_OPTIONS = [
  { key: '0', label: '週日' },
  { key: '1', label: '週一' },
  { key: '2', label: '週二' },
  { key: '3', label: '週三' },
  { key: '4', label: '週四' },
  { key: '5', label: '週五' },
  { key: '6', label: '週六' },
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

const parseBusinessHours = (value) => {
  const fallback = ['11:00', '20:00']
  const raw = String(value || `${fallback[0]} - ${fallback[1]}`)
  const parts = raw
    .split('-')
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    start: parts[0] || fallback[0],
    end: parts[1] || fallback[1],
  }
}

function SectionCard({ title, description, children, tone = 'default' }) {
  const accentColor = tone === 'soft' ? '#A68B6A' : 'var(--text)'
  const background = tone === 'soft' ? 'linear-gradient(180deg, #fff, #FAF8F5)' : '#fff'

  return (
    <div
      className="admin-card"
      style={{
        padding: '24px',
        background,
        border: '1px solid var(--gray)',
      }}
    >
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: accentColor }}>{title}</h3>
        {description && (
          <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function FieldGroup({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-light)' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export default function SettingsTab({ settings, saveSettings, saving = false }) {
  const [draft, setDraft] = useState(settings || {})

  useEffect(() => {
    setDraft(settings || {})
  }, [settings])

  const isDirty = JSON.stringify(draft || {}) !== JSON.stringify(settings || {})
  const businessHours = parseBusinessHours(draft.business_hours)
  const currentDaysOff = normalizeDaysOff(draft.days_off)

  const updateSetting = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    await saveSettings(draft)
  }

  const toggleDayOff = (dayKey) => {
    const nextDaysOff = currentDaysOff.includes(dayKey)
      ? currentDaysOff.filter((item) => item !== dayKey)
      : [...currentDaysOff, dayKey]

    updateSetting('days_off', JSON.stringify(nextDaysOff))
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #fff, #FAF8F5)',
          border: '1px solid rgba(166, 139, 106, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#A68B6A', letterSpacing: '0.04em' }}>
            SETTINGS
          </div>
          <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
            店舖設定
          </div>
          <div style={{ marginTop: '4px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
            調整店舖資料、營業時間、公休日與預約規則，改動後記得按右側儲存。
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '7px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              background: isDirty ? '#FEF3C7' : '#ECFDF5',
              color: isDirty ? '#B45309' : '#047857',
            }}
          >
            {isDirty ? '有未儲存變更' : '內容已同步'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="btn btn-small btn-interactive"
            style={{
              background: '#34D399',
              minWidth: '120px',
              justifyContent: 'center',
            }}
          >
            {saving && <span className="spinner"></span>}
            {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <SectionCard
          title="店舖基本資料"
          description="這些資料會影響前台頁面顯示、WhatsApp 聯絡與地址展示。"
        >
          <FieldGroup
            label="店舖名稱"
            hint="例如：VIVA HAIR。會顯示在後台與前台設定相關區域。"
          >
            <input
              type="text"
              value={draft.shop_name || ''}
              onChange={(e) => updateSetting('shop_name', e.target.value)}
              placeholder="VIVA HAIR"
            />
          </FieldGroup>

          <FieldGroup
            label="店舖地址"
            hint="用於前台地圖、聯絡資訊與店舖介紹。"
          >
            <input
              type="text"
              value={draft.address || ''}
              onChange={(e) => updateSetting('address', e.target.value)}
              placeholder="香港某區某街 55 號"
            />
          </FieldGroup>

          <FieldGroup
            label="電話 / WhatsApp"
            hint="建議填寫可直接聯絡的手機或 WhatsApp 號碼。"
          >
            <input
              type="text"
              value={draft.phone || ''}
              onChange={(e) => updateSetting('phone', e.target.value)}
              placeholder="+852 1234 5678"
            />
          </FieldGroup>
        </SectionCard>

        <SectionCard
          title="營業時間與休息日"
          description="用這裡設定整體營業範圍與店舖固定休息日。"
          tone="soft"
        >
          <FieldGroup
            label="營業時間"
            hint="預約時段會以這個區間作為基準。"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="time"
                value={businessHours.start}
                onChange={(e) => updateSetting('business_hours', `${e.target.value} - ${businessHours.end}`)}
                style={{ padding: '10px 12px' }}
              />
              <span style={{ fontWeight: 700, color: 'var(--text-light)' }}>至</span>
              <input
                type="time"
                value={businessHours.end}
                onChange={(e) => updateSetting('business_hours', `${businessHours.start} - ${e.target.value}`)}
                style={{ padding: '10px 12px' }}
              />
            </div>
          </FieldGroup>

          <FieldGroup
            label="固定休息日"
            hint="已選中的日子會以紅色標示。這只代表全店休息，不是個別員工假期。"
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {DAY_OPTIONS.map((day) => {
                const active = currentDaysOff.includes(day.key)

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDayOff(day.key)}
                    className="btn-interactive"
                    style={{
                      padding: '9px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      border: '1px solid ' + (active ? '#ef4444' : 'var(--gray)'),
                      background: active ? '#fef2f2' : '#fff',
                      color: active ? '#dc2626' : 'var(--text)',
                      fontWeight: 700,
                      minWidth: '76px',
                    }}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          title="預約與取消政策"
          description="這些內容會在前台顯示，方便客人預先了解規則。"
        >
          <FieldGroup
            label="預約政策"
            hint="例如：請於預約前 24 小時確認時間，遲到超過 15 分鐘可能需要重新安排。"
          >
            <textarea
              value={draft.booking_policy || ''}
              onChange={(e) => updateSetting('booking_policy', e.target.value)}
              placeholder="填寫預約規則、遲到處理、押金要求等..."
              style={{ minHeight: '120px' }}
            />
          </FieldGroup>

          <FieldGroup
            label="取消政策"
            hint="例如：請於預約前一天通知取消，否則可能視作爽約。"
          >
            <textarea
              value={draft.cancellation_policy || ''}
              onChange={(e) => updateSetting('cancellation_policy', e.target.value)}
              placeholder="填寫取消期限、改期安排、退款說明等..."
              style={{ minHeight: '120px' }}
            />
          </FieldGroup>
        </SectionCard>
      </div>
    </div>
  )
}

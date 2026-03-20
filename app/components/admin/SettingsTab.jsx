'use client'

import { useEffect, useState } from 'react'

const DAY_OPTIONS = [
  { key: '0', label: 'Sun' },
  { key: '1', label: 'Mon' },
  { key: '2', label: 'Tue' },
  { key: '3', label: 'Wed' },
  { key: '4', label: 'Thu' },
  { key: '5', label: 'Fri' },
  { key: '6', label: 'Sat' },
]

const normalizeDaysOff = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  const text = String(value).trim()
  if (!text) return []

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : []
    } catch {
      return []
    }
  }

  return text.split(',').map((item) => item.trim()).filter(Boolean)
}

const parseBusinessHours = (value) => {
  const fallback = ['11:00', '20:00']
  const parts = String(value || `${fallback[0]} - ${fallback[1]}`)
    .split('-')
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    start: parts[0] || fallback[0],
    end: parts[1] || fallback[1],
  }
}

function Section({ title, description, children, tone = 'default' }) {
  return (
    <div
      className="admin-card"
      style={{
        padding: '24px',
        border: tone === 'accent' ? '1px solid rgba(166, 139, 106, 0.25)' : '1px solid var(--gray)',
        background: tone === 'accent' ? 'linear-gradient(180deg, #fff, #fbf7f1)' : '#fff',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{title}</h3>
        {description && <p style={{ margin: '6px 0 0', color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsTab({ settings, saveSettings, saving = false, memberProfiles = [], saveAdminProfiles }) {
  const [draft, setDraft] = useState(settings || {})
  const [adminDraft, setAdminDraft] = useState(memberProfiles || [])

  useEffect(() => {
    setDraft(settings || {})
  }, [settings])

  useEffect(() => {
    setAdminDraft(memberProfiles || [])
  }, [memberProfiles])

  const isDirty = JSON.stringify(draft || {}) !== JSON.stringify(settings || {})
  const adminDirty = JSON.stringify(adminDraft || []) !== JSON.stringify(memberProfiles || [])
  const daysOff = normalizeDaysOff(draft.days_off)
  const businessHours = parseBusinessHours(draft.business_hours)

  const updateSetting = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const toggleDayOff = (dayKey) => {
    const nextDaysOff = daysOff.includes(dayKey)
      ? daysOff.filter((item) => item !== dayKey)
      : [...daysOff, dayKey]
    updateSetting('days_off', JSON.stringify(nextDaysOff))
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #fff, #fbf7f1)',
          border: '1px solid rgba(166, 139, 106, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ color: '#A68B6A', fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>STORE SETTINGS</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>Business rules and front desk details</div>
          <div style={{ marginTop: '4px', color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>
            Edit public contact details, store-wide opening hours, and full-shop days off that affect availability.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ padding: '7px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: isDirty ? '#FEF3C7' : '#ECFDF5', color: isDirty ? '#B45309' : '#047857' }}>
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button type="button" onClick={() => saveSettings(draft)} disabled={!isDirty || saving} className="btn btn-small btn-interactive" style={{ background: '#34D399', minWidth: '120px', justifyContent: 'center' }}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Section title="Store profile" description="These values appear across the public website and customer touchpoints.">
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label>Store name</label>
              <input type="text" value={draft.shop_name || ''} onChange={(event) => updateSetting('shop_name', event.target.value)} placeholder="VIVA HAIR" />
            </div>
            <div>
              <label>Address</label>
              <input type="text" value={draft.address || ''} onChange={(event) => updateSetting('address', event.target.value)} placeholder="Shop address" />
            </div>
            <div>
              <label>Phone / WhatsApp</label>
              <input type="text" value={draft.phone || ''} onChange={(event) => updateSetting('phone', event.target.value)} placeholder="+852 1234 5678" />
            </div>
            <div>
              <label>Google place ID</label>
              <input type="text" value={draft.google_place_id || ''} onChange={(event) => updateSetting('google_place_id', event.target.value)} placeholder="Place ID for reviews/map widgets" />
            </div>
          </div>
        </Section>

        <Section title="Store-wide availability" description="These settings affect all staff members before individual overrides are applied." tone="accent">
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label>Business hours</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="time" value={businessHours.start} onChange={(event) => updateSetting('business_hours', `${event.target.value} - ${businessHours.end}`)} />
                <span style={{ color: 'var(--text-light)', fontWeight: 700 }}>to</span>
                <input type="time" value={businessHours.end} onChange={(event) => updateSetting('business_hours', `${businessHours.start} - ${event.target.value}`)} />
              </div>
            </div>
            <div>
              <label>Slot step (minutes)</label>
              <input type="number" min="5" step="5" value={draft.slot_step_min || '15'} onChange={(event) => updateSetting('slot_step_min', event.target.value)} />
            </div>
            <div>
              <label>Default buffer (minutes)</label>
              <input type="number" min="0" step="5" value={draft.default_buffer_min || '15'} onChange={(event) => updateSetting('default_buffer_min', event.target.value)} />
            </div>
          </div>
        </Section>
      </div>

      <Section title="Store-wide days off" description="These are full-shop closed days. They are different from each staff member's personal weekly schedule." tone="accent">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {DAY_OPTIONS.map((day) => {
            const active = daysOff.includes(day.key)
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDayOff(day.key)}
                className="btn-interactive"
                style={{
                  padding: '10px 16px',
                  borderRadius: '999px',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--gray)'}`,
                  background: active ? 'var(--primary)' : '#fff',
                  color: active ? '#fff' : 'var(--text-light)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {day.label}
              </button>
            )
          })}
        </div>
        <div style={{ color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.6 }}>
          If a day is selected here, the whole store becomes unavailable before staff-level shifts, breaks, and blocked slots are evaluated.
        </div>
      </Section>

      <Section title="管理員帳號" description="可授權多位已註冊會員進入後台。只會切換 member_profiles 的管理權限，不會建立新帳號。" tone="accent">
        <div style={{ display: 'grid', gap: '12px' }}>
          {(adminDraft || []).length === 0 ? (
            <div style={{ color: 'var(--text-light)', fontSize: '13px' }}>暫時未有可管理的會員資料。</div>
          ) : (
            adminDraft.map((profile) => (
              <label
                key={profile.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  border: '1px solid var(--gray)',
                  borderRadius: '12px',
                  background: '#fff',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{profile.full_name || profile.email || profile.id}</div>
                  <div style={{ marginTop: '4px', color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.5 }}>
                    {profile.email || '未有電郵'}{profile.phone ? ` · ${profile.phone}` : ''}
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={profile.is_admin === true}
                    onChange={(event) =>
                      setAdminDraft((current) =>
                        current.map((item) => (item.id === profile.id ? { ...item, is_admin: event.target.checked } : item))
                      )
                    }
                  />
                  管理員
                </span>
              </label>
            ))
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '12px' }}>
              先讓對方完成註冊，之後在這裡開啟管理員權限。
            </div>
            <button
              type="button"
              onClick={() => saveAdminProfiles?.(adminDraft)}
              disabled={!adminDirty || saving}
              className="btn btn-small btn-interactive"
              style={{ minWidth: '148px', justifyContent: 'center' }}
            >
              {saving ? '儲存中...' : '儲存管理員帳號'}
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}

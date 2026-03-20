'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'
import { fieldStyle } from './opsUi'

const DAY_OPTIONS = [
  { key: '0', label: '星期日' },
  { key: '1', label: '星期一' },
  { key: '2', label: '星期二' },
  { key: '3', label: '星期三' },
  { key: '4', label: '星期四' },
  { key: '5', label: '星期五' },
  { key: '6', label: '星期六' },
]

const SECTION_OPTIONS = [
  { key: 'profile', title: '店舖資料', description: '店名、地址、聯絡電話與 Google Place ID' },
  { key: 'availability', title: '全店預約規則', description: '營業時間、時段步進與預設 buffer' },
  { key: 'daysOff', title: '全店公休日', description: '整間店共同休息的星期設定' },
  { key: 'admins', title: '管理員帳號', description: '指定哪些會員帳號可進入後台' },
]

const parseBusinessHours = (value) => {
  const fallback = ['11:00', '20:00']
  const parts = String(value || `${fallback[0]} - ${fallback[1]}`)
    .split('-')
    .map((item) => item.trim())
    .filter(Boolean)
  return { start: parts[0] || fallback[0], end: parts[1] || fallback[1] }
}

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

const listItemStyle = (selected) => ({
  width: '100%',
  textAlign: 'left',
  padding: '14px 16px',
  borderRadius: '14px',
  border: `1px solid ${selected ? 'rgba(166, 139, 106, 0.45)' : '#EEE7DE'}`,
  background: selected ? 'linear-gradient(180deg, #fff, #FBF8F4)' : '#fff',
  cursor: 'pointer',
  display: 'grid',
  gap: '6px',
})

export default function SettingsTab({ settings, saveSettings, saving = false, memberProfiles = [], saveAdminProfiles }) {
  const [draft, setDraft] = useState(settings || {})
  const [adminDraft, setAdminDraft] = useState(memberProfiles || [])
  const [selectedSection, setSelectedSection] = useState('profile')

  useEffect(() => {
    setDraft(settings || {})
  }, [settings])

  useEffect(() => {
    setAdminDraft(memberProfiles || [])
  }, [memberProfiles])

  const businessHours = parseBusinessHours(draft?.business_hours)
  const daysOff = normalizeDaysOff(draft?.days_off)
  const isDirty = JSON.stringify(draft || {}) !== JSON.stringify(settings || {})
  const adminDirty = JSON.stringify(adminDraft || []) !== JSON.stringify(memberProfiles || [])

  const sectionStatus = useMemo(
    () => ({
      profile: draft?.shop_name ? '已填店名' : '待補資料',
      availability: draft?.business_hours ? '已設定營業時間' : '未設定',
      daysOff: daysOff.length ? `已選 ${daysOff.length} 天` : '未設定',
      admins: adminDraft.filter((profile) => profile?.is_admin === true).length
        ? `${adminDraft.filter((profile) => profile?.is_admin === true).length} 位管理員`
        : '未指定',
    }),
    [adminDraft, daysOff.length, draft?.business_hours, draft?.shop_name]
  )

  const updateSetting = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const toggleDayOff = (dayKey) => {
    const next = daysOff.includes(dayKey) ? daysOff.filter((item) => item !== dayKey) : [...daysOff, dayKey]
    updateSetting('days_off', JSON.stringify(next))
  }

  const renderSection = () => {
    switch (selectedSection) {
      case 'profile':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>店舖名稱</span>
              <input type="text" value={draft.shop_name || ''} onChange={(event) => updateSetting('shop_name', event.target.value)} style={fieldStyle} placeholder="VIVA HAIR" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>地址</span>
              <input type="text" value={draft.address || ''} onChange={(event) => updateSetting('address', event.target.value)} style={fieldStyle} placeholder="完整店舖地址" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>電話 / WhatsApp</span>
                <input type="text" value={draft.phone || ''} onChange={(event) => updateSetting('phone', event.target.value)} style={fieldStyle} placeholder="+852 1234 5678" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Google Place ID</span>
                <input type="text" value={draft.google_place_id || ''} onChange={(event) => updateSetting('google_place_id', event.target.value)} style={fieldStyle} placeholder="地圖 / 評論用 Place ID" />
              </label>
            </div>
          </div>
        )
      case 'availability':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>營業時間</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="time" value={businessHours.start} onChange={(event) => updateSetting('business_hours', `${event.target.value} - ${businessHours.end}`)} style={fieldStyle} />
                <span style={{ color: 'var(--text-light)', fontWeight: 700 }}>至</span>
                <input type="time" value={businessHours.end} onChange={(event) => updateSetting('business_hours', `${businessHours.start} - ${event.target.value}`)} style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>時段步進（分鐘）</span>
                <select value={String(draft.slot_step_min || '30')} onChange={(event) => updateSetting('slot_step_min', event.target.value)} style={fieldStyle}>
                  {[30, 60].map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>預設 Buffer（分鐘）</span>
                <input type="number" min="0" step="5" value={draft.default_buffer_min || '15'} onChange={(event) => updateSetting('default_buffer_min', event.target.value)} style={fieldStyle} />
              </label>
            </div>
          </div>
        )
      case 'daysOff':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>
              這裡設定的是全店共同休息日，會先於員工個人排班與日期覆蓋生效。
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          </div>
        )
      case 'admins':
        return (
          <div style={{ display: 'grid', gap: '12px' }}>
            {(adminDraft || []).length === 0 ? (
              <EmptyState title="未有會員資料" description="請先讓會員完成註冊，之後即可在此開啟管理員權限。" />
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
                      {profile.email || '未有電郵'}
                      {profile.phone ? ` · ${profile.phone}` : ''}
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={profile.is_admin === true}
                      onChange={(event) =>
                        setAdminDraft((current) => current.map((item) => (item.id === profile.id ? { ...item, is_admin: event.target.checked } : item)))
                      }
                    />
                    管理員
                  </span>
                </label>
              ))
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => saveAdminProfiles?.(adminDraft)} disabled={!adminDirty || saving} className="btn btn-small btn-interactive" style={{ minWidth: '148px' }}>
                {saving ? '儲存中…' : '儲存管理員帳號'}
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '20px 22px',
          background: 'linear-gradient(135deg, #fff, #FBF8F4)',
          border: '1px solid rgba(166, 139, 106, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>系統設定</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>列表式管理店舖規則與管理員權限</div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.6 }}>
            統一用列表選取設定分類，再在右邊編輯，避免整頁混雜太多設定表單。
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone={isDirty || adminDirty ? 'warning' : 'success'}>{isDirty || adminDirty ? '有未儲存變更' : '已全部儲存'}</StatusPill>
          {selectedSection !== 'admins' ? (
            <button type="button" onClick={() => saveSettings(draft)} disabled={!isDirty || saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
              {saving ? '儲存中…' : '儲存設定'}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <AdminSection eyebrow="設定列表" title="選擇設定分類" description="用同一種模式管理店舖資料、預約規則、公休日與管理員。">
          <div style={{ display: 'grid', gap: '12px' }}>
            {SECTION_OPTIONS.map((section) => {
              const selected = section.key === selectedSection
              return (
                <button key={section.key} type="button" onClick={() => setSelectedSection(section.key)} style={listItemStyle(selected)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>{section.title}</div>
                    <StatusPill tone="accent">{sectionStatus[section.key]}</StatusPill>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.5 }}>{section.description}</div>
                </button>
              )
            })}
          </div>
        </AdminSection>

        <AdminSection
          eyebrow="設定編輯"
          title={SECTION_OPTIONS.find((section) => section.key === selectedSection)?.title || '設定'}
          description={SECTION_OPTIONS.find((section) => section.key === selectedSection)?.description || ''}
        >
          {renderSection()}
        </AdminSection>
      </div>
    </div>
  )
}

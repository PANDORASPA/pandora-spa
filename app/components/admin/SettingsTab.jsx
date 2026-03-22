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
  { key: 'profile', title: '店舖資料', description: '管理店舖名稱、地址、聯絡方式與 Google Place ID。' },
  { key: 'availability', title: '營業與預約規則', description: '設定全店營業時間、時段步進與預設 buffer。' },
  { key: 'daysOff', title: '全店公休日', description: '設定整間店共同休息的星期，所有員工會一起受影響。' },
  { key: 'admins', title: '管理員帳號', description: '查看哪些會員已具備後台管理權限，並追蹤登入條件。' },
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

const adminStatusTone = (profile) => {
  if (!profile?.auth_user_exists) return 'danger'
  if (!profile?.is_admin) return 'warning'
  return 'success'
}

const adminStatusText = (profile) => {
  if (!profile?.auth_user_exists) return '沒有對應登入帳號'
  if (!profile?.is_admin) return '未開通管理權限'
  return '可登入後台'
}

const adminDiagnosticText = (profile) => {
  if (!profile?.id) return '缺少會員資料列'
  if (!profile?.auth_user_exists) return '找不到對應的 Supabase Auth 帳號，請先確認該會員是否已完成註冊。'
  if (!profile?.is_admin) return '帳號存在，但目前未勾選為管理員。'
  if (profile?.auth_email && profile?.email && profile.auth_email !== profile.email) {
    return `登入帳號電郵為 ${profile.auth_email}，與會員資料電郵 ${profile.email} 不同。`
  }
  return '登入帳號與會員資料已對上，理論上可正常進入後台。'
}

export default function SettingsTab({
  settings,
  saveSettings,
  saving = false,
  memberProfiles = [],
  saveAdminProfiles,
  compact = false,
}) {
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
      profile: draft?.shop_name ? '已填店舖名稱' : '待補店舖資料',
      availability: draft?.business_hours ? '已設定營業時間' : '未設定營業時間',
      daysOff: daysOff.length ? `已選 ${daysOff.length} 日` : '沒有全店公休日',
      admins: adminDraft.filter((profile) => profile?.is_admin === true).length
        ? `${adminDraft.filter((profile) => profile?.is_admin === true).length} 位管理員`
        : '未指定管理員',
    }),
    [adminDraft, daysOff.length, draft?.business_hours, draft?.shop_name],
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
              <input type="text" value={draft.address || ''} onChange={(event) => updateSetting('address', event.target.value)} style={fieldStyle} placeholder="輸入完整店舖地址" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>電話 / WhatsApp</span>
                <input type="text" value={draft.phone || ''} onChange={(event) => updateSetting('phone', event.target.value)} style={fieldStyle} placeholder="+852 1234 5678" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Google Place ID</span>
                <input type="text" value={draft.google_place_id || ''} onChange={(event) => updateSetting('google_place_id', event.target.value)} style={fieldStyle} placeholder="只在有需要時填寫" />
              </label>
            </div>
          </div>
        )
      case 'availability':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>營業時間</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flexDirection: compact ? 'column' : 'row' }}>
                <input type="time" value={businessHours.start} onChange={(event) => updateSetting('business_hours', `${event.target.value} - ${businessHours.end}`)} style={{ ...fieldStyle, maxWidth: compact ? '100%' : '220px' }} />
                <span style={{ color: 'var(--text-light)', fontWeight: 700 }}>至</span>
                <input type="time" value={businessHours.end} onChange={(event) => updateSetting('business_hours', `${businessHours.start} - ${event.target.value}`)} style={{ ...fieldStyle, maxWidth: compact ? '100%' : '220px' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
              這裡設定的是全店共同休息日，會先於個人每週時間表生效。若沒有全店休息，請保持全部未選。
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
            <div style={{ color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.6 }}>
              目前全店公休日：{daysOff.length ? daysOff.map((day) => DAY_OPTIONS.find((item) => item.key === day)?.label || day).join('、') : '沒有'}
            </div>
          </div>
        )
      case 'admins':
        return (
          <div style={{ display: 'grid', gap: '12px' }}>
            {(adminDraft || []).length === 0 ? (
              <EmptyState title="尚未有會員資料" description="請先讓會員完成註冊，之後才可在這裡開通後台權限。" />
            ) : (
              adminDraft.map((profile) => (
                <div
                  key={profile.id}
                  style={{
                    display: 'grid',
                    gap: '10px',
                    padding: '12px 14px',
                    border: '1px solid var(--gray)',
                    borderRadius: '12px',
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: compact ? 'flex-start' : 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{profile.full_name || profile.email || profile.id}</div>
                      <div style={{ marginTop: '4px', color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.5 }}>
                        {profile.email || '沒有會員電郵'}
                        {profile.phone ? ` / ${profile.phone}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={profile.is_admin === true}
                        onChange={(event) =>
                          setAdminDraft((current) =>
                            current.map((item) => (item.id === profile.id ? { ...item, is_admin: event.target.checked } : item)),
                          )
                        }
                      />
                      管理員
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <StatusPill tone={adminStatusTone(profile)}>{adminStatusText(profile)}</StatusPill>
                    <StatusPill tone="accent">Profile ID：{profile.id}</StatusPill>
                    <StatusPill tone={profile.auth_user_exists ? 'success' : 'danger'}>
                      Auth：{profile.auth_user_exists ? '已找到' : '找不到'}
                    </StatusPill>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.6 }}>
                    {adminDiagnosticText(profile)}
                    {profile.auth_email ? ` 目前 auth 電郵：${profile.auth_email}` : ''}
                  </div>
                </div>
              ))
            )}
            <div style={{ display: 'flex', justifyContent: compact ? 'stretch' : 'flex-end' }}>
              <button
                type="button"
                onClick={() => saveAdminProfiles?.(adminDraft)}
                disabled={!adminDirty || saving}
                className="btn btn-small btn-interactive"
                style={{ minWidth: compact ? '100%' : '148px' }}
              >
                {saving ? '儲存中…' : '儲存管理員設定'}
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
            以列表切換設定分類，再在右側集中編輯，避免整頁堆滿表單而難以操作。
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'minmax(280px, 340px) minmax(0, 1fr)',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        <AdminSection eyebrow="設定列表" title="選擇設定分類" description="先選擇分類，再在右側編輯真值。">
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

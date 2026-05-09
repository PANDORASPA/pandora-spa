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
  {
    key: 'profile',
    title: '店舖資料',
    description: '管理店舖名稱、地址、聯絡方式與 Google Place ID。',
  },
  {
    key: 'website',
    title: '網站狀態與網域',
    description: '對照 ThinkShops 後台的網站狀態、公開網址、SEO 與功能開關。',
  },
  {
    key: 'commerce',
    title: '付款、配送與結賬',
    description: '集中檢查 Stripe、人工付款、配送與結賬文案是否可正式使用。',
  },
  {
    key: 'communications',
    title: '社交與訊息',
    description: '管理 WhatsApp、Instagram、Facebook、Google Map 與顧客查詢入口。',
  },
  {
    key: 'availability',
    title: '營業時間與預約規則',
    description: '設定店舖營業時間、時段步長與預約緩衝時間。',
  },
  {
    key: 'daysOff',
    title: '全店公休日',
    description: '設定全店共同休息的星期，所有員工都會一併受影響。',
  },
  {
    key: 'admins',
    title: '管理員帳號',
    description: '查看哪些會員已具備後台管理權限，並同步登入狀態。',
  },
  {
    key: 'launchAudit',
    title: '上線清潔檢查',
    description: '用 ThinkShops 架構檢查 demo 頁、SEO 空白、舊網域、付款與會員設定。',
  },
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
  if (!profile?.auth_user_exists) return '找不到對應登入帳號'
  if (!profile?.is_admin) return '目前不是管理員'
  return '可登入後台'
}

const adminDiagnosticText = (profile) => {
  if (!profile?.id) return '缺少會員資料記錄。'
  if (!profile?.auth_user_exists) return '找不到對應的 Supabase Auth 帳號，請先確認是否已完成註冊。'
  if (!profile?.is_admin) return '帳號存在，但目前未勾選管理員權限。'
  if (profile?.auth_email && profile?.email && profile.auth_email !== profile.email) {
    return `登入帳號電郵 ${profile.auth_email} 與會員資料電郵 ${profile.email} 不同。`
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
      profile: draft?.shop_name ? '已填店舖資料' : '待填店舖資料',
      website: draft?.site_url ? '已填公開網址' : '待填公開網址',
      commerce: draft?.stripe_enabled === 'true' || draft?.manual_payment_enabled === 'true' ? '已設定付款方向' : '待設定付款方向',
      communications: draft?.whatsapp || draft?.instagram_url || draft?.facebook_url ? '已填聯絡入口' : '待填社交訊息',
      availability: draft?.business_hours ? '已設定營業時間' : '未設定營業時間',
      daysOff: daysOff.length ? `已選 ${daysOff.length} 日` : '沒有全店公休日',
      admins: adminDraft.filter((profile) => profile?.is_admin === true).length
        ? `${adminDraft.filter((profile) => profile?.is_admin === true).length} 位管理員`
        : '未指定管理員',
      launchAudit: '待逐項核對',
    }),
    [adminDraft, daysOff.length, draft?.business_hours, draft?.facebook_url, draft?.instagram_url, draft?.manual_payment_enabled, draft?.shop_name, draft?.site_url, draft?.stripe_enabled, draft?.whatsapp],
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
              <input type="text" value={draft.shop_name || ''} onChange={(event) => updateSetting('shop_name', event.target.value)} style={fieldStyle} placeholder="PANDORA HEAD SPA" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>地址</span>
              <input type="text" value={draft.address || ''} onChange={(event) => updateSetting('address', event.target.value)} style={fieldStyle} placeholder="輸入完整店舖地址" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', overflowX: 'auto' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>電話 / WhatsApp</span>
                <input type="text" value={draft.phone || ''} onChange={(event) => updateSetting('phone', event.target.value)} style={fieldStyle} placeholder="+852 1234 5678" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Google Place ID</span>
                <input type="text" value={draft.google_place_id || ''} onChange={(event) => updateSetting('google_place_id', event.target.value)} style={fieldStyle} placeholder="如有需要才填寫" />
              </label>
            </div>
          </div>
        )
      case 'website':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              ThinkShops 對照項目：網站狀態、公開網域、主頁 SEO、404 頁、商品/活動/預約/網誌功能開關。正式上線前，避免公開頁仍留有 demo theme 頁或舊 Palace 命名。
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>公開網站 URL</span>
              <input type="url" value={draft.site_url || ''} onChange={(event) => updateSetting('site_url', event.target.value)} style={fieldStyle} placeholder="https://www.pandoraheadspa.com" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>SEO 標題</span>
                <input type="text" value={draft.seo_title || ''} onChange={(event) => updateSetting('seo_title', event.target.value)} style={fieldStyle} placeholder="PANDORA HEAD SPA｜全自助頭皮護理中心" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>SEO 關鍵字</span>
                <input type="text" value={draft.seo_keywords || ''} onChange={(event) => updateSetting('seo_keywords', event.target.value)} style={fieldStyle} placeholder="頭皮護理, Head Spa, 會員套票" />
              </label>
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>SEO 描述</span>
              <textarea value={draft.seo_description || ''} onChange={(event) => updateSetting('seo_description', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="提供頭皮檢測、深層潔淨、頭皮養護、網上預約及會員套票服務。" />
            </label>
          </div>
        )
      case 'commerce':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              ThinkShops 對照項目：付款方式、配送、結賬。PANDORA 第一版以 Stripe 線上付款為主，人工確認付款保留作後備；實體護理服務可把配送文案寫成「不適用」或「到店使用」。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={draft.stripe_enabled === 'true'} onChange={(event) => updateSetting('stripe_enabled', event.target.checked ? 'true' : 'false')} />
                Stripe 線上付款
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={draft.manual_payment_enabled !== 'false'} onChange={(event) => updateSetting('manual_payment_enabled', event.target.checked ? 'true' : 'false')} />
                人工確認付款
              </label>
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>結賬提示文案</span>
              <textarea value={draft.checkout_notice || ''} onChange={(event) => updateSetting('checkout_notice', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="完成付款後，套票會自動加入會員帳戶；如選擇人工付款，需由店員確認後才會發放。" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>配送 / 到店使用說明</span>
              <input type="text" value={draft.fulfillment_note || ''} onChange={(event) => updateSetting('fulfillment_note', event.target.value)} style={fieldStyle} placeholder="套票及預約服務無需配送，到店使用。" />
            </label>
          </div>
        )
      case 'communications':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>WhatsApp</span>
                <input type="text" value={draft.whatsapp || ''} onChange={(event) => updateSetting('whatsapp', event.target.value)} style={fieldStyle} placeholder="+852 1234 5678" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Instagram URL</span>
                <input type="url" value={draft.instagram_url || ''} onChange={(event) => updateSetting('instagram_url', event.target.value)} style={fieldStyle} placeholder="https://www.instagram.com/..." />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Facebook URL</span>
                <input type="url" value={draft.facebook_url || ''} onChange={(event) => updateSetting('facebook_url', event.target.value)} style={fieldStyle} placeholder="https://www.facebook.com/..." />
              </label>
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>Google Map URL</span>
              <input type="url" value={draft.google_map_url || ''} onChange={(event) => updateSetting('google_map_url', event.target.value)} style={fieldStyle} placeholder="https://maps.google.com/..." />
            </label>
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
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', overflowX: 'auto' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>時段步長（分鐘）</span>
                <select value={String(draft.slot_step_min || '30')} onChange={(event) => updateSetting('slot_step_min', event.target.value)} style={fieldStyle}>
                  {[15, 30, 60].map((value) => <option key={value} value={String(value)}>{value}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>預約緩衝時間（分鐘）</span>
                <input type="number" min="0" step="5" value={draft.default_buffer_min || '15'} onChange={(event) => updateSetting('default_buffer_min', event.target.value)} style={fieldStyle} />
              </label>
            </div>
          </div>
        )
      case 'daysOff':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>這裡設定全店共同公休日。勾選後，所有員工都會一併視為休息，前台可預約日期會即時反映。</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {DAY_OPTIONS.map((day) => {
                const active = daysOff.includes(day.key)
                return <button key={day.key} type="button" onClick={() => toggleDayOff(day.key)} className="btn-interactive" style={{ padding: '10px 16px', borderRadius: '999px', border: `1px solid ${active ? 'var(--primary)' : 'var(--gray)'}`, background: active ? 'var(--primary)' : '#fff', color: active ? '#fff' : 'var(--text-light)', fontWeight: 700, cursor: 'pointer' }}>{day.label}</button>
              })}
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.6 }}>目前全店公休日：{daysOff.length ? daysOff.map((day) => DAY_OPTIONS.find((item) => item.key === day)?.label || day).join('、') : '沒有'}</div>
          </div>
        )
      case 'admins':
        return (
          <div style={{ display: 'grid', gap: '12px' }}>
            {(adminDraft || []).length === 0 ? <EmptyState title="暫時沒有管理員帳號" description="請先建立會員資料，之後再勾選管理員權限。" /> : adminDraft.map((profile) => (
              <div key={profile.id} style={{ display: 'grid', gap: '10px', padding: '12px 14px', border: '1px solid var(--gray)', borderRadius: '12px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: compact ? 'flex-start' : 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{profile.full_name || profile.email || profile.id}</div>
                    <div style={{ marginTop: '4px', color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.5 }}>{profile.email || '沒有電郵'}{profile.phone ? ` / ${profile.phone}` : ''}</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                    <input type="checkbox" checked={profile.is_admin === true} disabled={!profile.auth_user_exists || profile.account_status !== 'ready'} onChange={(event) => setAdminDraft((current) => current.map((item) => (item.id === profile.id ? { ...item, is_admin: event.target.checked } : item)))} />
                    管理員
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <StatusPill tone={adminStatusTone(profile)}>{adminStatusText(profile)}</StatusPill>
                  <StatusPill tone="accent">Profile ID：{profile.id}</StatusPill>
                  <StatusPill tone={profile.auth_user_exists ? 'success' : 'danger'}>Auth：{profile.auth_user_exists ? '已找到' : '找不到'}</StatusPill>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.6 }}>{adminDiagnosticText(profile)}{profile.auth_email ? ` 目前 auth 電郵：${profile.auth_email}` : ''}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: compact ? 'stretch' : 'flex-end' }}>
              <button type="button" onClick={() => saveAdminProfiles?.(adminDraft)} disabled={!adminDirty || saving} className="btn btn-small btn-interactive" style={{ minWidth: compact ? '100%' : '148px' }}>{saving ? '儲存中...' : '儲存管理員設定'}</button>
            </div>
          </div>
        )
      case 'launchAudit':
        return (
          <div style={{ display: 'grid', gap: '12px' }}>
            {[
              '主頁、聯絡、分店地址、常見問題要有 SEO title / description。',
              '清走或隱藏 demo theme 頁，例如 Home/About/Contact demo pages。',
              '公開網域要由 Palace 舊域名切換到 PANDORA 正式域名，或設定清楚 redirect。',
              '付款方式要確認 Stripe live、人工付款、FPS/到店付款哪些正式保留。',
              '配送設定要配合頭皮護理服務，避免商品店語境誤導客人。',
              '結賬文案要講清楚套票付款後發放、預約扣次和取消回補。',
              '會員制度、積分、訊息、社交平台、假期設定要上線前逐項核對。',
            ].map((item) => (
              <div key={item} style={{ padding: '12px 14px', border: '1px solid #EEE7DE', borderRadius: '12px', background: '#fff', fontSize: '13px', lineHeight: 1.6, color: 'var(--text)' }}>
                {item}
              </div>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  const currentSection = SECTION_OPTIONS.find((section) => section.key === selectedSection) || SECTION_OPTIONS[0]

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="admin-card" style={{ padding: '20px 22px', background: 'linear-gradient(135deg, #fff, #FBF8F4)', border: '1px solid rgba(166, 139, 106, 0.22)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>系統設定</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>店舖與管理員設定</div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.6 }}>先在左側切換設定分類，再在右側集中編輯，避免整頁資料太長而難以操作。</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone={isDirty || adminDirty ? 'warning' : 'success'}>{isDirty || adminDirty ? '有未儲存變更' : '全部已儲存'}</StatusPill>
          {selectedSection !== 'admins' ? <button type="button" onClick={() => saveSettings(draft)} disabled={!isDirty || saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>{saving ? '儲存中...' : '儲存設定'}</button> : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(280px, 340px) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <AdminSection eyebrow="設定清單" title="設定分類" description="先選左邊分類，再在右邊集中編輯。">
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
        <AdminSection eyebrow="設定內容" title={currentSection.title} description={currentSection.description}>{renderSection()}</AdminSection>
      </div>
    </div>
  )
}


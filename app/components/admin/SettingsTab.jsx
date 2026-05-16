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

const SEO_PAGES = [
  { key: 'home', label: '首頁', path: '/' },
  { key: 'services', label: '服務', path: '/services' },
  { key: 'tickets', label: '套票', path: '/tickets' },
  { key: 'products', label: '產品', path: '/products' },
  { key: 'booking', label: '預約', path: '/booking' },
  { key: 'account', label: '會員', path: '/account' },
  { key: 'contact', label: '聯絡', path: '/contact' },
  { key: 'faq', label: 'FAQ', path: '/faq' },
  { key: 'articles', label: '文章', path: '/articles' },
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
    key: 'theme',
    title: '主題 / 外觀',
    description: '設定前台視覺語氣、主圖、分享圖與品牌外觀備註。',
  },
  {
    key: 'navigation',
    title: '選單目錄',
    description: '管理前台主選單、主要 CTA 與需要公開的功能入口。',
  },
  {
    key: 'policies',
    title: '條款及細則',
    description: '集中管理預約、更改、退款、私隱與套票使用條款。',
  },
  {
    key: 'seo',
    title: 'SEO / 分享設定',
    description: '管理主要公開頁面的標題、描述、關鍵字與 canonical path。',
  },
  {
    key: 'payment',
    title: '付款方式',
    description: '設定 Stripe、人工付款、FPS 與到店付款是否啟用。',
  },
  {
    key: 'fulfillment',
    title: '配送 / 到店使用',
    description: '設定套票、預約與產品的交付文案。',
  },
  {
    key: 'checkout',
    title: '結賬設定',
    description: '設定付款前提示、付款後說明與顧客須知。',
  },
  {
    key: 'membership',
    title: '會員制度',
    description: '設定註冊、會員稱呼、套票顯示與會員中心規則。',
  },
  {
    key: 'rewards',
    title: '獎賞積分',
    description: '設定是否啟用積分與基本兌換說明。',
  },
  {
    key: 'social',
    title: '社交媒體',
    description: '管理 Instagram、Facebook、Google Map 與公開社交連結。',
  },
  {
    key: 'messaging',
    title: '訊息設定',
    description: '管理 WhatsApp、查詢訊息與預約提醒文字。',
  },
  {
    key: 'integrations',
    title: '與其他平台連接',
    description: '管理 Google Analytics、Meta Pixel、Instagram Shop 與外部平台備註。',
  },
  {
    key: 'availability',
    title: '假期 / 公休日',
    description: '設定店舖營業時間、時段步長與預約緩衝時間。',
  },
  {
    key: 'daysOff',
    title: '全店公休日',
    description: '設定全店共同休息的星期，所有員工都會一併受影響。',
  },
  {
    key: 'admins',
    title: '帳戶資料 / 用戶',
    description: '查看哪些會員已具備後台管理權限，並同步登入狀態。',
  },
  {
    key: 'apps',
    title: 'Apps / 功能模組',
    description: '對照 ThinkShops Apps，把預約、商品、套票、內容模組清楚標記啟用狀態。',
  },
  {
    key: 'launchAudit',
    title: '上線清潔檢查',
    description: '用 ThinkShops 架構檢查示範頁、SEO 空白、舊網域、付款與會員設定。',
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
  const [audit, setAudit] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [paymentRuntime, setPaymentRuntime] = useState(null)

  useEffect(() => {
    setDraft(settings || {})
  }, [settings])

  useEffect(() => {
    setAdminDraft(memberProfiles || [])
  }, [memberProfiles])

  useEffect(() => {
    if (selectedSection !== 'launchAudit') return
    const loadAudit = async () => {
      setAuditLoading(true)
      try {
        const response = await fetch('/api/admin/settings/audit', { credentials: 'include', cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        setAudit(response.ok ? payload : { error: payload?.error || '上線檢查載入失敗' })
      } catch (error) {
        setAudit({ error: error?.message || '上線檢查載入失敗' })
      } finally {
        setAuditLoading(false)
      }
    }
    loadAudit()
  }, [selectedSection])

  useEffect(() => {
    if (selectedSection !== 'payment') return
    let cancelled = false
    const loadPaymentRuntime = async () => {
      try {
        const response = await fetch('/api/public/settings', { credentials: 'include', cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!cancelled) setPaymentRuntime(payload?.settings || {})
      } catch {
        if (!cancelled) setPaymentRuntime(null)
      }
    }
    loadPaymentRuntime()
    return () => {
      cancelled = true
    }
  }, [selectedSection])

  const businessHours = parseBusinessHours(draft?.business_hours)
  const daysOff = normalizeDaysOff(draft?.days_off)
  const isDirty = JSON.stringify(draft || {}) !== JSON.stringify(settings || {})
  const adminDirty = JSON.stringify(adminDraft || []) !== JSON.stringify(memberProfiles || [])

  const sectionStatus = useMemo(
    () => ({
      profile: draft?.shop_name ? '已填店舖資料' : '待填店舖資料',
      website: draft?.site_url ? '已填公開網址' : '待填公開網址',
      theme: draft?.theme_name || draft?.hero_image_url || draft?.og_image_url ? '已設定外觀' : '待設定外觀',
      navigation: draft?.primary_cta_label || draft?.primary_cta_path ? '已設定主選單' : '待設定主選單',
      policies: draft?.booking_policy || draft?.refund_policy || draft?.terms_notice ? '已填條款' : '待補條款',
      seo: draft?.seo_title && draft?.seo_description ? '已填主 SEO' : '待補 SEO',
      payment: draft?.stripe_enabled === 'true' || draft?.manual_payment_enabled === 'true' ? '已設定付款方向' : '待設定付款方向',
      fulfillment: draft?.fulfillment_note ? '已填到店說明' : '待填使用說明',
      checkout: draft?.checkout_notice ? '已填結賬提示' : '待填結賬提示',
      membership: draft?.member_registration_enabled !== 'false' ? '開放會員註冊' : '已關閉註冊',
      rewards: draft?.reward_points_enabled === 'true' ? '已啟用積分' : '未啟用積分',
      social: draft?.instagram_url || draft?.facebook_url || draft?.google_map_url ? '已填社交連結' : '待填社交連結',
      messaging: draft?.whatsapp ? '已填 WhatsApp' : '待填訊息入口',
      integrations: draft?.google_analytics_id || draft?.facebook_pixel_id ? '已填追蹤工具' : '待接追蹤工具',
      availability: draft?.business_hours ? '已設定營業時間' : '未設定營業時間',
      daysOff: daysOff.length ? `已選 ${daysOff.length} 日` : '沒有全店公休日',
      admins: adminDraft.filter((profile) => profile?.is_admin === true).length
        ? `${adminDraft.filter((profile) => profile?.is_admin === true).length} 位管理員`
        : '未指定管理員',
      apps: '核心模組已列出',
      launchAudit: '待逐項核對',
    }),
    [adminDraft, daysOff.length, draft],
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
              ThinkShops 對照項目：網站狀態、公開網域、主頁 SEO、404 頁、商品/活動/預約/網誌功能開關。正式上線前，避免公開頁仍留有示範主題頁或舊 Palace 命名。
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
      case 'theme':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              ThinkShops 的外觀設定會影響前台第一印象。PANDORA 預設以暖白、霧米、深木色、鼠尾草綠和柔金作 head spa wellness 風格。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>主題名稱</span>
                <input type="text" value={draft.theme_name || ''} onChange={(event) => updateSetting('theme_name', event.target.value)} style={fieldStyle} placeholder="Pandora Wellness" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>品牌語氣</span>
                <input type="text" value={draft.brand_tone || ''} onChange={(event) => updateSetting('brand_tone', event.target.value)} style={fieldStyle} placeholder="高級、安靜、乾淨、頭皮養生" />
              </label>
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>首頁主圖 URL</span>
              <input type="url" value={draft.hero_image_url || ''} onChange={(event) => updateSetting('hero_image_url', event.target.value)} style={fieldStyle} placeholder="https://..." />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>分享圖片 / OG Image URL</span>
              <input type="url" value={draft.og_image_url || ''} onChange={(event) => updateSetting('og_image_url', event.target.value)} style={fieldStyle} placeholder="https://..." />
            </label>
          </div>
        )
      case 'navigation':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>主要 CTA 文字</span>
                <input type="text" value={draft.primary_cta_label || ''} onChange={(event) => updateSetting('primary_cta_label', event.target.value)} style={fieldStyle} placeholder="立即預約" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>主要 CTA 路徑</span>
                <input type="text" value={draft.primary_cta_path || ''} onChange={(event) => updateSetting('primary_cta_path', event.target.value)} style={fieldStyle} placeholder="/booking" />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                ['nav_services_enabled', '服務'],
                ['nav_tickets_enabled', '套票'],
                ['nav_products_enabled', '產品'],
                ['nav_articles_enabled', '文章'],
                ['nav_faq_enabled', 'FAQ'],
                ['nav_account_enabled', '會員中心'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                  <input type="checkbox" checked={draft[key] !== 'false'} onChange={(event) => updateSetting(key, event.target.checked ? 'true' : 'false')} />
                  顯示{label}
                </label>
              ))}
            </div>
          </div>
        )
      case 'policies':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              ['booking_policy', '預約及改期政策', '例如：如需更改預約，請提前 24 小時聯絡。'],
              ['ticket_terms', '套票使用條款', '例如：套票只限本人使用，逾期或已使用次數不設退款。'],
              ['refund_policy', '退款政策', '例如：已確認付款的套票按店舖政策處理。'],
              ['privacy_notice', '私隱政策摘要', '例如：會員資料只作預約、訂單與客服用途。'],
              ['terms_notice', '一般條款摘要', '例如：PANDORA HEAD SPA 保留服務安排之最終決定權。'],
            ].map(([key, label, placeholder]) => (
              <label key={key} style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>{label}</span>
                <textarea value={draft[key] || ''} onChange={(event) => updateSetting(key, event.target.value)} style={{ ...fieldStyle, minHeight: '84px', resize: 'vertical' }} placeholder={placeholder} />
              </label>
            ))}
          </div>
        )
      case 'seo':
        return (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              主要公開頁 SEO 使用 settings key pattern，例如 <code>seo.home.title</code>、<code>seo.tickets.description</code>。主頁 fallback 仍會使用上方 SEO 標題與描述。
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #EEE7DE', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#FAF8F5', color: 'var(--text-light)' }}>
                    {['頁面', 'Canonical path', 'SEO 標題', 'SEO 描述', '關鍵字'].map((heading) => <th key={heading} style={{ padding: '10px', textAlign: 'left' }}>{heading}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {SEO_PAGES.map((page) => (
                    <tr key={page.key} style={{ borderTop: '1px solid #F1ECE4' }}>
                      <td style={{ padding: '10px', fontWeight: 800 }}>{page.label}</td>
                      <td style={{ padding: '10px' }}>
                        <input value={draft[`seo.${page.key}.path`] || page.path} onChange={(event) => updateSetting(`seo.${page.key}.path`, event.target.value)} style={fieldStyle} />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input value={draft[`seo.${page.key}.title`] || ''} onChange={(event) => updateSetting(`seo.${page.key}.title`, event.target.value)} style={fieldStyle} placeholder={`${page.label}｜PANDORA HEAD SPA`} />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input value={draft[`seo.${page.key}.description`] || ''} onChange={(event) => updateSetting(`seo.${page.key}.description`, event.target.value)} style={fieldStyle} placeholder="輸入搜尋摘要" />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input value={draft[`seo.${page.key}.keywords`] || ''} onChange={(event) => updateSetting(`seo.${page.key}.keywords`, event.target.value)} style={fieldStyle} placeholder="頭皮護理, Head Spa" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'payment':
        const stripeCheckoutReady = paymentRuntime?.stripe_checkout_ready === 'true'
        const stripeEnabled = draft.stripe_enabled === 'true'
        const stripeStatusTone = !stripeEnabled ? 'warning' : stripeCheckoutReady ? 'success' : 'danger'
        const stripeStatusText = !stripeEnabled ? 'Stripe 未啟用' : stripeCheckoutReady ? 'Stripe Checkout 可用' : 'Stripe secret 未設定'
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              PANDORA 第一版以 Stripe 線上付款為主，人工確認付款保留作後備；FPS 與到店付款只作人工確認付款的營運提示。
            </div>
            <div style={{ display: 'grid', gap: '10px', padding: '14px', borderRadius: '12px', border: `1px solid ${stripeCheckoutReady ? '#BBF7D0' : '#FECACA'}`, background: stripeCheckoutReady ? '#F0FDF4' : '#FEF2F2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <strong>Stripe 上線狀態</strong>
                <StatusPill tone={stripeStatusTone}>{stripeStatusText}</StatusPill>
              </div>
              <div style={{ color: 'var(--text-light)', fontSize: '12px', lineHeight: 1.7 }}>
                Stripe secret 不會儲存在後台設定表。請在 Vercel Environment Variables 填入 <code>STRIPE_SECRET_KEY</code>、<code>STRIPE_WEBHOOK_SECRET</code>、<code>STRIPE_CURRENCY=hkd</code>，並在 Stripe Dashboard 設定 webhook endpoint：<code>https://pandora-spa.vercel.app/api/stripe/webhook</code>。未完成前，前台會自動隱藏 Stripe 並保留人工確認付款。
              </div>
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
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={draft.fps_enabled === 'true'} onChange={(event) => updateSetting('fps_enabled', event.target.checked ? 'true' : 'false')} />
                FPS / 轉數快提示
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={draft.pay_at_shop_enabled === 'true'} onChange={(event) => updateSetting('pay_at_shop_enabled', event.target.checked ? 'true' : 'false')} />
                到店付款提示
              </label>
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>FPS / 轉數快備註</span>
              <input type="text" value={draft.fps_note || ''} onChange={(event) => updateSetting('fps_note', event.target.value)} style={fieldStyle} placeholder="例如：付款後請上傳截圖或 WhatsApp 店員確認" />
            </label>
          </div>
        )
      case 'fulfillment':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>配送 / 到店使用說明</span>
              <input type="text" value={draft.fulfillment_note || ''} onChange={(event) => updateSetting('fulfillment_note', event.target.value)} style={fieldStyle} placeholder="套票及預約服務無需配送，到店使用。" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>產品取貨 / 配送說明</span>
              <textarea value={draft.product_fulfillment_note || ''} onChange={(event) => updateSetting('product_fulfillment_note', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="產品可到店取貨；如需配送，請先與店員確認。" />
            </label>
          </div>
        )
      case 'checkout':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>結賬提示文案</span>
              <textarea value={draft.checkout_notice || ''} onChange={(event) => updateSetting('checkout_notice', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="完成付款後，套票會自動加入會員帳戶；如選擇人工付款，需由店員確認後才會發放。" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>付款成功提示</span>
              <textarea value={draft.payment_success_notice || ''} onChange={(event) => updateSetting('payment_success_notice', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="付款成功後，可到會員中心查看套票或訂單狀態。" />
            </label>
          </div>
        )
      case 'membership':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
              <input type="checkbox" checked={draft.member_registration_enabled !== 'false'} onChange={(event) => updateSetting('member_registration_enabled', event.target.checked ? 'true' : 'false')} />
              開放會員註冊
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>會員稱呼</span>
              <input type="text" value={draft.member_label || ''} onChange={(event) => updateSetting('member_label', event.target.value)} style={fieldStyle} placeholder="會員" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>套票顯示規則</span>
              <select value={draft.ticket_visibility || 'show_active_and_pending'} onChange={(event) => updateSetting('ticket_visibility', event.target.value)} style={fieldStyle}>
                <option value="show_active_and_pending">顯示可用套票與待付款訂單</option>
                <option value="show_active_only">只顯示可用套票</option>
              </select>
            </label>
          </div>
        )
      case 'rewards':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
              <input type="checkbox" checked={draft.reward_points_enabled === 'true'} onChange={(event) => updateSetting('reward_points_enabled', event.target.checked ? 'true' : 'false')} />
              啟用獎賞積分
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>積分說明</span>
              <textarea value={draft.reward_points_note || ''} onChange={(event) => updateSetting('reward_points_note', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="第一版可先關閉；日後再設定賺取與兌換規則。" />
            </label>
          </div>
        )
      case 'social':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
      case 'messaging':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>WhatsApp</span>
              <input type="text" value={draft.whatsapp || ''} onChange={(event) => updateSetting('whatsapp', event.target.value)} style={fieldStyle} placeholder="+852 1234 5678" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>查詢預設訊息</span>
              <textarea value={draft.whatsapp_default_message || ''} onChange={(event) => updateSetting('whatsapp_default_message', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="你好，我想查詢 PANDORA HEAD SPA 頭皮護理服務。" />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>預約提醒文字</span>
              <textarea value={draft.booking_reminder_note || ''} onChange={(event) => updateSetting('booking_reminder_note', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="請準時到店，如需更改預約請提前聯絡。" />
            </label>
          </div>
        )
      case 'integrations':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              這裡對齊 ThinkShops 的外部平台連接。第一版先保存追蹤 ID 與營運備註，正式埋碼時由前台讀取設定接入。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Google Analytics ID</span>
                <input type="text" value={draft.google_analytics_id || ''} onChange={(event) => updateSetting('google_analytics_id', event.target.value)} style={fieldStyle} placeholder="G-XXXXXXXXXX" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Meta Pixel ID</span>
                <input type="text" value={draft.facebook_pixel_id || ''} onChange={(event) => updateSetting('facebook_pixel_id', event.target.value)} style={fieldStyle} placeholder="1234567890" />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={draft.meta_catalog_enabled === 'true'} onChange={(event) => updateSetting('meta_catalog_enabled', event.target.checked ? 'true' : 'false')} />
                Meta Catalog / Shop 已準備
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={draft.instagram_shop_enabled === 'true'} onChange={(event) => updateSetting('instagram_shop_enabled', event.target.checked ? 'true' : 'false')} />
                Instagram Shop 已準備
              </label>
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>平台連接備註</span>
              <textarea value={draft.integration_note || ''} onChange={(event) => updateSetting('integration_note', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="記錄 GA、Meta、IG Shop、Google Business Profile 等接入狀態。" />
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
      case 'apps':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              這不是安裝新外掛，而是把 PANDORA 目前已實作的營運模組按 ThinkShops Apps 方式列出，方便上線前確認前台及後台是否開放。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {[
                ['feature_booking_enabled', '預約模組'],
                ['feature_tickets_enabled', '套票模組'],
                ['feature_products_enabled', '產品模組'],
                ['feature_coupons_enabled', '優惠碼模組'],
                ['feature_articles_enabled', '文章模組'],
                ['feature_faq_enabled', 'FAQ 模組'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                  <input type="checkbox" checked={draft[key] !== 'false'} onChange={(event) => updateSetting(key, event.target.checked ? 'true' : 'false')} />
                  {label}
                </label>
              ))}
            </div>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>功能模組備註</span>
              <textarea value={draft.apps_note || ''} onChange={(event) => updateSetting('apps_note', event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} placeholder="例如：正式上線先開預約、套票、產品；文章可先隱藏。" />
            </label>
          </div>
        )
      case 'launchAudit':
        return (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.7 }}>
              此檢查會讀取後台 settings，並掃描 app / lib / launch 文件中是否仍有舊品牌、亂碼或示範測試字眼。
            </div>
            {auditLoading ? <div style={{ padding: '14px', color: 'var(--text-light)' }}>正在檢查...</div> : null}
            {audit?.error ? <div style={{ padding: '14px', border: '1px solid #FECACA', borderRadius: '12px', background: '#FEF2F2', color: '#B91C1C' }}>{audit.error}</div> : null}
            {audit?.summary ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <StatusPill tone="success">通過 {audit.summary.pass}</StatusPill>
                <StatusPill tone={audit.summary.warning ? 'warning' : 'success'}>需檢查 {audit.summary.warning}</StatusPill>
                <StatusPill tone={audit.summary.fail ? 'danger' : 'success'}>阻塞 {audit.summary.fail}</StatusPill>
              </div>
            ) : null}
            {(audit?.checks || []).map((item) => (
              <div key={item.id} style={{ padding: '12px 14px', border: '1px solid #EEE7DE', borderRadius: '12px', background: '#fff', fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{item.label}</strong>
                  <StatusPill tone={item.status === 'pass' ? 'success' : item.status === 'fail' ? 'danger' : 'warning'}>{item.status === 'pass' ? '通過' : item.status === 'fail' ? '阻塞' : '需檢查'}</StatusPill>
                </div>
                <div style={{ color: 'var(--text-light)' }}>{item.detail}</div>
              </div>
            ))}
            {!auditLoading && !audit?.checks ? (
              <div style={{ padding: '12px 14px', border: '1px solid #EEE7DE', borderRadius: '12px', background: '#fff', fontSize: '13px', lineHeight: 1.6 }}>
                主頁、聯絡、分店地址、常見問題、付款方式、配送設定、會員制度、社交平台、訊息與假期設定均需於上線前逐項核對。
              </div>
            ) : null}
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


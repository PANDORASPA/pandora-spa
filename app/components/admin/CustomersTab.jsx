'use client'

import { useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, SummaryPill, fieldStyle, formatMoney } from './opsUi'

const formatDate = (value) => {
  if (!value) return '-'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return String(value)
  return new Date(timestamp).toLocaleString('zh-HK')
}

const normalizeText = (value) => String(value || '').trim()

const getStatusMeta = (profile) => {
  const hasAuth = profile?.auth_user_exists === true
  const hasProfileCore = Boolean(profile?.full_name && profile?.phone && (profile?.email || profile?.auth_email))

  if (!hasAuth) return { label: '未完成註冊', tone: 'warning', description: '只有會員資料，未找到對應登入帳號。' }
  if (!hasProfileCore) return { label: '缺少 Profile', tone: 'danger', description: '已有登入帳號，但姓名、電話或電郵未完整。' }
  return { label: '已啟用', tone: 'success', description: '會員帳號與登入帳號已對上。' }
}

const authDiagnostic = (profile) => {
  if (!profile?.id) return '缺少會員資料列。'
  if (!profile?.auth_user_exists) return '找不到對應登入帳號。'
  if (profile?.auth_email && profile?.email && profile.auth_email !== profile.email) {
    return `登入電郵為 ${profile.auth_email}，會員資料電郵為 ${profile.email}。`
  }
  return '已找到對應登入帳號。'
}

const matchesByProfile = (row, profile) => {
  const profileId = String(profile?.id || '')
  const profilePhone = normalizeText(profile?.phone)
  const profileEmail = normalizeText(profile?.auth_email || profile?.email).toLowerCase()
  const rowUserId = normalizeText(row?.member_user_id || row?.user_id || row?.profile_id)
  const rowCustomerId = normalizeText(row?.customer_id)
  const rowPhone = normalizeText(row?.phone || row?.customer_phone || row?.mobile || row?.user_phone)
  const rowEmail = normalizeText(row?.email || row?.customer_email || row?.user_email).toLowerCase()

  return (
    (profileId && rowUserId === profileId) ||
    (profileId && rowCustomerId === profileId) ||
    (profilePhone && rowPhone && rowPhone === profilePhone) ||
    (profileEmail && rowEmail && rowEmail === profileEmail)
  )
}

const matchesLegacyCustomer = (legacy, profile) => {
  const legacyId = String(legacy?.id || '')
  const profileId = String(profile?.id || '')
  const legacyPhone = normalizeText(legacy?.phone || legacy?.mobile || legacy?.customer_phone)
  const legacyEmail = normalizeText(legacy?.email || legacy?.customer_email).toLowerCase()
  const profilePhone = normalizeText(profile?.phone)
  const profileEmail = normalizeText(profile?.auth_email || profile?.email).toLowerCase()

  return (
    (legacyId && profileId && legacyId === profileId) ||
    (legacyPhone && profilePhone && legacyPhone === profilePhone) ||
    (legacyEmail && profileEmail && legacyEmail === profileEmail)
  )
}

const buildRecentActivity = ({ bookings = [], orders = [], transactions = [] }) =>
  [
    ...bookings.map((item) => ({
      kind: '預約',
      when: item?.appointment_date || item?.date || item?.created_at,
      title: item?.service_name || item?.service || `預約 #${item?.id || '-'}`,
      amount: Number(item?.final_price || item?.service_price || 0),
      status: item?.status || 'pending',
    })),
    ...orders.map((item) => ({
      kind: '訂單',
      when: item?.created_at || item?.ordered_at || item?.date,
      title: item?.ref || item?.order_no || item?.order_number || `訂單 #${item?.id || '-'}`,
      amount: Number(item?.total || 0),
      status: item?.status || item?.payment_status || 'pending',
    })),
    ...transactions.map((item) => ({
      kind: '交易',
      when: item?.occurred_at || item?.created_at || item?.date,
      title: item?.ref || item?.payment_ref || `交易 #${item?.id || '-'}`,
      amount: Number(item?.amount || 0),
      status: item?.status || 'completed',
    })),
  ]
    .filter((item) => item.when)
    .sort((a, b) => Date.parse(b.when || '') - Date.parse(a.when || ''))
    .slice(0, 6)

export default function CustomersTab({ memberProfiles = [], users = [], bookings = [], orders = [], transactions = [], userTickets = [], compact = false }) {
  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [adminFilter, setAdminFilter] = useState('all')

  const accountRows = useMemo(() => {
    return (memberProfiles || []).map((profile) => {
      const matchedBookings = (bookings || []).filter((item) => matchesByProfile(item, profile))
      const matchedOrders = (orders || []).filter((item) => matchesByProfile(item, profile))
      const matchedTransactions = (transactions || []).filter((item) => {
        if (matchesByProfile(item, profile)) return true
        return matchedOrders.some((order) => String(order?.id) === String(item?.order_id)) || matchedBookings.some((booking) => String(booking?.id) === String(item?.booking_id))
      })
      const matchedTickets = (userTickets || []).filter((item) => matchesByProfile(item, profile))
      const matchedLegacyCustomers = (users || []).filter((item) => matchesLegacyCustomer(item, profile))
      const totalSpend = matchedBookings.reduce((sum, item) => sum + Number(item?.final_price || item?.service_price || 0), 0) + matchedOrders.reduce((sum, item) => sum + Number(item?.total || 0), 0)
      const status = getStatusMeta(profile)

      return {
        ...profile,
        __status: status,
        __bookings: matchedBookings,
        __orders: matchedOrders,
        __transactions: matchedTransactions,
        __tickets: matchedTickets,
        __legacyCustomers: matchedLegacyCustomers,
        __spend: totalSpend,
        __recent: buildRecentActivity({ bookings: matchedBookings, orders: matchedOrders, transactions: matchedTransactions }),
      }
    })
  }, [memberProfiles, bookings, orders, transactions, userTickets, users])

  const orphanLegacyCustomers = useMemo(() => (users || []).filter((legacy) => !accountRows.some((profile) => matchesLegacyCustomer(legacy, profile))), [users, accountRows])

  const filteredAccounts = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    return accountRows.filter((profile) => {
      const statusLabel = profile.__status?.label || ''
      const haystack = [profile?.full_name, profile?.email, profile?.auth_email, profile?.phone, profile?.id, statusLabel].filter(Boolean).join(' ').toLowerCase()
      const matchesSearch = !needle || haystack.includes(needle)
      const matchesStatus = statusFilter === 'all' || statusLabel === statusFilter
      const matchesAdmin = adminFilter === 'all' || (adminFilter === 'admin' ? profile?.is_admin === true : profile?.is_admin !== true)
      return matchesSearch && matchesStatus && matchesAdmin
    })
  }, [accountRows, searchTerm, statusFilter, adminFilter])

  const selectedAccount = filteredAccounts.find((item) => item.id === selectedProfileId) || filteredAccounts[0] || null

  return (
    <div className="admin-page-stack">
      <SectionHeader
        eyebrow="顧客"
        title="會員帳號管理"
        description="以會員帳號為主，查看姓名、電郵、電話、登入狀態、管理員權限、預約、訂單、套票與交易摘要。"
        actions={<Pill>{filteredAccounts.length} 位會員</Pill>}
      />

      <RecordFilterBar columns={compact ? '1fr' : 'minmax(220px, 1.4fr) repeat(2, minmax(180px, 220px))'}>
        <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜尋姓名、電郵、電話或 Profile ID" style={fieldStyle} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={fieldStyle}>
          <option value="all">全部帳號狀態</option>
          <option value="已啟用">已啟用</option>
          <option value="未完成註冊">未完成註冊</option>
          <option value="缺少 Profile">缺少 Profile</option>
        </select>
        <select value={adminFilter} onChange={(event) => setAdminFilter(event.target.value)} style={fieldStyle}>
          <option value="all">全部權限</option>
          <option value="admin">管理員</option>
          <option value="member">一般會員</option>
        </select>
      </RecordFilterBar>

      <div className="admin-metric-grid">
        <SummaryPill label="會員帳號" value={accountRows.length} />
        <SummaryPill label="已啟用" value={accountRows.filter((item) => item.__status?.label === '已啟用').length} tone="success" />
        <SummaryPill label="未完成註冊" value={accountRows.filter((item) => item.__status?.label === '未完成註冊').length} tone="warning" />
        <SummaryPill label="未綁定舊顧客資料" value={orphanLegacyCustomers.length} tone={orphanLegacyCustomers.length ? 'warning' : 'default'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(320px, 420px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)', display: 'grid', gap: '12px' }}>
          {filteredAccounts.length === 0 ? (
            <EmptyState title="找不到會員帳號" description="請調整搜尋條件，或先建立會員帳號後再回來查看。" />
          ) : (
            filteredAccounts.map((profile) => {
              const active = selectedAccount?.id === profile.id
              const primaryEmail = profile?.auth_email || profile?.email || '-'
              return (
                <button key={profile.id} type="button" onClick={() => setSelectedProfileId(profile.id)} className="admin-account-row" style={{ background: active ? 'rgba(166, 139, 106, 0.08)' : '#fff', borderColor: active ? 'rgba(166, 139, 106, 0.35)' : 'var(--gray)' }}>
                  <div>
                    <div style={{ fontWeight: 850 }}>{profile.full_name || primaryEmail || `會員 #${profile.id}`}</div>
                    <div className="admin-muted-line">{primaryEmail} / {profile.phone || '沒有電話'}</div>
                  </div>
                  <div className="admin-inline-actions">
                    <Pill tone={profile.__status?.tone}>{profile.__status?.label}</Pill>
                    {profile.is_admin ? <Pill tone="success">管理員</Pill> : null}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {selectedAccount ? (
          <div className="admin-page-stack">
            <div className="admin-card admin-command-panel">
              <div>
                <div className="admin-eyebrow">會員詳情</div>
                <div className="admin-command-title">{selectedAccount.full_name || selectedAccount.auth_email || selectedAccount.email || `會員 #${selectedAccount.id}`}</div>
                <div className="admin-command-description">{authDiagnostic(selectedAccount)} {selectedAccount.__status?.description}</div>
              </div>
              <div className="admin-inline-actions">
                <Pill tone={selectedAccount.__status?.tone}>{selectedAccount.__status?.label}</Pill>
                {selectedAccount.is_admin ? <Pill tone="success">管理員</Pill> : <Pill>一般會員</Pill>}
              </div>
            </div>

            <div className="admin-detail-grid">
              <DetailCard label="Profile ID" value={selectedAccount.id} />
              <DetailCard label="電郵" value={selectedAccount.auth_email || selectedAccount.email || '-'} />
              <DetailCard label="電話" value={selectedAccount.phone || '-'} />
              <DetailCard label="總消費" value={formatMoney(selectedAccount.__spend || 0, '$')} />
              <DetailCard label="預約" value={selectedAccount.__bookings.length} />
              <DetailCard label="訂單" value={selectedAccount.__orders.length} />
              <DetailCard label="持有套票" value={selectedAccount.__tickets.length} />
              <DetailCard label="舊顧客資料列" value={selectedAccount.__legacyCustomers.length} />
            </div>

            <Panel title="會員套票">
              {selectedAccount.__tickets.length ? (
                selectedAccount.__tickets.map((ticket) => (
                  <div key={ticket.id} className="admin-list-row">
                    <div>
                      <div style={{ fontWeight: 800 }}>{ticket.ticket_name || ticket.name || `套票 #${ticket.id}`}</div>
                      <div className="admin-muted-line">到期日：{ticket.expiry_date || ticket.expires_at || '未設定'}</div>
                    </div>
                    <Pill tone={Number(ticket.remaining_count || ticket.remaining || 0) > 0 ? 'success' : 'warning'}>{Number(ticket.remaining_count || ticket.remaining || 0)} 次</Pill>
                  </div>
                ))
              ) : (
                <EmptyState title="暫時沒有套票" description="會員購買或匯入舊套票後，會在這裡顯示餘額。" />
              )}
            </Panel>

            <Panel title="最近活動">
              {selectedAccount.__recent.length ? (
                selectedAccount.__recent.map((activity, index) => (
                  <div key={`${activity.kind}-${index}`} className="admin-list-row">
                    <div>
                      <div style={{ fontWeight: 800 }}>{activity.kind} / {activity.title}</div>
                      <div className="admin-muted-line">{formatDate(activity.when)} / {activity.status}</div>
                    </div>
                    <div style={{ fontWeight: 800 }}>{formatMoney(activity.amount || 0, '$')}</div>
                  </div>
                ))
              ) : (
                <EmptyState title="暫時沒有活動" description="預約、訂單和交易會在這裡集中顯示。" />
              )}
            </Panel>
          </div>
        ) : (
          <EmptyState title="請先選擇會員" description="左邊選擇一位會員後，右邊會顯示帳號、套票和活動摘要。" />
        )}
      </div>

      {orphanLegacyCustomers.length ? (
        <Panel title="未綁定帳號的舊顧客資料">
          {orphanLegacyCustomers.slice(0, 8).map((legacy) => (
            <div key={legacy.id} className="admin-list-row">
              <div>
                <div style={{ fontWeight: 800 }}>{legacy?.name || legacy?.full_name || `舊顧客 #${legacy?.id || '-'}`}</div>
                <div className="admin-muted-line">{legacy?.email || '-'} / {legacy?.phone || legacy?.mobile || '-'}</div>
              </div>
              <Pill tone="warning">待對照</Pill>
            </div>
          ))}
        </Panel>
      ) : null}
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div className="admin-card admin-metric-card">
      <div className="admin-metric-label">{label}</div>
      <div className="admin-metric-value" style={{ fontSize: '18px' }}>{value || '-'}</div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="admin-card" style={{ padding: '18px', border: '1px solid rgba(166, 139, 106, 0.16)', display: 'grid', gap: '12px' }}>
      <div style={{ fontWeight: 850, color: 'var(--text)' }}>{title}</div>
      {children}
    </div>
  )
}

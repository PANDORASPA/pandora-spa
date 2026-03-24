'use client'

import { useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, SummaryPill, fieldStyle, formatMoney } from './opsUi'

const formatDate = (value) => {
  if (!value) return '-'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return String(value)
  return new Date(timestamp).toLocaleString()
}

const normalizeText = (value) => String(value || '').trim()

const getStatusMeta = (profile) => {
  const hasAuth = profile?.auth_user_exists === true
  const hasProfileCore = Boolean(profile?.full_name && profile?.phone && (profile?.email || profile?.auth_email))

  if (!hasAuth) {
    return { label: '未完成註冊', tone: 'warning', description: '只有會員資料，未找到對應登入帳號。' }
  }
  if (!hasProfileCore) {
    return { label: '缺少 Profile', tone: 'danger', description: '已有登入帳號，但姓名、電話或電郵未完整。' }
  }
  return { label: '已啟用', tone: 'success', description: '會員帳號與登入帳號已對上。' }
}

const authDiagnostic = (profile) => {
  if (!profile?.id) return '缺少會員資料列'
  if (!profile?.auth_user_exists) return '找不到對應登入帳號'
  if (profile?.auth_email && profile?.email && profile.auth_email !== profile.email) {
    return `登入電郵為 ${profile.auth_email}，會員資料電郵為 ${profile.email}`
  }
  return '已找到對應登入帳號'
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

export default function CustomersTab({
  memberProfiles = [],
  users = [],
  bookings = [],
  orders = [],
  transactions = [],
  userTickets = [],
  compact = false,
}) {
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
      const totalSpend =
        matchedBookings.reduce((sum, item) => sum + Number(item?.final_price || item?.service_price || 0), 0) +
        matchedOrders.reduce((sum, item) => sum + Number(item?.total || 0), 0)
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
        __recent: buildRecentActivity({
          bookings: matchedBookings,
          orders: matchedOrders,
          transactions: matchedTransactions,
        }),
      }
    })
  }, [memberProfiles, bookings, orders, transactions, userTickets, users])

  const orphanLegacyCustomers = useMemo(() => {
    return (users || []).filter((legacy) => !accountRows.some((profile) => matchesLegacyCustomer(legacy, profile)))
  }, [users, accountRows])

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
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="顧客"
        title="會員帳號管理"
        description="以會員帳號為主，查看姓名、電郵、電話、登入狀態、管理員權限，以及相關預約與交易摘要。"
        actions={<Pill>{filteredAccounts.length} 位會員</Pill>}
      />

      <RecordFilterBar columns={compact ? '1fr' : 'minmax(220px, 1.4fr) repeat(2, minmax(180px, 220px))'}>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="搜尋姓名、電郵、電話或 Profile ID"
          style={fieldStyle}
        />
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

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
        <SummaryPill label="會員帳號" value={accountRows.length} />
        <SummaryPill label="已啟用" value={accountRows.filter((item) => item.__status?.label === '已啟用').length} tone="success" />
        <SummaryPill label="未完成註冊" value={accountRows.filter((item) => item.__status?.label === '未完成註冊').length} tone="warning" />
        <SummaryPill label="未綁定舊客戶資料" value={orphanLegacyCustomers.length} tone={orphanLegacyCustomers.length ? 'warning' : 'default'} />
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
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className="btn btn-interactive"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: active ? 'rgba(166, 139, 106, 0.08)' : '#fff',
                    border: active ? '1px solid rgba(166, 139, 106, 0.35)' : '1px solid var(--gray)',
                    borderRadius: '16px',
                    padding: '14px',
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{profile?.full_name || '未命名會員'}</div>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-light)', wordBreak: 'break-all' }}>{primaryEmail}</div>
                    </div>
                    {profile?.is_admin ? <Pill tone="warning">管理員</Pill> : <Pill tone="muted">一般會員</Pill>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>{profile?.phone || '未填電話'}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Pill tone={profile.__status?.tone}>{profile.__status?.label}</Pill>
                    <Pill tone={profile?.auth_user_exists ? 'success' : 'danger'}>{profile?.auth_user_exists ? '可登入' : '無登入帳號'}</Pill>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {selectedAccount ? (
          <div className="admin-card" style={{ padding: '20px', border: '1px solid var(--gray)', display: 'grid', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>會員帳號</div>
                <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800 }}>{selectedAccount?.full_name || '未命名會員'}</div>
                <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', wordBreak: 'break-all' }}>{selectedAccount?.auth_email || selectedAccount?.email || '未填電郵'}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Pill tone={selectedAccount.__status?.tone}>{selectedAccount.__status?.label}</Pill>
                {selectedAccount?.is_admin ? <Pill tone="warning">管理員</Pill> : <Pill tone="muted">一般會員</Pill>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <SummaryPill label="預約" value={selectedAccount.__bookings.length} />
              <SummaryPill label="訂單" value={selectedAccount.__orders.length} />
              <SummaryPill label="交易" value={selectedAccount.__transactions.length} />
              <SummaryPill label="累計消費" value={formatMoney(selectedAccount.__spend, '')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              <DetailCard label="Profile ID" value={selectedAccount?.id || '-'} mono />
              <DetailCard label="電話" value={selectedAccount?.phone || '未填寫'} />
              <DetailCard label="會員資料電郵" value={selectedAccount?.email || '未填寫'} />
              <DetailCard label="登入帳號電郵" value={selectedAccount?.auth_email || '找不到對應登入帳號'} />
              <DetailCard label="建立日期" value={formatDate(selectedAccount?.created_at)} />
              <DetailCard label="帳號診斷" value={authDiagnostic(selectedAccount)} />
            </div>

            <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>附屬營運資料</div>
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                <DetailCard label="套票 / 票券" value={selectedAccount.__tickets.length} />
                <DetailCard label="舊顧客資料列" value={selectedAccount.__legacyCustomers.length} />
                <DetailCard label="可登入" value={selectedAccount?.auth_user_exists ? '是' : '否'} />
                <DetailCard label="管理員權限" value={selectedAccount?.is_admin ? '是' : '否'} />
              </div>
            </div>

            <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>最近互動</div>
              {selectedAccount.__recent.length ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedAccount.__recent.map((item, index) => (
                    <div key={`${item.kind}-${index}`} style={{ display: 'grid', gap: '4px', padding: '12px', borderRadius: '12px', background: '#FAF8F5' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                        <div style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatMoney(item.amount, '')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Pill tone="muted">{item.kind}</Pill>
                        <Pill tone="muted">{item.status}</Pill>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{formatDate(item.when)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="暫時沒有相關記錄" description="這位會員暫時未有預約、訂單或交易資料。" />
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>未綁定帳號的舊顧客資料</div>
        {orphanLegacyCustomers.length ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {orphanLegacyCustomers.slice(0, 12).map((legacy) => (
              <div key={legacy.id} style={{ display: 'grid', gap: '3px', padding: '12px', borderRadius: '12px', background: '#FAF8F5' }}>
                <div style={{ fontWeight: 700 }}>{legacy?.name || legacy?.full_name || `舊顧客 #${legacy?.id || '-'}`}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  {[legacy?.email || '未填電郵', legacy?.phone || legacy?.mobile || '未填電話'].join(' / ')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="所有可見顧客資料都已綁定會員帳號" description="目前沒有額外的舊顧客資料需要人工對照。" />
        )}
      </div>
    </div>
  )
}

function DetailCard({ label, value, mono = false }) {
  return (
    <div className="admin-card" style={{ padding: '14px 16px', border: '1px solid var(--gray)' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

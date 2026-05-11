'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const KIND_OPTIONS = [
  { value: 'sale', label: '銷售' },
  { value: 'refund', label: '退款' },
  { value: 'adjustment', label: '調整' },
  { value: 'deposit', label: '訂金' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理' },
  { value: 'paid', label: '已付款' },
  { value: 'failed', label: '失敗' },
  { value: 'reconciled', label: '已對帳' },
  { value: 'cancelled', label: '已取消' },
]

const normalize = (row) => ({
  ...row,
  __isNew: Boolean(row?.__isNew),
  __deleted: Boolean(row?.__deleted),
})

const statusTone = (status) => {
  if (status === 'completed' || status === 'paid' || status === 'reconciled') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed' || status === 'cancelled') return 'danger'
  return 'default'
}

const getText = (...values) => values.find((value) => String(value || '').trim()) || ''

const matchRecord = (rows, value, aliases = []) => {
  if (value == null || value === '') return null
  const needle = String(value).trim()
  return (rows || []).find((row) => {
    if (!row) return false
    const candidates = [row.id, row.ref, row.code, row.name, row.title, ...aliases.flatMap((key) => row?.[key] == null ? [] : [row[key]])]
    return candidates.some((candidate) => String(candidate ?? '').trim() === needle)
  }) || null
}

const getCustomerLabel = (customer) => customer?.name || customer?.full_name || customer?.display_name || customer?.email || customer?.phone || '會員'
const getBookingLabel = (booking) => booking?.ref || booking?.booking_ref || booking?.code || `預約 #${booking?.id || ''}`
const getOrderLabel = (order) => order?.ref || order?.order_no || order?.code || `訂單 #${order?.id || ''}`
const getLocationLabel = (location) => location?.name || location?.title || location?.code || '地點'
const getProviderGroupLabel = (group) => group?.name || group?.title || group?.code || '服務供應者群組'
const getKindLabel = (kind) => KIND_OPTIONS.find((item) => item.value === kind)?.label || kind || '-'
const getStatusLabel = (status) => STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '-'
const getLinkedLocationId = (row) => row?.location_id ?? row?.branch_id ?? row?.location?.id ?? row?.branch?.id ?? ''
const getLinkedProviderGroupId = (row) => row?.provider_group_id ?? row?.group_id ?? row?.provider_group?.id ?? ''
const formatDateTime = (value, fallback) => {
  const source = value || fallback
  if (!source) return '-'
  return new Date(source).toLocaleString('zh-HK')
}

export default function TransactionsTab({
  transactions: initialTransactions = [],
  bookings = [],
  orders = [],
  customers = [],
  locations = [],
  providerGroups = [],
  available = true,
  saveTransactions,
  saving = false,
}) {
  const [transactions, setTransactions] = useState(() => (initialTransactions || []).map(normalize))
  const [searchTerm, setSearchTerm] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [localSaving, setLocalSaving] = useState(false)

  useEffect(() => {
    setTransactions((initialTransactions || []).map(normalize))
  }, [initialTransactions])

  const bookingLookup = useMemo(
    () =>
      (bookings || []).reduce((acc, booking) => {
        acc[String(booking.id)] = booking
        if (booking.ref != null) acc[String(booking.ref)] = booking
        if (booking.booking_ref != null) acc[String(booking.booking_ref)] = booking
        return acc
      }, {}),
    [bookings],
  )

  const orderLookup = useMemo(
    () =>
      (orders || []).reduce((acc, order) => {
        acc[String(order.id)] = order
        if (order.ref != null) acc[String(order.ref)] = order
        if (order.order_no != null) acc[String(order.order_no)] = order
        return acc
      }, {}),
    [orders],
  )

  const customerLookup = useMemo(
    () =>
      (customers || []).reduce((acc, customer) => {
        acc[String(customer.id)] = customer
        if (customer.email != null) acc[String(customer.email)] = customer
        if (customer.phone != null) acc[String(customer.phone)] = customer
        return acc
      }, {}),
    [customers],
  )

  const locationLookup = useMemo(
    () =>
      (locations || []).reduce((acc, location) => {
        acc[String(location.id)] = location
        return acc
      }, {}),
    [locations],
  )

  const providerGroupLookup = useMemo(
    () =>
      (providerGroups || []).reduce((acc, group) => {
        acc[String(group.id)] = group
        return acc
      }, {}),
    [providerGroups],
  )

  const enrichedTransactions = useMemo(() => {
    return transactions.map((row) => {
      const booking = row.booking_id != null ? bookingLookup[String(row.booking_id)] || matchRecord(bookings, row.booking_id, ['booking_id']) : null
      const order =
        (row.order_id != null ? orderLookup[String(row.order_id)] || matchRecord(orders, row.order_id, ['order_id']) : null) ||
        (row.payment_ref ? orderLookup[String(row.payment_ref)] || matchRecord(orders, row.payment_ref, ['payment_ref', 'ref', 'order_no']) : null)
      const customer = row.customer_id != null
        ? customerLookup[String(row.customer_id)] || matchRecord(customers, row.customer_id, ['member_user_id', 'user_id'])
        : row.member_user_id != null
          ? customerLookup[String(row.member_user_id)] || matchRecord(customers, row.member_user_id, ['member_user_id', 'user_id'])
          : row.customer_name
            ? matchRecord(customers, row.customer_name, ['name', 'full_name', 'display_name', 'email', 'phone'])
            : null
      const resolvedCustomer =
        customer ||
        (order?.customer_id != null ? customerLookup[String(order.customer_id)] || matchRecord(customers, order.customer_id, ['member_user_id', 'user_id']) : null) ||
        (order?.member_user_id != null ? customerLookup[String(order.member_user_id)] || matchRecord(customers, order.member_user_id, ['member_user_id', 'user_id']) : null) ||
        (booking?.customer_id != null ? customerLookup[String(booking.customer_id)] || matchRecord(customers, booking.customer_id, ['member_user_id', 'user_id']) : null) ||
        matchRecord(customers, order?.customer_name || booking?.customer_name || booking?.name, ['name', 'full_name', 'display_name', 'email', 'phone'])
      const locationId = getLinkedLocationId(row) || getLinkedLocationId(order) || getLinkedLocationId(booking)
      const providerGroupId = getLinkedProviderGroupId(row) || getLinkedProviderGroupId(order) || getLinkedProviderGroupId(booking)
      const location =
        (locationId !== '' ? locationLookup[String(locationId)] || matchRecord(locations, locationId, ['location_id', 'branch_id']) : null) ||
        matchRecord(locations, row.location_name || order?.location_name || booking?.location_name, ['name', 'title', 'code'])
      const providerGroup =
        (providerGroupId !== '' ? providerGroupLookup[String(providerGroupId)] || matchRecord(providerGroups, providerGroupId, ['provider_group_id', 'group_id']) : null) ||
        matchRecord(providerGroups, row.provider_group_name || order?.provider_group_name || booking?.provider_group_name, ['name', 'title', 'code'])

      return {
        ...row,
        __booking: booking,
        __order: order,
        __customer: resolvedCustomer,
        __location: location,
        __providerGroup: providerGroup,
        __linkedLabel: getText(booking ? getBookingLabel(booking) : '', order ? getOrderLabel(order) : '', resolvedCustomer ? getCustomerLabel(resolvedCustomer) : row.customer_name || ''),
      }
    })
  }, [transactions, bookingLookup, orderLookup, customerLookup, locationLookup, providerGroupLookup, bookings, orders, customers, locations, providerGroups])

  const filteredTransactions = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return enrichedTransactions.filter((row) => {
      const haystack = [
        row.ref,
        row.kind,
        row.payment_method,
        row.payment_ref,
        row.provider,
        row.order_id,
        row.booking_id,
        row.customer_name,
        row.notes,
        row.status,
        row.__linkedLabel,
        row.__location?.name,
        row.__providerGroup?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (!needle || haystack.includes(needle)) && (kindFilter === 'all' || (row.kind || 'sale') === kindFilter) && (statusFilter === 'all' || (row.status || 'completed') === statusFilter)
    })
  }, [enrichedTransactions, searchTerm, kindFilter, statusFilter])

  const summary = useMemo(
    () =>
      filteredTransactions.reduce(
        (acc, row) => {
          acc.rows += 1
          acc.amount += Number(row.amount || 0)
          if (row.__booking) acc.linkedBookings += 1
          if (row.__order) acc.linkedOrders += 1
          if (row.__customer) acc.linkedCustomers += 1
          if (row.status === 'reconciled') acc.reconciled += 1
          return acc
        },
        { rows: 0, amount: 0, linkedBookings: 0, linkedOrders: 0, linkedCustomers: 0, reconciled: 0 },
      ),
    [filteredTransactions],
  )

  const update = (id, patch) => {
    setTransactions((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const addTransaction = () => {
    setTransactions((current) => [
      {
        id: Date.now(),
        ref: `TX-${Date.now()}`,
        kind: 'sale',
        amount: 0,
        currency: 'HKD',
        payment_method: 'cash',
        provider: '',
        payment_ref: '',
        customer_name: '',
        booking_id: '',
        order_id: '',
        status: 'pending',
        notes: '',
        occurred_at: new Date().toISOString(),
        __isNew: true,
        __deleted: false,
      },
      ...current,
    ])
  }

  const toggleDelete = (id) => {
    setTransactions((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item
          if (item.__isNew) return null
          return { ...item, __deleted: !item.__deleted }
        })
        .filter(Boolean),
    )
  }

  const handleSave = async () => {
    if (!saveTransactions) return
    setLocalSaving(true)
    try {
      const deletedIds = transactions.filter((item) => item.__deleted && !item.__isNew).map((item) => item.id)
      const items = transactions
        .filter((item) => !item.__deleted)
        .map((item) => {
          const payload = { ...item }
          delete payload.__isNew
          delete payload.__deleted
          return payload
        })
      await saveTransactions({ transactions: items, deletedIds })
    } finally {
      setLocalSaving(false)
    }
  }

  if (!available) {
    return <EmptyState title="交易表暫時未可用" description="請先完成最新 migration，以啟用帳目式付款追蹤。" />
  }

  const isSaving = Boolean(saving || localSaving)

  return (
    <div className="admin-page-stack">
      <SectionHeader
        eyebrow="交易紀錄"
        title="營運帳目"
        description="追蹤交易參考編號、付款方式、已連結預約、訂單、顧客，以及已解析的營運範圍。"
        actions={
          <div className="admin-inline-actions">
            <Pill>{filteredTransactions.length} 可見</Pill>
            <Pill>{summary.linkedBookings} 預約連結</Pill>
            <Pill>{summary.linkedOrders} 訂單連結</Pill>
            {saveTransactions ? (
              <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
                {isSaving ? '儲存中...' : '儲存變更'}
              </button>
            ) : null}
          </div>
        }
      />

      <RecordFilterBar columns="repeat(auto-fit, minmax(180px, 1fr))" actions={<button type="button" onClick={addTransaction} className="btn btn-small btn-interactive">+ 新增交易</button>}>
        <input type="text" placeholder="搜尋參考編號、顧客、預約、訂單、備註..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={fieldStyle} />
        <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} style={fieldStyle}>
          <option value="all">全部類型</option>
          {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={fieldStyle}>
          <option value="all">全部狀態</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </RecordFilterBar>

      <div className="admin-metric-grid">
        <Metric label="記錄數" value={summary.rows} />
        <Metric label="帳目總額" value={formatMoney(summary.amount, 'HKD')} tone="primary" />
        <Metric label="已連結顧客" value={summary.linkedCustomers} />
        <Metric label="已對帳" value={summary.reconciled} />
      </div>

      <div className="admin-card admin-table-shell">
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table className="admin-data-table" style={{ minWidth: '1360px' }}>
            <thead>
              <tr>
                {['時間', '參考編號', '類型', '金額', '付款方式', '預約 / 訂單', '範圍 / 連結', '備註', '狀態', '操作'].map((label) => (
                  <th key={label} style={{ textAlign: label === '操作' ? 'center' : 'left' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <EmptyState title="暫時沒有交易紀錄" description="當訂單、預約或調整同步後，交易會顯示在這裡。" />
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((row) => {
                  const deleted = Boolean(row.__deleted)
                  const tone = statusTone(row.status || 'completed')
                  const bookingLabel = row.__booking ? getBookingLabel(row.__booking) : row.booking_id ? `預約 #${row.booking_id}` : '-'
                  const orderLabel = row.__order ? getOrderLabel(row.__order) : row.order_id ? `訂單 #${row.order_id}` : '-'
                  const customerLabel = row.__customer ? getCustomerLabel(row.__customer) : row.customer_name || '-'
                  const scopeParts = [row.__location ? getLocationLabel(row.__location) : row.location_name || '', row.__providerGroup ? getProviderGroupLabel(row.__providerGroup) : row.provider_group_name || ''].filter(Boolean)

                  return (
                    <tr key={row.id} className="admin-table-row" style={{ opacity: deleted ? 0.55 : 1 }} onClick={() => setSelectedTransaction(row)}>
                      <td>{formatDateTime(row.occurred_at, row.created_at)}</td>
                      <td>
                        <input value={row.ref || ''} onChange={(event) => update(row.id, { ref: event.target.value })} style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()} />
                      </td>
                      <td>
                        <select value={row.kind || 'sale'} onChange={(event) => update(row.id, { kind: event.target.value })} style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()}>
                          {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" value={row.amount || 0} onChange={(event) => update(row.id, { amount: parseInt(event.target.value, 10) || 0 })} style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()} />
                      </td>
                      <td>
                        <input value={row.payment_method || ''} onChange={(event) => update(row.id, { payment_method: event.target.value })} placeholder="現金 / 信用卡 / 銀行轉帳" style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()} />
                        <div className="admin-muted-line">{row.provider || row.payment_ref || ''}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800 }}>{bookingLabel}</div>
                        <div className="admin-muted-line">{orderLabel}</div>
                        <div className="admin-muted-line">{customerLabel}</div>
                      </td>
                      <td>
                        <Pill tone={row.__location || row.__providerGroup ? 'success' : 'warning'}>{row.__location || row.__providerGroup ? '已設定' : '缺少範圍'}</Pill>
                        <div style={{ marginTop: '6px', fontWeight: 700 }}>{scopeParts.length ? scopeParts.join(' / ') : '-'}</div>
                        <div className="admin-muted-line">{row.currency || 'HKD'}{row.location_id ? ` / 地點 #${row.location_id}` : ''}</div>
                      </td>
                      <td>
                        <textarea value={row.notes || ''} onChange={(event) => update(row.id, { notes: event.target.value })} placeholder="營運備註" style={{ ...smallFieldStyle, minHeight: '68px', resize: 'vertical', width: '100%' }} disabled={deleted} onClick={(event) => event.stopPropagation()} />
                      </td>
                      <td>
                        <select value={row.status || 'pending'} onChange={(event) => update(row.id, { status: event.target.value })} style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()}>
                          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <div style={{ marginTop: '6px' }}><Pill tone={tone}>{getStatusLabel(row.status || 'pending')}</Pill></div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="admin-row-actions">
                          <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedTransaction(row) }} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>詳情</button>
                          <button type="button" onClick={(event) => { event.stopPropagation(); toggleDelete(row.id) }} className="btn btn-small btn-interactive" style={{ background: deleted ? '#ECFDF5' : '#FEF2F2', color: deleted ? '#166534' : '#DC2626' }}>
                            {deleted ? '還原' : '刪除'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTransaction ? (
        <div className="vh-dialog-backdrop" onClick={() => setSelectedTransaction(null)}>
          <div className="admin-card admin-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedTransaction(null)} className="admin-close-button">關閉</button>
            <div style={{ marginBottom: '18px' }}>
              <div className="admin-eyebrow">交易詳情</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedTransaction.ref || selectedTransaction.id}</h3>
            </div>
            <div className="admin-page-stack">
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div className="admin-detail-grid">
                  <DetailBlock label="時間" value={formatDateTime(selectedTransaction.occurred_at, selectedTransaction.created_at)} />
                  <DetailBlock label="類型" value={getKindLabel(selectedTransaction.kind)} />
                  <DetailBlock label="狀態" value={getStatusLabel(selectedTransaction.status || 'pending')} />
                  <DetailBlock label="金額" value={formatMoney(Number(selectedTransaction.amount || 0), selectedTransaction.currency || 'HKD')} />
                </div>
              </div>
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div className="admin-detail-grid">
                  <DetailBlock label="預約" value={selectedTransaction.__booking ? getBookingLabel(selectedTransaction.__booking) : selectedTransaction.booking_id ? `預約 #${selectedTransaction.booking_id}` : '-'} />
                  <DetailBlock label="訂單" value={selectedTransaction.__order ? getOrderLabel(selectedTransaction.__order) : selectedTransaction.order_id ? `訂單 #${selectedTransaction.order_id}` : '-'} />
                  <DetailBlock label="顧客" value={selectedTransaction.__customer ? getCustomerLabel(selectedTransaction.__customer) : selectedTransaction.customer_name || '-'} />
                  <DetailBlock label="付款方式" value={selectedTransaction.payment_method || selectedTransaction.__order?.payment_method || selectedTransaction.__booking?.payment_method || '-'} />
                  <DetailBlock label="地點" value={selectedTransaction.__location ? getLocationLabel(selectedTransaction.__location) : selectedTransaction.location_name || selectedTransaction.__order?.location_name || selectedTransaction.__booking?.location_name || '-'} />
                  <DetailBlock label="供應者群組" value={selectedTransaction.__providerGroup ? getProviderGroupLabel(selectedTransaction.__providerGroup) : selectedTransaction.provider_group_name || selectedTransaction.__order?.provider_group_name || selectedTransaction.__booking?.provider_group_name || '-'} />
                  <DetailBlock label="供應者參考" value={selectedTransaction.provider || selectedTransaction.__order?.provider || selectedTransaction.__booking?.provider || '-'} />
                  <DetailBlock label="付款參考" value={selectedTransaction.payment_ref || selectedTransaction.__order?.payment_ref || selectedTransaction.__booking?.payment_ref || '-'} />
                </div>
              </div>
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div className="admin-detail-label">備註</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selectedTransaction.notes || '沒有備註。'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ label, value, tone }) {
  return (
    <div className="admin-card admin-metric-card">
      <div className="admin-metric-label">{label}</div>
      <div className="admin-metric-value" style={{ color: tone === 'primary' ? 'var(--primary)' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

function DetailBlock({ label, value }) {
  return (
    <div>
      <div className="admin-detail-label">{label}</div>
      <div style={{ fontWeight: 700 }}>{value || '-'}</div>
    </div>
  )
}

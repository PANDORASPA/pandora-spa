'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

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
const getProviderGroupLabel = (group) => group?.name || group?.title || group?.code || '供應者群組'
const getKindLabel = (kind) =>
  ({
    sale: '銷售',
    refund: '退款',
    adjustment: '調整',
    deposit: '訂金',
  })[kind] || kind || '-'
const getStatusLabel = (status) =>
  ({
    pending: '待處理',
    paid: '已付款',
    failed: '失敗',
    reconciled: '已對帳',
    cancelled: '已取消',
  })[status] || status || '-'
const getLinkedLocationId = (row) => row?.location_id ?? row?.branch_id ?? row?.location?.id ?? row?.branch?.id ?? ''
const getLinkedProviderGroupId = (row) => row?.provider_group_id ?? row?.group_id ?? row?.provider_group?.id ?? ''

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

  const bookingLookup = useMemo(() => {
    return (bookings || []).reduce((acc, booking) => {
      acc[String(booking.id)] = booking
      if (booking.ref != null) acc[String(booking.ref)] = booking
      if (booking.booking_ref != null) acc[String(booking.booking_ref)] = booking
      return acc
    }, {})
  }, [bookings])

  const orderLookup = useMemo(() => {
    return (orders || []).reduce((acc, order) => {
      acc[String(order.id)] = order
      if (order.ref != null) acc[String(order.ref)] = order
      if (order.order_no != null) acc[String(order.order_no)] = order
      return acc
    }, {})
  }, [orders])

  const customerLookup = useMemo(() => {
    return (customers || []).reduce((acc, customer) => {
      acc[String(customer.id)] = customer
      if (customer.email != null) acc[String(customer.email)] = customer
      if (customer.phone != null) acc[String(customer.phone)] = customer
      return acc
    }, {})
  }, [customers])

  const locationLookup = useMemo(() => {
    return (locations || []).reduce((acc, location) => {
      acc[String(location.id)] = location
      return acc
    }, {})
  }, [locations])

  const providerGroupLookup = useMemo(() => {
    return (providerGroups || []).reduce((acc, group) => {
      acc[String(group.id)] = group
      return acc
    }, {})
  }, [providerGroups])

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
        __linkedLabel: getText(
          booking ? getBookingLabel(booking) : '',
          order ? getOrderLabel(order) : '',
          resolvedCustomer ? getCustomerLabel(resolvedCustomer) : row.customer_name || '',
        ),
      }
    })
  }, [transactions, bookingLookup, orderLookup, customerLookup, locationLookup, providerGroupLookup, bookings, orders, customers])

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

      return (
        (!needle || haystack.includes(needle)) &&
        (kindFilter === 'all' || (row.kind || 'sale') === kindFilter) &&
        (statusFilter === 'all' || (row.status || 'completed') === statusFilter)
      )
    })
  }, [enrichedTransactions, searchTerm, kindFilter, statusFilter])

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
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
    )
  }, [filteredTransactions])

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
    return (
      <div className="admin-card" style={{ padding: '28px', color: 'var(--text-light)' }}>
        交易表暫時未可用。請先完成最新 migration 以啟用帳目式付款追蹤。
      </div>
    )
  }

  const isSaving = Boolean(saving || localSaving)

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="交易紀錄"
        title="營運帳目"
        description="追蹤交易參考編號、付款方式、已連結預約，以及已解析的營運範圍。"
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Pill>{filteredTransactions.length} 可見</Pill>
            <Pill>{summary.linkedBookings} 個預約連結</Pill>
            <Pill>{summary.linkedOrders} 個訂單連結</Pill>
            {saveTransactions && (
              <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
                {isSaving && <span className="spinner"></span>}
                {isSaving ? '儲存中...' : '儲存變更'}
              </button>
            )}
          </div>
        }
      />

      <RecordFilterBar
        columns="repeat(auto-fit, minmax(180px, 1fr))"
        actions={
          <button type="button" onClick={addTransaction} className="btn btn-small btn-interactive">
            + 新增交易
          </button>
        }
      >
        <input type="text" placeholder="搜尋參考編號、顧客、預約、訂單、備註..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={fieldStyle} />
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部類型</option>
          <option value="sale">銷售</option>
          <option value="refund">退款</option>
          <option value="adjustment">調整</option>
          <option value="deposit">訂金</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部狀態</option>
          <option value="pending">待處理</option>
          <option value="paid">已付款</option>
          <option value="failed">失敗</option>
          <option value="reconciled">已對帳</option>
          <option value="cancelled">已取消</option>
        </select>
      </RecordFilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>記錄數</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{summary.rows}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>帳目總額</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(summary.amount, 'HKD')}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>已連結顧客</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{summary.linkedCustomers}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>已對帳</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{summary.reconciled}</div>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1360px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>時間</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>參考編號</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>類型</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>金額</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>付款方式</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>預約 / 訂單</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>範圍 / 連結</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>備註</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>狀態</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-light)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <EmptyState title="暫無交易記錄" description="當訂單、預約或調整同步後，交易會顯示於此。" />
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((row) => {
                  const deleted = Boolean(row.__deleted)
                  const tone = statusTone(row.status || 'completed')
                  const bookingLabel = row.__booking ? getBookingLabel(row.__booking) : row.booking_id ? `預約 #${row.booking_id}` : '-'
                  const orderLabel = row.__order ? getOrderLabel(row.__order) : row.order_id ? `訂單 #${row.order_id}` : '-'
                  const customerLabel = row.__customer ? getCustomerLabel(row.__customer) : row.customer_name || '-'
                  const scopeParts = [
                    row.__location ? getLocationLabel(row.__location) : row.location_name || '',
                    row.__providerGroup ? getProviderGroupLabel(row.__providerGroup) : row.provider_group_name || '',
                  ].filter(Boolean)

                  return (
                    <tr
                      key={row.id}
                      className="admin-table-row"
                      style={{ borderBottom: '1px solid #f6f6f6', opacity: deleted ? 0.55 : 1, cursor: 'pointer' }}
                      onClick={() => setSelectedTransaction(row)}
                    >
                      <td style={{ padding: '12px' }}>{row.occurred_at ? new Date(row.occurred_at).toLocaleString() : row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <input
                          value={row.ref || ''}
                          onChange={(e) => update(row.id, { ref: e.target.value })}
                          style={smallFieldStyle}
                          disabled={deleted}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={row.kind || 'sale'} onChange={(e) => update(row.id, { kind: e.target.value })} style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()}>
                          <option value="sale">銷售</option>
                          <option value="refund">退款</option>
                          <option value="adjustment">調整</option>
                          <option value="deposit">訂金</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="number"
                          value={row.amount || 0}
                          onChange={(e) => update(row.id, { amount: parseInt(e.target.value, 10) || 0 })}
                          style={smallFieldStyle}
                          disabled={deleted}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          value={row.payment_method || ''}
                          onChange={(e) => update(row.id, { payment_method: e.target.value })}
                          placeholder="現金 / 信用卡 / 銀行轉帳"
                          style={smallFieldStyle}
                          disabled={deleted}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{row.provider || row.payment_ref || ''}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <span
                            className="badge"
                            style={{
                              border: 'none',
                              background: row.__location || row.__providerGroup ? '#ECFDF5' : '#FEF3C7',
                              color: row.__location || row.__providerGroup ? '#047857' : '#B45309',
                            }}
                          >
                            {row.__location || row.__providerGroup ? '已設定' : '缺少範圍'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700 }}>{bookingLabel}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{orderLabel}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{customerLabel}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>{scopeParts.length ? scopeParts.join(' / ') : '-'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                          {row.currency || 'HKD'}
                          {row.location_id ? ` - 地點 #${row.location_id}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <textarea
                          value={row.notes || ''}
                          onChange={(e) => update(row.id, { notes: e.target.value })}
                          placeholder="營運備註"
                          style={{ ...smallFieldStyle, minHeight: '68px', resize: 'vertical', width: '100%' }}
                          disabled={deleted}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={row.status || 'pending'} onChange={(e) => update(row.id, { status: e.target.value })} style={smallFieldStyle} disabled={deleted} onClick={(event) => event.stopPropagation()}>
                          <option value="pending">待處理</option>
                          <option value="paid">已付款</option>
                          <option value="failed">失敗</option>
                          <option value="reconciled">已對帳</option>
                          <option value="cancelled">已取消</option>
                        </select>
                        <div style={{ marginTop: '6px' }}>
                          <span
                            className="badge"
                            style={{
                              border: 'none',
                              background: tone === 'success' ? '#ECFDF5' : tone === 'warning' ? '#FEF3C7' : tone === 'danger' ? '#FEF2F2' : '#E5E7EB',
                              color: tone === 'success' ? '#047857' : tone === 'warning' ? '#B45309' : tone === 'danger' ? '#DC2626' : '#374151',
                            }}
                          >
                          {getStatusLabel(row.status || 'pending')}
                        </span>
                      </div>
                    </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedTransaction(row)
                          }}
                          className="btn-interactive"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--gray)',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            marginRight: '8px',
                          }}
                        >
                          詳情
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleDelete(row.id)
                          }}
                          className="btn-interactive"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: deleted ? '#ECFDF5' : '#FEF2F2',
                            color: deleted ? '#166534' : '#DC2626',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {deleted ? '還原' : '刪除'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTransaction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedTransaction(null)}
        >
          <div className="admin-card" style={{ width: '100%', maxWidth: '760px', padding: '24px', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setSelectedTransaction(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>
              關閉
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>交易詳情</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedTransaction.ref || selectedTransaction.id}</h3>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <DetailBlock label="時間" value={selectedTransaction.occurred_at ? new Date(selectedTransaction.occurred_at).toLocaleString() : selectedTransaction.created_at ? new Date(selectedTransaction.created_at).toLocaleString() : '-'} />
                  <DetailBlock label="類型" value={getKindLabel(selectedTransaction.kind)} />
                  <DetailBlock label="狀態" value={getStatusLabel(selectedTransaction.status || 'pending')} />
                  <DetailBlock label="金額" value={formatMoney(Number(selectedTransaction.amount || 0), selectedTransaction.currency || 'HKD')} />
                </div>
              </div>

              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <DetailBlock label="預約" value={selectedTransaction.__booking ? getBookingLabel(selectedTransaction.__booking) : selectedTransaction.booking_id ? `預約 #${selectedTransaction.booking_id}` : '-'} />
                  <DetailBlock label="訂單" value={selectedTransaction.__order ? getOrderLabel(selectedTransaction.__order) : selectedTransaction.order_id ? `訂單 #${selectedTransaction.order_id}` : '-'} />
                  <DetailBlock label="顧客" value={selectedTransaction.__customer ? getCustomerLabel(selectedTransaction.__customer) : selectedTransaction.customer_name || '-'} />
                  <DetailBlock label="付款方式" value={selectedTransaction.payment_method || selectedTransaction.__order?.payment_method || selectedTransaction.__booking?.payment_method || '-'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <DetailBlock label="地點" value={selectedTransaction.__location ? getLocationLabel(selectedTransaction.__location) : selectedTransaction.location_name || selectedTransaction.__order?.location_name || selectedTransaction.__booking?.location_name || '-'} />
                  <DetailBlock label="供應者群組" value={selectedTransaction.__providerGroup ? getProviderGroupLabel(selectedTransaction.__providerGroup) : selectedTransaction.provider_group_name || selectedTransaction.__order?.provider_group_name || selectedTransaction.__booking?.provider_group_name || '-'} />
                  <DetailBlock label="供應者參考" value={selectedTransaction.provider || selectedTransaction.__order?.provider || selectedTransaction.__booking?.provider || '-'} />
                  <DetailBlock label="付款參考" value={selectedTransaction.payment_ref || selectedTransaction.__order?.payment_ref || selectedTransaction.__booking?.payment_ref || '-'} />
                </div>
              </div>

              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>備註</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selectedTransaction.notes || '沒有備註。'}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedTransaction(null)} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value || '-'}</div>
    </div>
  )
}

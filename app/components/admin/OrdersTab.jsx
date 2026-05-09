'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const STATUS_OPTIONS = [
  { value: 'awaiting_payment', label: '待付款', tone: 'warning' },
  { value: 'payment_setup_failed', label: '付款未完成', tone: 'danger' },
  { value: 'pending', label: '待處理', tone: 'warning' },
  { value: 'paid', label: '已付款', tone: 'success' },
  { value: 'completed', label: '已完成', tone: 'success' },
  { value: 'shipped', label: '已出貨', tone: 'default' },
  { value: 'cancelled', label: '已取消', tone: 'danger' },
]

const getCustomerName = (order) => order.user_name || order.customer_name || order.name || order.__customer?.name || '顧客'
const getCustomerPhone = (order) => order.phone || order.user_phone || order.customer_phone || order.__customer?.phone || ''
const getItemsText = (order) => {
  if (Array.isArray(order.items)) {
    return order.items
      .map((item) => item?.name || item?.title || item?.label || item?.product_name || String(item))
      .filter(Boolean)
      .join(', ')
  }
  return order.items || order.product_name || order.description || '-'
}
const getDeliveryText = (order) => {
  const value = order.delivery || order.delivery_method || ''
  if (value === 'digital-ticket') return '套票 / 到店使用'
  if (value === 'pickup') return '到店取貨'
  if (value === 'delivery') return '配送'
  return value || '未設定'
}
const getPaymentText = (order) => {
  const value = order.payment || order.payment_method || ''
  if (value === 'stripe') return 'Stripe'
  if (value === 'manual' || value === 'manual-admin') return '人工確認'
  return value || '未設定'
}
const getDateText = (order) => (order.created_at ? new Date(order.created_at).toLocaleString('zh-HK') : '-')
const getOrderStatusMeta = (status) => STATUS_OPTIONS.find((option) => option.value === status) || { value: status || 'pending', label: status || '待處理', tone: 'warning' }
const isTicketPackageOrder = (order) => {
  const text = [order.delivery, order.items, order.ticket_id, order.package_id].filter(Boolean).join(' ').toLowerCase()
  return text.includes('digital-ticket') || text.includes('package') || text.includes('ticket') || text.includes('套票')
}
const canConfirmPayment = (order) => String(order.status || '') === 'awaiting_payment' && isTicketPackageOrder(order)

const normalizeOrder = (order) => ({
  ...order,
  __isNew: Boolean(order?.__isNew),
  __deleted: Boolean(order?.__deleted),
})

export default function OrdersTab({
  orders: initialOrders = [],
  bookings = [],
  customers = [],
  transactions = [],
  saving = false,
}) {
  const [orders, setOrders] = useState(() => (initialOrders || []).map(normalizeOrder))
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  useEffect(() => {
    setOrders((initialOrders || []).map(normalizeOrder))
  }, [initialOrders])

  const transactionByOrderId = useMemo(() => {
    return (transactions || []).reduce((acc, tx) => {
      const orderId = Number(tx?.order_id)
      if (!Number.isFinite(orderId)) return acc
      if (!acc[orderId]) acc[orderId] = []
      acc[orderId].push(tx)
      return acc
    }, {})
  }, [transactions])

  const customerLookup = useMemo(() => {
    return (customers || []).reduce((acc, customer) => {
      if (customer?.id != null) acc[String(customer.id)] = customer
      return acc
    }, {})
  }, [customers])

  const bookingLookup = useMemo(() => {
    return (bookings || []).reduce((acc, booking) => {
      if (booking?.id != null) acc[String(booking.id)] = booking
      return acc
    }, {})
  }, [bookings])

  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      const transaction = Number.isFinite(Number(order.id)) ? transactionByOrderId[Number(order.id)]?.[0] || null : null
      const booking = order.booking_id != null ? bookingLookup[String(order.booking_id)] || null : null
      const customerId = order.customer_id || order.user_id || ''
      const customer = customerId ? customerLookup[String(customerId)] || null : null
      return { ...order, __transaction: transaction, __booking: booking, __customer: customer }
    })
  }, [bookingLookup, customerLookup, orders, transactionByOrderId])

  const paymentValues = useMemo(() => [...new Set(enrichedOrders.map(getPaymentText).filter(Boolean))], [enrichedOrders])

  const filteredOrders = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return enrichedOrders.filter((order) => {
      const haystack = [
        order.ref,
        getCustomerName(order),
        getCustomerPhone(order),
        getItemsText(order),
        getDeliveryText(order),
        getPaymentText(order),
        order.status,
        order.__transaction?.ref,
        order.__transaction?.payment_ref,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (
        (!needle || haystack.includes(needle)) &&
        (statusFilter === 'all' || (order.status || 'pending') === statusFilter) &&
        (paymentFilter === 'all' || getPaymentText(order) === paymentFilter)
      )
    })
  }, [enrichedOrders, paymentFilter, searchTerm, statusFilter])

  const summary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.rows += 1
        acc.revenue += Number(order.total || 0)
        if (String(order.status || '') === 'awaiting_payment') acc.awaiting += 1
        if (String(order.status || '') === 'completed') acc.completed += 1
        if (String(getPaymentText(order)).toLowerCase() === 'stripe') acc.stripe += 1
        return acc
      },
      { rows: 0, revenue: 0, awaiting: 0, completed: 0, stripe: 0 },
    )
  }, [filteredOrders])

  const updateStatus = async (id, status) => {
    try {
      setSavingId(id)
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)))
      setSelectedOrder((current) => (current?.id === id ? { ...current, status } : current))
      toast.success('訂單狀態已更新')
    } catch (error) {
      toast.error(error?.message || '訂單狀態更新失敗')
    } finally {
      setSavingId(null)
    }
  }

  const confirmPayment = async (order) => {
    if (!order?.id) return

    try {
      setConfirmingId(order.id)
      const response = await fetch('/api/admin/tickets/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          ticketId: order.ticket_id || order.package_id || '',
          paymentRef: order.payment_ref || order.__transaction?.payment_ref || '',
          paymentMethod: order.payment || order.payment_method || 'manual-admin',
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || result?.message || 'Confirm payment failed')

      const updatedOrder = result?.order || null
      setOrders((current) => current.map((row) => (row.id === order.id ? { ...row, ...updatedOrder, status: updatedOrder?.status || 'completed' } : row)))
      setSelectedOrder((current) => (current?.id === order.id ? { ...current, ...updatedOrder, status: updatedOrder?.status || 'completed' } : current))
      toast.success(result?.alreadyIssued ? '此訂單已發放過套票' : '已確認付款並發放套票')
    } catch (error) {
      toast.error(error?.message || '確認付款失敗')
    } finally {
      setConfirmingId(null)
    }
  }

  const isRowSaving = (order) => saving || savingId === order.id || confirmingId === order.id

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="訂單"
        title="訂單與付款"
        description="查看產品與套票訂單、付款方式、Stripe 狀態，以及人工確認付款後發放套票。"
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Pill>{filteredOrders.length} 筆顯示</Pill>
            <Pill>{summary.awaiting} 筆待付款</Pill>
            <Pill>{summary.stripe} 筆 Stripe</Pill>
          </div>
        }
      />

      <RecordFilterBar columns="repeat(auto-fit, minmax(180px, 1fr))">
        <input type="text" placeholder="搜尋訂單、顧客、項目、付款方式..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={fieldStyle} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部狀態</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部付款方式</option>
          {paymentValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </RecordFilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <Metric label="訂單數" value={summary.rows} />
        <Metric label="營業額" value={formatMoney(summary.revenue, '')} tone="primary" />
        <Metric label="待付款" value={summary.awaiting} />
        <Metric label="已完成" value={summary.completed} />
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '960px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                {['日期', '顧客', '項目', '金額', '交付方式', '付款方式', '狀態', '操作'].map((label) => (
                  <th key={label} style={{ padding: '14px 12px', textAlign: label === '操作' ? 'center' : 'left', color: 'var(--text-light)' }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState title="找不到訂單" description="請嘗試放寬搜尋或清除篩選條件。" />
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.status || 'pending')
                  return (
                    <tr key={order.id} className="admin-table-row" style={{ borderBottom: '1px solid #f6f6f6', cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                      <td style={{ padding: '14px 12px' }}>{getDateText(order)}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 800 }}>{getCustomerName(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(order)}</div>
                      </td>
                      <td style={{ padding: '14px 12px', maxWidth: '260px', lineHeight: 1.5 }}>{getItemsText(order)}</td>
                      <td style={{ padding: '14px 12px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(order.total, order.currency || '')}</td>
                      <td style={{ padding: '14px 12px' }}>{getDeliveryText(order)}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getPaymentText(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{order.payment_ref || order.__transaction?.payment_ref || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <StatusBadge meta={statusMeta} />
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {canConfirmPayment(order) ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                confirmPayment(order)
                              }}
                              className="btn-interactive"
                              disabled={isRowSaving(order)}
                              style={actionButtonStyle}
                            >
                              {confirmingId === order.id ? '確認中...' : '確認收款'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedOrder(order)
                            }}
                            className="btn-interactive"
                            style={{ ...actionButtonStyle, background: '#f5f5f5', color: '#333', border: '1px solid var(--gray)' }}
                          >
                            詳情
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

      {selectedOrder ? (
        <div className="vh-dialog-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '760px', padding: '24px', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>
              關閉
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#8BA58B', letterSpacing: '0.08em' }}>訂單詳情</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedOrder.ref || `訂單 #${selectedOrder.id}`}</h3>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <DetailBlock label="顧客" value={getCustomerName(selectedOrder)} />
                  <DetailBlock label="電話" value={getCustomerPhone(selectedOrder)} />
                  <DetailBlock label="日期" value={getDateText(selectedOrder)} />
                  <DetailBlock label="狀態" value={getOrderStatusMeta(selectedOrder.status).label} />
                  <DetailBlock label="項目" value={getItemsText(selectedOrder)} />
                  <DetailBlock label="總額" value={formatMoney(selectedOrder.total, selectedOrder.currency || '')} />
                  <DetailBlock label="交付方式" value={getDeliveryText(selectedOrder)} />
                  <DetailBlock label="付款方式" value={getPaymentText(selectedOrder)} />
                  <DetailBlock label="地址" value={selectedOrder.address || '-'} />
                  <DetailBlock label="付款參考" value={selectedOrder.payment_ref || selectedOrder.__transaction?.payment_ref || '-'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <label>
                  狀態
                  <select value={selectedOrder.status || 'pending'} onChange={(event) => updateStatus(selectedOrder.id, event.target.value)} disabled={isRowSaving(selectedOrder)} style={{ ...smallFieldStyle, maxWidth: '220px' }}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                {canConfirmPayment(selectedOrder) ? (
                  <button type="button" onClick={() => confirmPayment(selectedOrder)} className="btn btn-small btn-interactive" disabled={isRowSaving(selectedOrder)} style={{ background: '#8BA58B', color: '#fff' }}>
                    {confirmingId === selectedOrder.id ? '確認中...' : '確認收款並發放套票'}
                  </button>
                ) : null}
                <button type="button" onClick={() => setSelectedOrder(null)} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const actionButtonStyle = {
  padding: '6px 12px',
  background: '#8BA58B',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
}

function StatusBadge({ meta }) {
  const palette =
    meta.tone === 'success'
      ? { background: '#ECFDF5', color: '#047857' }
      : meta.tone === 'danger'
        ? { background: '#FEF2F2', color: '#DC2626' }
        : meta.tone === 'warning'
          ? { background: '#FEF3C7', color: '#B45309' }
          : { background: '#E5E7EB', color: '#374151' }

  return (
    <span className="badge" style={{ border: 'none', background: palette.background, color: palette.color }}>
      {meta.label}
    </span>
  )
}

function Metric({ label, value, tone }) {
  return (
    <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#8BA58B', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: tone === 'primary' ? 'var(--primary)' : 'var(--text)' }}>{value}</div>
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

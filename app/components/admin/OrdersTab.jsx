'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', tone: 'warning' },
  { value: 'paid', label: 'Paid', tone: 'success' },
  { value: 'shipped', label: 'Shipped', tone: 'default' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
]

const getCustomerName = (order) => order.user_name || order.customer_name || order.name || 'Customer'
const getCustomerPhone = (order) => order.phone || order.user_phone || order.customer_phone || ''
const getItemsText = (order) => {
  if (Array.isArray(order.items)) {
    return order.items
      .map((item) => item?.name || item?.title || item?.label || item?.product_name || String(item))
      .filter(Boolean)
      .join(', ')
  }
  return order.items || order.product_name || order.description || '-'
}
const getDeliveryText = (order) => order.delivery || order.delivery_method || 'Not set'
const getPaymentText = (order) => order.payment || order.payment_method || 'Not set'
const getDateText = (order) => (order.created_at ? new Date(order.created_at).toLocaleString() : '-')
const getLocationText = (location) => location?.name || location?.title || location?.code || 'Location'
const getProviderGroupText = (group) => group?.name || group?.title || group?.code || 'Provider group'
const getScopeText = (order) =>
  [
    order.__location ? getLocationText(order.__location) : order.location_name || '',
    order.__providerGroup ? getProviderGroupText(order.__providerGroup) : order.provider_group_name || '',
  ]
    .filter(Boolean)
    .join(' / ')
const getBookingText = (booking) => booking?.ref || booking?.booking_ref || booking?.code || `Booking #${booking?.id || ''}`
const getTransactionText = (transaction) => transaction?.ref || transaction?.payment_ref || transaction?.code || `TX #${transaction?.id || ''}`

const normalizeOrder = (order) => ({
  ...order,
  __isNew: Boolean(order?.__isNew),
  __deleted: Boolean(order?.__deleted),
})

const matchRecord = (rows, value, keys = []) => {
  if (value == null || value === '') return null
  const needle = String(value).trim()
  return (rows || []).find((row) => {
    if (!row) return false
    const candidates = [row.id, row.ref, row.code, row.name, row.title, ...keys.flatMap((key) => (row?.[key] == null ? [] : [row[key]]))]
    return candidates.some((candidate) => String(candidate ?? '').trim() === needle)
  }) || null
}

const resolveCustomer = (order, customers = []) => {
  const customerId = order.customer_id ?? order.member_user_id ?? order.user_id
  if (customerId != null && customerId !== '') {
    const direct = (customers || []).find((customer) => String(customer?.id) === String(customerId))
    if (direct) return direct
  }
  const phone = getCustomerPhone(order)
  const name = getCustomerName(order)
  return (
    matchRecord(customers, phone, ['phone', 'mobile', 'customer_phone', 'user_phone']) ||
    matchRecord(customers, name, ['name', 'full_name', 'display_name', 'email']) ||
    null
  )
}

export default function OrdersTab({
  orders: initialOrders = [],
  bookings = [],
  customers = [],
  transactions = [],
  locations = [],
  providerGroups = [],
  saving = false,
}) {
  const [orders, setOrders] = useState(() => (initialOrders || []).map(normalizeOrder))
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    setOrders((initialOrders || []).map(normalizeOrder))
  }, [initialOrders])

  const bookingLookup = useMemo(() => {
    return (bookings || []).reduce((acc, booking) => {
      acc[String(booking.id)] = booking
      if (booking.ref != null) acc[String(booking.ref)] = booking
      if (booking.booking_ref != null) acc[String(booking.booking_ref)] = booking
      return acc
    }, {})
  }, [bookings])

  const transactionLookup = useMemo(() => {
    return (transactions || []).reduce((acc, tx) => {
      acc[String(tx.id)] = tx
      if (tx.ref != null) acc[String(tx.ref)] = tx
      if (tx.payment_ref != null) acc[String(tx.payment_ref)] = tx
      return acc
    }, {})
  }, [transactions])

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

  const enrichedOrders = useMemo(() => {
    return (orders || []).map((order) => {
      const booking = order.booking_id != null ? bookingLookup[String(order.booking_id)] || matchRecord(bookings, order.booking_id, ['booking_id']) : null
      const transaction = order.transaction_id != null ? transactionLookup[String(order.transaction_id)] || matchRecord(transactions, order.transaction_id, ['transaction_id']) : null
      const customer = resolveCustomer(order, customers)
      const location = order.location_id != null ? locationLookup[String(order.location_id)] || matchRecord(locations, order.location_id, ['location_id']) : null
      const providerGroup = order.provider_group_id != null ? providerGroupLookup[String(order.provider_group_id)] || matchRecord(providerGroups, order.provider_group_id, ['provider_group_id']) : null

      return {
        ...order,
        __booking: booking,
        __transaction: transaction,
        __customer: customer,
        __location: location,
        __providerGroup: providerGroup,
      }
    })
  }, [orders, bookings, bookingLookup, transactionLookup, transactions, customers, locations, locationLookup, providerGroups, providerGroupLookup])

  const filterOptions = useMemo(() => {
    const deliveryValues = [...new Set(enrichedOrders.map((order) => getDeliveryText(order)).filter(Boolean))].filter((value) => value && value !== 'Not set')
    const paymentValues = [...new Set(enrichedOrders.map((order) => getPaymentText(order)).filter(Boolean))].filter((value) => value && value !== 'Not set')
    const scopeValues = [...new Set(enrichedOrders.map((order) => getScopeText(order)).filter(Boolean))]
    return { deliveryValues, paymentValues, scopeValues }
  }, [enrichedOrders])

  const filteredOrders = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return enrichedOrders.filter((order) => {
      const linkedBooking = Boolean(order.__booking)
      const linkedTransaction = Boolean(order.__transaction)
      const scopeLabel = getScopeText(order)

      const haystack = [
        order.ref,
        getCustomerName(order),
        getCustomerPhone(order),
        getItemsText(order),
        getDeliveryText(order),
        getPaymentText(order),
        order.status,
        scopeLabel,
        order.__booking?.ref,
        order.__booking?.booking_ref,
        order.__transaction?.ref,
        order.__transaction?.payment_ref,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const scopeFilterMatch =
        scopeFilter === 'all' ||
        (scopeFilter === 'linked' && (linkedBooking || linkedTransaction)) ||
        (scopeFilter === 'unlinked' && !linkedBooking && !linkedTransaction) ||
        scopeFilter === scopeLabel

      return (
        (!needle || haystack.includes(needle)) &&
        (statusFilter === 'all' || (order.status || 'pending') === statusFilter) &&
        (deliveryFilter === 'all' || getDeliveryText(order) === deliveryFilter) &&
        (paymentFilter === 'all' || getPaymentText(order) === paymentFilter) &&
        scopeFilterMatch
      )
    })
  }, [enrichedOrders, searchTerm, statusFilter, deliveryFilter, paymentFilter, scopeFilter])

  const summary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.rows += 1
        acc.revenue += Number(order.total || 0)
        if ((order.status || 'pending') === 'paid') acc.paid += 1
        if ((order.status || 'pending') === 'pending') acc.pending += 1
        if (order.__booking) acc.linkedBookings += 1
        if (order.__transaction) acc.linkedTransactions += 1
        return acc
      },
      { rows: 0, revenue: 0, paid: 0, pending: 0, linkedBookings: 0, linkedTransactions: 0 },
    )
  }, [filteredOrders])

  const updateStatus = async (id, status) => {
    try {
      setSavingId(id)
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)))
      setSelectedOrder((current) => (current?.id === id ? { ...current, status } : current))
    } catch (error) {
      console.error(error)
    } finally {
      setSavingId(null)
    }
  }

  const isRowSaving = (order) => saving || savingId === order.id

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="ORDERS"
        title="Orders and payment flow"
        description="Review order refs, items, delivery, payment state, and linked operational records in a consistent admin layout."
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Pill>{filteredOrders.length} visible</Pill>
            <Pill>{summary.linkedBookings} booking links</Pill>
            <Pill>{summary.linkedTransactions} payment links</Pill>
          </div>
        }
      />

      <RecordFilterBar columns="repeat(auto-fit, minmax(180px, 1fr))">
        <input
          type="text"
          placeholder="Search ref, customer, items, booking, location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={fieldStyle}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All delivery types</option>
          {filterOptions.deliveryValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All payment methods</option>
          {filterOptions.paymentValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All scopes</option>
          <option value="linked">Linked records only</option>
          <option value="unlinked">Unlinked only</option>
          {filterOptions.scopeValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </RecordFilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>Rows</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{summary.rows}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>Revenue</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(summary.revenue, '')}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>Paid</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{summary.paid}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>Pending</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{summary.pending}</div>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1180px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Date</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Customer</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Items</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Total</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Delivery</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Payment</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Linked / Scope</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState title="No orders found" description="Try a broader search or clear filters." />
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const normalizedStatus = order.status || 'pending'
                  const statusMeta = STATUS_OPTIONS.find((item) => item.value === normalizedStatus) || STATUS_OPTIONS[0]
                  const scopeLabel = getScopeText(order)

                  return (
                    <tr
                      key={order.id}
                      className="admin-table-row"
                      style={{ borderBottom: '1px solid #f6f6f6', cursor: 'pointer' }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td style={{ padding: '14px 12px' }}>{getDateText(order)}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 800 }}>{getCustomerName(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(order)}</div>
                      </td>
                      <td style={{ padding: '14px 12px', maxWidth: '260px' }}>
                        <div style={{ lineHeight: 1.5 }}>{getItemsText(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                          {order.__booking ? `Booking: ${getBookingText(order.__booking)}` : order.booking_id ? `Booking #${order.booking_id}` : 'No booking link'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(order.total, order.currency || '')}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getDeliveryText(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{order.address || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getPaymentText(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{order.payment_ref || order.__transaction?.payment_ref || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>
                          {order.__transaction ? `TX: ${getTransactionText(order.__transaction)}` : order.transaction_id ? `TX #${order.transaction_id}` : 'No transaction link'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{scopeLabel || 'No scope'}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          className="badge"
                          style={{
                            border: 'none',
                            background:
                              statusMeta.tone === 'success'
                                ? '#ECFDF5'
                                : statusMeta.tone === 'warning'
                                  ? '#FEF3C7'
                                  : statusMeta.tone === 'danger'
                                    ? '#FEF2F2'
                                    : '#E5E7EB',
                            color:
                              statusMeta.tone === 'success'
                                ? '#047857'
                                : statusMeta.tone === 'warning'
                                  ? '#B45309'
                                  : statusMeta.tone === 'danger'
                                    ? '#DC2626'
                                    : '#374151',
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedOrder(order)
                          }}
                          className="btn-interactive"
                          style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                        >
                          Details
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

      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="admin-card"
            style={{ width: '100%', maxWidth: '760px', padding: '24px', position: 'relative' }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
            >
              x
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>ORDER DETAILS</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedOrder.ref || `Order #${selectedOrder.id}`}</h3>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <DetailBlock label="Customer" value={getCustomerName(selectedOrder)} />
                  <DetailBlock label="Phone" value={getCustomerPhone(selectedOrder)} />
                  <DetailBlock label="Date" value={getDateText(selectedOrder)} />
                  <DetailBlock label="Status" value={selectedOrder.status || 'pending'} />
                </div>
              </div>

              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <DetailBlock label="Items" value={getItemsText(selectedOrder)} />
                  <DetailBlock label="Total" value={formatMoney(selectedOrder.total, selectedOrder.currency || '')} />
                  <DetailBlock label="Delivery" value={getDeliveryText(selectedOrder)} />
                  <DetailBlock label="Address" value={selectedOrder.address || '-'} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <DetailBlock label="Payment" value={getPaymentText(selectedOrder)} />
                  <DetailBlock label="Payment ref" value={selectedOrder.payment_ref || selectedOrder.__transaction?.payment_ref || '-'} />
                  <DetailBlock label="Booking link" value={selectedOrder.__booking ? getBookingText(selectedOrder.__booking) : selectedOrder.booking_id ? `Booking #${selectedOrder.booking_id}` : '-'} />
                  <DetailBlock label="Transaction link" value={selectedOrder.__transaction ? getTransactionText(selectedOrder.__transaction) : selectedOrder.transaction_id ? `TX #${selectedOrder.transaction_id}` : '-'} />
                </div>
              </div>

              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <DetailBlock label="Location" value={selectedOrder.__location ? getLocationText(selectedOrder.__location) : selectedOrder.location_name || '-'} />
                  <DetailBlock label="Provider group" value={selectedOrder.__providerGroup ? getProviderGroupText(selectedOrder.__providerGroup) : selectedOrder.provider_group_name || '-'} />
                  <DetailBlock label="Customer ref" value={selectedOrder.customer_id || selectedOrder.member_user_id || selectedOrder.user_id || '-'} />
                  <DetailBlock label="Order ref" value={selectedOrder.ref || '-'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Status</div>
                  <select
                    value={selectedOrder.status || 'pending'}
                    onChange={async (event) => updateStatus(selectedOrder.id, event.target.value)}
                    disabled={isRowSaving(selectedOrder)}
                    style={{ ...smallFieldStyle, maxWidth: '220px' }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Linked scope</div>
                  <div style={{ fontWeight: 700 }}>
                    {getScopeText(selectedOrder) || '-'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedOrder(null)} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                  Close
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

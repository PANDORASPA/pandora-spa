'use client'

import { useMemo } from 'react'

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`

const getDateText = (booking) => booking?.appointment_date || booking?.date || booking?.created_at?.slice?.(0, 10) || '-'
const getTimeText = (booking) => booking?.start_time || booking?.time || '-'

function MetricCard({ label, value, tone = 'default', hint }) {
  const toneStyle =
    tone === 'success'
      ? { background: '#ECFDF5', color: '#047857' }
      : tone === 'warning'
        ? { background: '#FEF3C7', color: '#B45309' }
        : tone === 'danger'
          ? { background: '#FEF2F2', color: '#DC2626' }
          : { background: '#F8FAFC', color: 'var(--text)' }

  return (
    <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: '#A68B6A', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '30px', fontWeight: 800, color: toneStyle.color }}>{value}</div>
      {hint && <div style={{ marginTop: '6px', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-light)' }}>{hint}</div>}
    </div>
  )
}

function MiniList({ title, items, emptyText, renderItem }) {
  return (
    <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>{title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>{items.length} items</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {items.length ? items.map(renderItem) : <div style={{ color: 'var(--text-light)', fontSize: '13px' }}>{emptyText}</div>}
      </div>
    </div>
  )
}

const deriveUserSignalCount = (rows = [], getter) => {
  const set = new Set()
  rows.forEach((row) => {
    const value = getter(row)
    if (value == null || value === '') return
    set.add(String(value))
  })
  return set.size
}

export default function DashboardTab({ stats = {}, bookings = [], orders = [], transactions = [], customers = [], userTickets = [], onOpenTab }) {
  const dashboard = useMemo(() => {
    const todayBookings = bookings.slice(0, 5)
    const recentOrders = orders.slice(0, 5)
    const bookingTotals = bookings.reduce(
      (acc, booking) => {
        const status = String(booking?.status || 'pending').toLowerCase()
        acc.total += 1
        acc.revenue += Number(booking?.final_price || booking?.service_price || 0)
        if (status === 'completed') acc.completed += 1
        if (status === 'confirmed') acc.confirmed += 1
        if (status === 'pending') acc.pending += 1
        if (status === 'cancelled') acc.cancelled += 1
        return acc
      },
      { total: 0, revenue: 0, completed: 0, confirmed: 0, pending: 0, cancelled: 0 },
    )
    const orderTotals = orders.reduce(
      (acc, order) => {
        const status = String(order?.status || order?.payment_status || 'pending').toLowerCase()
        acc.total += 1
        acc.revenue += Number(order?.total || 0)
        if (status === 'paid' || status === 'completed' || status === 'reconciled') acc.settled += 1
        if (status === 'pending') acc.pending += 1
        if (status === 'cancelled' || status === 'failed') acc.failed += 1
        return acc
      },
      { total: 0, revenue: 0, settled: 0, pending: 0, failed: 0 },
    )
    const activeCustomerSignals = new Set()
    ;(bookings || []).forEach((booking) => {
      if (booking?.user_id != null && booking?.user_id !== '') activeCustomerSignals.add(`user:${booking.user_id}`)
      if ((booking?.customer_phone || booking?.phone) != null && (booking?.customer_phone || booking?.phone) !== '') {
        activeCustomerSignals.add(`phone:${booking.customer_phone || booking.phone}`)
      }
    })
    ;(orders || []).forEach((order) => {
      if (order?.member_user_id != null && order?.member_user_id !== '') activeCustomerSignals.add(`user:${order.member_user_id}`)
      if ((order?.phone || order?.user_phone || order?.customer_phone) != null && (order?.phone || order?.user_phone || order?.customer_phone) !== '') {
        activeCustomerSignals.add(`phone:${order.phone || order.user_phone || order.customer_phone}`)
      }
    })
    ;(transactions || []).forEach((transaction) => {
      if (transaction?.member_user_id != null && transaction?.member_user_id !== '') activeCustomerSignals.add(`user:${transaction.member_user_id}`)
      if (transaction?.customer_id != null && transaction?.customer_id !== '') activeCustomerSignals.add(`customer:${transaction.customer_id}`)
    })
    const ticketTotals = (userTickets || []).reduce(
      (acc, ticket) => {
        acc.issued += 1
        const remaining = Number(ticket?.remaining_count || 0)
        if (remaining > 0) acc.active += 1
        if (remaining <= 1) acc.lowBalance += 1
        return acc
      },
      { issued: 0, active: 0, lowBalance: 0 },
    )
    return {
      todayBookings,
      recentOrders,
      bookingTotals,
      orderTotals,
      activeCustomers: activeCustomerSignals.size || deriveUserSignalCount(customers, (customer) => customer?.id),
      ticketTotals,
    }
  }, [bookings, orders, transactions, customers, userTickets])

  const completedRatio = dashboard.bookingTotals.total
    ? `${Math.round((dashboard.bookingTotals.completed / dashboard.bookingTotals.total) * 100)}%`
    : '0%'
  const cancelledRatio = dashboard.bookingTotals.total
    ? `${Math.round((dashboard.bookingTotals.cancelled / dashboard.bookingTotals.total) * 100)}%`
    : '0%'

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '20px 22px',
          border: '1px solid rgba(166, 139, 106, 0.2)',
          background: 'linear-gradient(135deg, #fff, #FBF8F4)',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>ADMIN OVERVIEW</div>
        <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>Operational snapshot at a glance</div>
        <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
          Track bookings, revenue, customer movement, and ticket pressure from one server-truth summary.
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>BOOKING FLOW</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="Bookings today" value={stats.todayBookings || 0} hint="Appointments scheduled for the current day." />
          <MetricCard label="Today revenue" value={formatMoney(stats.todayRevenue || 0)} tone="success" hint="Booking revenue recorded for today." />
          <MetricCard label="Pending follow-up" value={stats.pending || 0} tone="warning" hint="Bookings still waiting on confirmation." />
          <MetricCard label="Members" value={stats.totalUsers || 0} tone="default" hint="Registered customer accounts." />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>OPERATIONS HEALTH</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="Bookings total" value={dashboard.bookingTotals.total} hint="All loaded booking records." />
          <MetricCard label="Completed ratio" value={completedRatio} tone="success" hint="Completed bookings as a share of all loaded bookings." />
          <MetricCard label="Cancelled ratio" value={cancelledRatio} tone="danger" hint="Cancelled bookings as a share of all loaded bookings." />
          <MetricCard label="Active customers" value={dashboard.activeCustomers} tone="default" hint="Customers visible across booking, order, or transaction signals." />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>ORDER LEDGER & TICKETS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="Orders total" value={dashboard.orderTotals.total} hint="Loaded order records." />
          <MetricCard label="Order revenue" value={formatMoney(dashboard.orderTotals.revenue)} tone="success" hint="Totals derived from order rows." />
          <MetricCard label="Settled" value={dashboard.orderTotals.settled} tone="success" hint="Paid, completed, or reconciled orders." />
          <MetricCard label="Open / failed" value={dashboard.orderTotals.pending + dashboard.orderTotals.failed} tone="warning" hint="Needs attention or retry." />
          <MetricCard label="Tickets in use" value={dashboard.ticketTotals.active} tone="default" hint="Issued ticket balances with remaining uses." />
          <MetricCard label="Low ticket balance" value={dashboard.ticketTotals.lowBalance} tone="warning" hint="Ticket rows with 1 or fewer uses left." />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <MiniList
          title="Today's appointment queue"
          items={dashboard.todayBookings}
          emptyText="No bookings loaded."
          renderItem={(booking) => (
            <div key={booking.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{booking.name || booking.customer_name || 'Guest'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    {getDateText(booking)} {getTimeText(booking)}
                  </div>
                </div>
                <span className="badge badge-outline" style={{ background: '#fff' }}>
                  {booking.status || 'pending'}
                </span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-light)' }}>
                {booking.service_name || booking.service || 'Service'} {booking.staff_name ? `- ${booking.staff_name}` : ''}
              </div>
              {onOpenTab ? (
                <div style={{ marginTop: '10px' }}>
                  <button type="button" onClick={() => onOpenTab('bookings')} className="btn btn-small btn-interactive">
                    Open bookings
                  </button>
                </div>
              ) : null}
            </div>
          )}
        />

        <MiniList
          title="Recent order activity"
          items={dashboard.recentOrders}
          emptyText="No orders loaded."
          renderItem={(order) => (
            <div key={order.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{order.user_name || order.customer_name || 'Customer'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(order.total)}</div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-light)' }}>
                {order.delivery || order.delivery_method || 'Delivery not set'} {order.payment || order.payment_method ? `- ${order.payment || order.payment_method}` : ''}
              </div>
              {onOpenTab ? (
                <div style={{ marginTop: '10px' }}>
                  <button type="button" onClick={() => onOpenTab('orders')} className="btn btn-small btn-interactive">
                    Open orders
                  </button>
                </div>
              ) : null}
            </div>
          )}
        />
      </div>
    </div>
  )
}

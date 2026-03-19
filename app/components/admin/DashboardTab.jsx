'use client'

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

export default function DashboardTab({ stats = {}, bookings = [], orders = [] }) {
  const todayBookings = bookings.slice(0, 5)
  const recentOrders = orders.slice(0, 5)

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
        <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>Daily operations at a glance</div>
        <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
          Watch bookings, revenue, members, and pending work without opening multiple tabs.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <MetricCard label="Today Bookings" value={stats.todayBookings || 0} hint="Appointments scheduled for today." />
        <MetricCard label="Today Revenue" value={formatMoney(stats.todayRevenue || 0)} tone="success" hint="Collected or confirmed for today." />
        <MetricCard label="Pending" value={stats.pending || 0} tone="warning" hint="Needs follow-up or confirmation." />
        <MetricCard label="Members" value={stats.totalUsers || 0} tone="default" hint="Total registered customers." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <MiniList
          title="Today's bookings"
          items={todayBookings}
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
                {booking.service_name || booking.service || 'Service'} {booking.staff_name ? `• ${booking.staff_name}` : ''}
              </div>
            </div>
          )}
        />

        <MiniList
          title="Recent transactions"
          items={recentOrders}
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
                {order.delivery || order.delivery_method || 'Delivery not set'} {order.payment || order.payment_method ? `• ${order.payment || order.payment_method}` : ''}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`

const getDateText = (booking) => booking?.appointment_date || booking?.date || booking?.created_at?.slice?.(0, 10) || '-'
const getTimeText = (booking) => booking?.start_time || booking?.time || '-'
const getBookingStatusLabel = (status) => {
  const value = String(status || 'pending').toLowerCase()
  if (value === 'completed') return '已完成'
  if (value === 'confirmed') return '已確認'
  if (value === 'cancelled') return '已取消'
  return '待處理'
}

const getOrderStatusLabel = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'paid' || value === 'completed' || value === 'reconciled') return '已結清'
  if (value === 'cancelled' || value === 'failed') return '失敗 / 已取消'
  return '待處理'
}

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
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>{items.length} 筆</div>
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
        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>營運總覽</div>
        <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>營運概況一眼掌握</div>
        <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
          集中查看預約、收入、客戶動態及票券壓力，全部以伺服器真實數據為準。
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>預約流程</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="今日預約" value={stats.todayBookings || 0} hint="今日已排入的預約數量。" />
          <MetricCard label="今日收入" value={formatMoney(stats.todayRevenue || 0)} tone="success" hint="今日已記錄的預約收入。" />
          <MetricCard label="待跟進" value={stats.pending || 0} tone="warning" hint="仍待確認或處理的預約。" />
          <MetricCard label="會員" value={stats.totalUsers || 0} tone="default" hint="已註冊顧客帳戶。" />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>營運健康</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="預約總數" value={dashboard.bookingTotals.total} hint="目前已載入的預約紀錄。" />
          <MetricCard label="完成率" value={completedRatio} tone="success" hint="完成預約佔全部預約的比例。" />
          <MetricCard label="取消率" value={cancelledRatio} tone="danger" hint="取消預約佔全部預約的比例。" />
          <MetricCard label="活躍顧客" value={dashboard.activeCustomers} tone="default" hint="來自預約、訂單或交易訊號的顧客數。" />
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>訂單帳務與票券</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="訂單總數" value={dashboard.orderTotals.total} hint="目前已載入的訂單紀錄。" />
          <MetricCard label="訂單收入" value={formatMoney(dashboard.orderTotals.revenue)} tone="success" hint="由訂單列計算出的總額。" />
          <MetricCard label="已結清" value={dashboard.orderTotals.settled} tone="success" hint="已付款、已完成或已對帳的訂單。" />
          <MetricCard label="未處理 / 失敗" value={dashboard.orderTotals.pending + dashboard.orderTotals.failed} tone="warning" hint="需要跟進或重試的訂單。" />
          <MetricCard label="使用中票券" value={dashboard.ticketTotals.active} tone="default" hint="仍有可用次數的票券。" />
          <MetricCard label="低餘額票券" value={dashboard.ticketTotals.lowBalance} tone="warning" hint="剩餘 1 次或以下的票券。" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <MiniList
          title="今日預約隊列"
          items={dashboard.todayBookings}
          emptyText="暫未載入預約。"
          renderItem={(booking) => (
            <div key={booking.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{booking.name || booking.customer_name || '訪客'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    {getDateText(booking)} {getTimeText(booking)}
                  </div>
                </div>
                  <span className="badge badge-outline" style={{ background: '#fff' }}>
                  {getBookingStatusLabel(booking.status)}
                </span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-light)' }}>
                {booking.service_name || booking.service || '服務'} {booking.staff_name ? `- ${booking.staff_name}` : ''}
              </div>
              {onOpenTab ? (
                <div style={{ marginTop: '10px' }}>
                  <button type="button" onClick={() => onOpenTab('bookings')} className="btn btn-small btn-interactive">
                    開啟預約
                  </button>
                </div>
              ) : null}
            </div>
          )}
        />

        <MiniList
          title="最近訂單動態"
          items={dashboard.recentOrders}
          emptyText="暫未載入訂單。"
          renderItem={(order) => (
            <div key={order.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{order.user_name || order.customer_name || '客戶'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(order.total)}</div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-light)' }}>
                {order.delivery || order.delivery_method || '未設定配送'} {order.payment || order.payment_method ? `- ${order.payment || order.payment_method}` : ''}
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-light)' }}>狀態：{getOrderStatusLabel(order.status || order.payment_status)}</div>
              {onOpenTab ? (
                <div style={{ marginTop: '10px' }}>
                  <button type="button" onClick={() => onOpenTab('orders')} className="btn btn-small btn-interactive">
                    開啟訂單
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

'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#A68B6A', '#3D3D3D', '#34D399', '#F59E0B', '#60A5FA']

const normalizeDate = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.substring(0, 10)
  const parts = text.split(/[\/.-]/).map((item) => item.trim())
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (a.length === 4) return `${a.padStart(4, '0')}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    return `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
  }
  return text.substring(0, 10)
}

const getBookingMonthKey = (booking) => {
  const value = normalizeDate(booking?.appointment_date || booking?.date)
  return value ? value.substring(0, 7) : ''
}

const getServiceName = (booking) => booking?.service_name || booking?.service || '未分類服務'

const cardStyle = { padding: '24px', minHeight: '380px' }

export default function AnalyticsTab({ bookings = [], orders = [], transactions = [], users = [], userTickets = [], reviews = [] }) {
  const analytics = useMemo(() => {
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
      : '0.0'

    const totalBookings = (bookings || []).length
    const totalTransactions = (transactions || []).length
    const monthlyRevenueMap = {}
    const serviceStats = {}
    const stylistRevenue = {}
    const statusStats = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
    const bookingRevenue = { total: 0, completed: 0, confirmed: 0, cancelled: 0 }
    const salesTotals = { orderRevenue: 0, transactionRevenue: 0, settledOrders: 0 }

    ;(bookings || []).forEach((booking) => {
      const normalizedStatus = booking.status || 'pending'
      if (statusStats[normalizedStatus] != null) statusStats[normalizedStatus] += 1
      const bookingAmount = Number(booking.final_price || booking.service_price || 0)
      bookingRevenue.total += bookingAmount
      if (normalizedStatus === 'completed') bookingRevenue.completed += bookingAmount
      if (normalizedStatus === 'confirmed') bookingRevenue.confirmed += bookingAmount
      if (normalizedStatus === 'cancelled') {
        bookingRevenue.cancelled += bookingAmount
        return
      }

      const monthKey = getBookingMonthKey(booking)
      if (monthKey) {
        monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + bookingAmount
      }

      const serviceName = getServiceName(booking)
      serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1

      if (normalizedStatus === 'completed' || normalizedStatus === 'confirmed') {
        const stylistName = booking.staff_name || '未分配服務供應者'
        stylistRevenue[stylistName] = (stylistRevenue[stylistName] || 0) + bookingAmount
      }
    })

    ;(orders || []).forEach((order) => {
      const amount = Number(order?.total || 0)
      salesTotals.orderRevenue += amount
      const status = String(order?.status || order?.payment_status || '').toLowerCase()
      if (['paid', 'completed', 'reconciled'].includes(status)) salesTotals.settledOrders += 1
    })

    ;(transactions || []).forEach((transaction) => {
      salesTotals.transactionRevenue += Number(transaction?.amount || 0)
    })

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

    const ticketStats = (userTickets || []).reduce(
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
      avgRating,
      totalReviews: reviews.length,
      totalBookings,
      totalOrders: orders?.length || 0,
      totalTransactions,
      totalUsers: users?.length || 0,
      bookingRevenue,
      salesTotals,
      activeCustomers: activeCustomerSignals.size,
      ticketStats,
      monthlyTrend: Object.entries(monthlyRevenueMap).sort().slice(-12).map(([name, revenue]) => ({ name, revenue })),
      servicePopularity: Object.entries(serviceStats).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count })),
      stylistPerformance: Object.entries(stylistRevenue).sort(([, a], [, b]) => b - a).map(([name, revenue]) => ({ name, revenue })),
      statusDistribution: [
        { name: '待處理', value: statusStats.pending, color: '#f59e0b' },
        { name: '已確認', value: statusStats.confirmed, color: '#10b981' },
        { name: '已完成', value: statusStats.completed, color: '#3b82f6' },
        { name: '已取消', value: statusStats.cancelled, color: '#ef4444' },
      ].filter((item) => item.value > 0),
      recentReviews: (reviews || []).slice(0, 5),
    }
  }, [bookings, orders, transactions, users, userTickets, reviews])

  return (
    <div>
      <div className="admin-card" style={{ padding: '20px 22px', marginBottom: '20px', border: '1px solid rgba(166, 139, 106, 0.2)', background: 'linear-gradient(135deg, #fff, #FBF8F4)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>分析總覽</div>
        <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>伺服器真實數據的表現總覽</div>
        <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
          查看預約、收入與評分走勢，全部以管理後台已載入的資料為準。
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>預約</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #34D399' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>預約總數</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#34D399' }}>{analytics.totalBookings}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #A68B6A' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>預約收入</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#A68B6A' }}>{`$${Number(analytics.bookingRevenue.total || 0).toLocaleString()}`}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #3B82F6' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>已完成金額</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#3B82F6' }}>{`$${Number(analytics.bookingRevenue.completed || 0).toLocaleString()}`}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #F59E0B' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>已確認管線</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{`$${Number(analytics.bookingRevenue.confirmed || 0).toLocaleString()}`}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>銷售</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #10B981' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>訂單收入</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#10B981' }}>{`$${Number(analytics.salesTotals.orderRevenue || 0).toLocaleString()}`}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #6366F1' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>交易總數</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#6366F1' }}>{analytics.totalTransactions}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #111827' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>交易總額</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>{`$${Number(analytics.salesTotals.transactionRevenue || 0).toLocaleString()}`}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #059669' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>已結清訂單</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669' }}>{analytics.salesTotals.settledOrders}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '30px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>客戶與票券</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #8B5CF6' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>活躍客戶</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#8B5CF6' }}>{analytics.activeCustomers || analytics.totalUsers}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #0EA5E9' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>票券筆數</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0EA5E9' }}>{analytics.ticketStats.issued}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #14B8A6' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>使用中票券</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#14B8A6' }}>{analytics.ticketStats.active}</div>
          </div>
          <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #F97316' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>低餘額提示</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F97316' }}>{analytics.ticketStats.lowBalance}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #F59E0B' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>平均評分</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{analytics.avgRating}</div>
            <div style={{ fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>/ 5.0</div>
          </div>
        </div>
        <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #8B5CF6' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>評價總數</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#8B5CF6' }}>{analytics.totalReviews}</div>
        </div>
        <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #34D399' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>訂單總數</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#34D399' }}>{analytics.totalOrders}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>每月預約收入</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={analytics.monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A68B6A" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#A68B6A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '收入']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#A68B6A" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>預約次數最多服務</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={analytics.servicePopularity} margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} width={120} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#A68B6A" radius={[0, 4, 4, 0]} barSize={28}>
                  {analytics.servicePopularity.map((_, index) => <Cell key={index} fill={index < 3 ? '#A68B6A' : '#D1D5DB'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>設計師已完成金額表現</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={analytics.stylistPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '收入']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="revenue" fill="#3D3D3D" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>預約狀態分布</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={analytics.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {analytics.statusDistribution.map((entry, index) => <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={{ ...cardStyle, minHeight: 'auto' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>最近評價</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {analytics.recentReviews.length === 0 ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px 0' }}>暫無評價。</p>
            ) : (
              analytics.recentReviews.map((review, index) => (
                <div key={index} style={{ paddingBottom: '16px', borderBottom: index < analytics.recentReviews.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                    {review.rating} / 5
                    <span style={{ color: 'var(--text-light)', fontWeight: 400, fontSize: '12px' }}> - {review.created_at ? new Date(review.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>{review.comment || '未有文字留言。'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

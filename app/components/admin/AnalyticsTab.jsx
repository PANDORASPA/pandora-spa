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

const getServiceName = (booking) => booking?.service_name || booking?.service || 'Unknown'

const cardStyle = { padding: '24px', minHeight: '380px' }

export default function AnalyticsTab({ bookings, orders, reviews = [] }) {
  const analytics = useMemo(() => {
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
      : '0.0'

    const monthlyRevenueMap = {}
    const serviceStats = {}
    const stylistRevenue = {}
    const statusStats = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }

    ;(bookings || []).forEach((booking) => {
      const normalizedStatus = booking.status || 'pending'
      if (statusStats[normalizedStatus] != null) statusStats[normalizedStatus] += 1
      if (normalizedStatus === 'cancelled') return

      const monthKey = getBookingMonthKey(booking)
      if (monthKey) {
        monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + Number(booking.final_price || booking.service_price || 0)
      }

      const serviceName = getServiceName(booking)
      serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1

      if (normalizedStatus === 'completed' || normalizedStatus === 'confirmed') {
        const stylistName = booking.staff_name || 'Unassigned'
        stylistRevenue[stylistName] = (stylistRevenue[stylistName] || 0) + Number(booking.final_price || booking.service_price || 0)
      }
    })

    return {
      avgRating,
      totalReviews: reviews.length,
      totalOrders: orders?.length || 0,
      monthlyTrend: Object.entries(monthlyRevenueMap).sort().slice(-12).map(([name, revenue]) => ({ name, revenue })),
      servicePopularity: Object.entries(serviceStats).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count })),
      stylistPerformance: Object.entries(stylistRevenue).sort(([, a], [, b]) => b - a).map(([name, revenue]) => ({ name, revenue })),
      statusDistribution: [
        { name: 'Pending', value: statusStats.pending, color: '#f59e0b' },
        { name: 'Confirmed', value: statusStats.confirmed, color: '#10b981' },
        { name: 'Completed', value: statusStats.completed, color: '#3b82f6' },
        { name: 'Cancelled', value: statusStats.cancelled, color: '#ef4444' },
      ].filter((item) => item.value > 0),
      recentReviews: (reviews || []).slice(0, 5),
    }
  }, [bookings, orders, reviews])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #F59E0B' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Average rating</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{analytics.avgRating}</div>
            <div style={{ fontSize: '14px', color: '#F59E0B', fontWeight: 700 }}>/ 5.0</div>
          </div>
        </div>
        <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #8B5CF6' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total reviews</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#8B5CF6' }}>{analytics.totalReviews}</div>
        </div>
        <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #34D399' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Orders tracked</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#34D399' }}>{analytics.totalOrders}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>Monthly revenue</h3>
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
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#A68B6A" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>Top services</h3>
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
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>Stylist performance</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={analytics.stylistPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="revenue" fill="#3D3D3D" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={cardStyle}>
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>Booking status mix</h3>
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
          <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 700 }}>Recent reviews</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {analytics.recentReviews.length === 0 ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '40px 0' }}>No reviews yet.</p>
            ) : (
              analytics.recentReviews.map((review, index) => (
                <div key={index} style={{ paddingBottom: '16px', borderBottom: index < analytics.recentReviews.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                    {review.rating} / 5
                    <span style={{ color: 'var(--text-light)', fontWeight: 400, fontSize: '12px' }}> - {review.created_at ? new Date(review.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>{review.comment || 'No written comment.'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

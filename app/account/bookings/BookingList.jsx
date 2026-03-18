'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function BookingList({ initialBookings }) {
  const [bookings, setBookings] = useState(initialBookings || [])
  const [loadingId, setLoadingId] = useState(null)

  const handleCancel = async (id) => {
    if (!window.confirm('確定要取消這個預約嗎？')) return

    setLoadingId(id)
    try {
      const response = await fetch(`/api/account/bookings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '取消失敗')

      toast.success('預約已取消')
      setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' } : booking)))
    } catch (error) {
      toast.error('取消失敗: ' + (error?.message || '請稍後再試'))
    } finally {
      setLoadingId(null)
    }
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return { text: '待確認', bg: '#fef3c7', color: '#d97706' }
      case 'confirmed':
        return { text: '已確認', bg: '#dcfce7', color: '#16a34a' }
      case 'cancelled':
        return { text: '已取消', bg: '#fee2e2', color: '#dc2626' }
      case 'completed':
        return { text: '已完成', bg: '#f3f4f6', color: '#4b5563' }
      default:
        return { text: status || '未知', bg: '#f3f4f6', color: '#4b5563' }
    }
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#666', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        目前未有預約記錄
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {bookings.map((booking) => {
        const status = getStatusDisplay(booking.status)
        const isEditable = booking.status === 'pending' || booking.status === 'confirmed'

        return (
          <div key={booking.id} style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>{booking.service || '服務'}</div>
                <div style={{ color: '#666', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{booking.appointment_date || booking.date || ''}</span>
                  <span>{booking.start_time || booking.time || ''}</span>
                </div>
                {booking.staff_name && <div style={{ color: '#666', fontSize: '14px', marginTop: '6px' }}>髮型師：{booking.staff_name}</div>}
                <div style={{ color: '#999', fontSize: '12px', marginTop: '6px' }}>預約編號：{booking.ref || `#${booking.id}`}</div>
              </div>
              <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', background: status.bg, color: status.color, fontWeight: 800 }}>
                {status.text}
              </span>
            </div>

            {isEditable && (
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={loadingId === booking.id}
                  className="btn-interactive"
                  style={{ flex: 1, padding: '10px', background: '#fff', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '10px', fontWeight: 700, cursor: loadingId === booking.id ? 'not-allowed' : 'pointer', opacity: loadingId === booking.id ? 0.7 : 1 }}
                >
                  {loadingId === booking.id ? '處理中...' : '取消預約'}
                </button>
                <Link
                  href={`/booking?editId=${booking.id}`}
                  className="btn-interactive"
                  style={{ flex: 1, padding: '10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
                >
                  更改時間
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

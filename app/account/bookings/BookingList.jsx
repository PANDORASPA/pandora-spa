'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

const T = {
  cancelConfirm: '\u78ba\u5b9a\u8981\u53d6\u6d88\u9019\u7b46\u9810\u7d04\u55ce\uff1f',
  cancelFailed: '\u53d6\u6d88\u9810\u7d04\u5931\u6557',
  cancelSuccess: '\u9810\u7d04\u5df2\u53d6\u6d88',
  cancelRetry: '\u53d6\u6d88\u9810\u7d04\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66',
  pending: '\u5f85\u78ba\u8a8d',
  confirmed: '\u5df2\u78ba\u8a8d',
  cancelled: '\u5df2\u53d6\u6d88',
  completed: '\u5df2\u5b8c\u6210',
  unknown: '\u672a\u77e5',
  empty: '\u76ee\u524d\u9084\u6c92\u6709\u9810\u7d04\u8a18\u9304',
  serviceFallback: '\u670d\u52d9\u9805\u76ee',
  staff: '\u8a2d\u8a08\u5e2b',
  ref: '\u9810\u7d04\u7de8\u865f',
  loading: '\u8655\u7406\u4e2d...',
  cancel: '\u53d6\u6d88\u9810\u7d04',
  reschedule: '\u66f4\u6539\u6642\u6bb5',
}

export default function BookingList({ initialBookings }) {
  const [bookings, setBookings] = useState(initialBookings || [])
  const [loadingId, setLoadingId] = useState(null)

  const handleCancel = async (id) => {
    if (!window.confirm(T.cancelConfirm)) return

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
      if (!response.ok) throw new Error(result?.error || T.cancelFailed)

      toast.success(T.cancelSuccess)
      setBookings((current) =>
        current.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' } : booking)),
      )
    } catch (error) {
      toast.error(error?.message || T.cancelRetry)
    } finally {
      setLoadingId(null)
    }
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return { text: T.pending, bg: '#fef3c7', color: '#d97706' }
      case 'confirmed':
        return { text: T.confirmed, bg: '#dcfce7', color: '#16a34a' }
      case 'cancelled':
        return { text: T.cancelled, bg: '#fee2e2', color: '#dc2626' }
      case 'completed':
        return { text: T.completed, bg: '#f3f4f6', color: '#4b5563' }
      default:
        return { text: status || T.unknown, bg: '#f3f4f6', color: '#4b5563' }
    }
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          color: '#666',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        {T.empty}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {bookings.map((booking) => {
        const status = getStatusDisplay(booking.status)
        const isEditable = booking.status === 'pending' || booking.status === 'confirmed'

        return (
          <div
            key={booking.id}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>
                  {booking.service || T.serviceFallback}
                </div>
                <div style={{ color: '#666', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{booking.appointment_date || booking.date || ''}</span>
                  <span>{booking.start_time || booking.time || ''}</span>
                </div>
                {booking.staff_name && (
                  <div style={{ color: '#666', fontSize: '14px', marginTop: '6px' }}>
                    {T.staff}\uff1a{booking.staff_name}
                  </div>
                )}
                <div style={{ color: '#999', fontSize: '12px', marginTop: '6px' }}>
                  {T.ref}\uff1a{booking.ref || `#${booking.id}`}
                </div>
              </div>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  background: status.bg,
                  color: status.color,
                  fontWeight: 800,
                }}
              >
                {status.text}
              </span>
            </div>

            {isEditable && (
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={loadingId === booking.id}
                  className="btn-interactive"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#fff',
                    color: '#dc2626',
                    border: '1px solid #fee2e2',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: loadingId === booking.id ? 'not-allowed' : 'pointer',
                    opacity: loadingId === booking.id ? 0.7 : 1,
                  }}
                >
                  {loadingId === booking.id ? T.loading : T.cancel}
                </button>
                <Link
                  href={`/booking?editId=${booking.id}`}
                  className="btn-interactive"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  {T.reschedule}
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

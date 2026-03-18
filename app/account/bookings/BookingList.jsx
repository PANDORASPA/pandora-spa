'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '../../../lib/supabase/browser'
import { toast } from 'react-hot-toast'

export default function BookingList({ initialBookings }) {
  const [bookings, setBookings] = useState(initialBookings || [])
  const [loadingId, setLoadingId] = useState(null)
  const router = useRouter()
  const supabase = getBrowserClient()

  const handleCancel = async (id) => {
    if (!window.confirm('確定要取消此預約嗎？')) return

    setLoadingId(id)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      toast.error('取消失敗: ' + error.message)
    } else {
      toast.success('預約已取消')
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
    }
    setLoadingId(null)
  }

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'pending': return { text: '處理中', bg: '#fef3c7', color: '#d97706' }
      case 'confirmed': return { text: '已確認', bg: '#dcfce7', color: '#16a34a' }
      case 'cancelled': return { text: '已取消', bg: '#fee2e2', color: '#dc2626' }
      case 'completed': return { text: '已完成', bg: '#f3f4f6', color: '#4b5563' }
      default: return { text: status || '未知', bg: '#f3f4f6', color: '#4b5563' }
    }
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#666', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        暫時沒有預約記錄
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {bookings.map((b) => {
        const statusObj = getStatusDisplay(b.status)
        const isCancellable = b.status === 'pending' || b.status === 'confirmed'

        return (
          <div key={b.id} style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>{b.service || b.service_name || '服務'}</div>
                <div style={{ color: '#666', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 {(b.appointment_date || b.date || '').toString()}</span>
                  <span>⏰ {b.start_time || b.time || ''}</span>
                </div>
                {b.staff_name && <div style={{ color: '#666', fontSize: '14px', marginTop: '6px' }}>💇‍♂️ 髮型師：{b.staff_name}</div>}
                <div style={{ color: '#999', fontSize: '12px', marginTop: '6px' }}>預約編號：{b.ref || `#${b.id}`}</div>
              </div>
              <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', background: statusObj.bg, color: statusObj.color, fontWeight: 800 }}>
                {statusObj.text}
              </span>
            </div>

            {isCancellable && (
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <button
                  onClick={() => handleCancel(b.id)}
                  disabled={loadingId === b.id}
                  className="btn-interactive"
                  style={{ flex: 1, padding: '10px', background: '#fff', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '10px', fontWeight: 700, cursor: loadingId === b.id ? 'not-allowed' : 'pointer', opacity: loadingId === b.id ? 0.7 : 1 }}
                >
                  {loadingId === b.id ? '處理中...' : '取消預約'}
                </button>
                <Link
                  href={`/booking?editId=${b.id}`}
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

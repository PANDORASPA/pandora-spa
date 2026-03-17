'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [tickets, setTickets] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const router = useRouter()

  useEffect(() => {
    // Check for logged in user
    const savedUser = localStorage.getItem('viva_user')
    if (!savedUser) {
      router.push('/booking') // Redirect to login if not logged in
      return
    }

    const userData = JSON.parse(savedUser)
    setUser(userData)
    fetchUserData(userData)
  }, [])

  const fetchUserData = async (userData) => {
    setLoading(true)
    const [bookingsRes, ticketsRes, reviewsRes] = await Promise.all([
      supabase.from('bookings').select('*').eq('phone', userData.phone).order('created_at', { ascending: false }),
      supabase.from('user_tickets').select('*').eq('customer_id', userData.id).gt('remaining_count', 0),
      supabase.from('reviews').select('*').eq('customer_id', userData.id)
    ])
    
    if (bookingsRes.data) setBookings(bookingsRes.data)
    if (ticketsRes.data) setTickets(ticketsRes.data)
    if (reviewsRes.data) setReviews(reviewsRes.data)
    setLoading(false)
  }

  const handleReviewSubmit = async () => {
    if (!selectedBookingForReview) return

    const { error } = await supabase.from('reviews').insert({
      booking_id: selectedBookingForReview.id,
      customer_id: user.id,
      staff_id: selectedBookingForReview.staff_id,
      rating: reviewForm.rating,
      comment: reviewForm.comment
    })

    if (error) {
      alert('提交評論失敗: ' + error.message) // Simple alert for now or use toast
    } else {
      setShowReviewModal(false)
      fetchUserData(user) // Refresh data
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('viva_user')
    window.dispatchEvent(new Event('storage')) // Notify Navbar
    router.push('/')
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', paddingBottom: '40px' }}>
      <div style={{ background: '#fff', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 700 }}>
          {user.name?.charAt(0)}
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{user.name}</h1>
        <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '16px' }}>{user.phone}</div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
          <div style={{ padding: '12px 24px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>會員等級</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{user.membership_level || '普通會員'}</div>
          </div>
          <div style={{ padding: '12px 24px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>現有積分</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{user.points || 0}</div>
          </div>
        </div>

        <button onClick={handleLogout} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          登出帳號
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '24px auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎫</span> 我的套票
        </h2>
        {tickets.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            {tickets.map(t => (
              <div key={t.id} className="admin-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #3D3D3D, #1a1a1a)', color: '#fff' }}>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px', letterSpacing: '1px' }}>VIVA PASS</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>{t.ticket_name}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>剩餘次數</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{t.remaining_count}</div>
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    有效期至: {new Date(t.expiry_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: '40px', padding: '20px', background: '#fff', borderRadius: '12px', textAlign: 'center', border: '1px dashed #d1d5db' }}>
            <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>暫無可用套票</p>
          </div>
        )}

        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📅</span> 我的預約紀錄
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>載入紀錄中...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
            <p style={{ color: '#666', marginBottom: '20px' }}>您目前還沒有預約紀錄</p>
            <Link href="/booking" className="btn btn-interactive" style={{ display: 'inline-block', padding: '10px 24px' }}>
              立即預約
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {bookings.map(booking => (
              <div key={booking.id} className="admin-card" style={{ padding: '20px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{booking.service}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {booking.date} {booking.time}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${
                      booking.status === 'confirmed' ? 'badge-success' : 
                      booking.status === 'completed' ? 'badge-success' : 
                      booking.status === 'cancelled' ? 'badge-outline' : 'badge-outline'
                    }`} style={{ 
                      background: booking.status === 'confirmed' ? '#dbeafe' : booking.status === 'pending' ? '#fef3c7' : booking.status === 'completed' ? '#dcfce7' : '#fee2e2',
                      color: booking.status === 'confirmed' ? '#2563eb' : booking.status === 'pending' ? '#d97706' : booking.status === 'completed' ? '#166534' : '#dc2626',
                      borderColor: 'transparent'
                    }}>
                      {booking.status === 'confirmed' ? '已確認' : booking.status === 'pending' ? '待確認' : booking.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>${booking.final_price || booking.service_price}</div>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    <span style={{ marginRight: '12px' }}>💇‍♂️ {booking.staff_name || '未指定'}</span>
                    <span>📍 預約編號: {booking.ref || booking.id.slice(0, 8)}</span>
                  </div>
                  {booking.status === 'completed' && !reviews.find(r => r.booking_id === booking.id) && (
                    <button 
                      onClick={() => { setSelectedBookingForReview(booking); setReviewForm({rating: 5, comment: ''}); setShowReviewModal(true) }}
                      className="btn-interactive"
                      style={{ padding: '6px 12px', fontSize: '12px', background: '#fff', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '6px' }}
                    >
                      ⭐ 評價服務
                    </button>
                  )}
                  {reviews.find(r => r.booking_id === booking.id) && (
                    <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                      已評價 {reviews.find(r => r.booking_id === booking.id).rating}⭐
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowReviewModal(false)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', textAlign: 'center' }}>評價本次服務</h3>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{selectedBookingForReview?.service} - {selectedBookingForReview?.staff_name}</div>
              <div style={{ fontSize: '32px', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} onClick={() => setReviewForm({...reviewForm, rating: star})} style={{ color: star <= reviewForm.rating ? '#f59e0b' : '#e5e7eb' }}>★</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <textarea 
                value={reviewForm.comment}
                onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                placeholder="寫下您的評價..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}
              />
            </div>
            <button 
              onClick={handleReviewSubmit}
              className="btn-interactive"
              style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600 }}
            >
              提交評價
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

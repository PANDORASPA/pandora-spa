import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../../lib/supabase/server'

export default async function AccountBookingsPage() {
  const supabase = getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/account/bookings')
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>我的預約</h1>
        <p style={{ color: '#666' }}>查看自己的預約時間、服務與目前狀態。</p>
      </section>

      <section style={{ padding: '32px 16px 80px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <Link href="/account" style={{ color: '#A68B6A', fontWeight: 700 }}>
              返回會員中心
            </Link>
          </div>

          {!bookings || bookings.length === 0 ? (
            <div className="admin-card" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
              目前還沒有任何預約紀錄。
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {bookings.map((booking) => (
                <div key={booking.id} className="admin-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: '6px' }}>{booking.service || '服務'}</div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {(booking.appointment_date || booking.date || '').toString()} {booking.start_time || booking.time || ''}
                      </div>
                      {booking.staff_name ? <div style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>設計師：{booking.staff_name}</div> : null}
                    </div>
                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        background: '#F3F4F6',
                        color: '#374151',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {booking.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

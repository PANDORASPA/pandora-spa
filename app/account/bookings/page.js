import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../../lib/supabase/server'

export default async function AccountBookings() {
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
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>我的<span style={{ color: '#A68B6A' }}>預約</span></h1>
      </section>

      <section style={{ padding: '24px 16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px' }}>
            <Link href="/account" style={{ color: '#A68B6A', fontWeight: 800 }}>
              ← 返回會員中心
            </Link>
          </div>

          {!bookings || bookings.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#666', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              暫時沒有預約記錄
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {bookings.map((b) => (
                <div key={b.id} style={{ background: '#fff', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: '6px' }}>{b.service || b.service_name || '服務'}</div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {(b.appointment_date || b.date || '').toString()} {b.start_time || b.time || ''}
                      </div>
                      {b.staff_name && <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>髮型師：{b.staff_name}</div>}
                    </div>
                    <span style={{ padding: '6px 10px', borderRadius: '999px', fontSize: '12px', background: '#f3f4f6', color: '#374151', fontWeight: 700 }}>
                      {b.status || 'pending'}
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


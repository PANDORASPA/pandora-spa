import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../../lib/supabase/server'
import BookingList from './BookingList'

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

          <BookingList initialBookings={bookings} />
        </div>
      </section>
    </>
  )
}


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

  const ticketIds = [...new Set((bookings || []).map((booking) => booking.user_ticket_id).filter(Boolean))]
  let enrichedBookings = bookings || []

  if (ticketIds.length > 0) {
    const { data: userTickets } = await supabase
      .from('user_tickets')
      .select('id,ticket_name,remaining_count,expiry_date')
      .in('id', ticketIds)

    const ticketsById = new Map((userTickets || []).map((ticket) => [ticket.id, ticket]))
    enrichedBookings = enrichedBookings.map((booking) => ({
      ...booking,
      ticket_details: ticketsById.get(booking.user_ticket_id) || null,
    }))
  }

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

          <BookingList initialBookings={enrichedBookings} />
        </div>
      </section>
    </>
  )
}

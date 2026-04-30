import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

export async function GET() {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const [ticketsRes, ordersRes, redemptionsRes] = await Promise.all([
      supabase
        .from('user_tickets')
        .select('id,ticket_id,ticket_name,remaining_count,expiry_date,created_at,tickets(id,name,service_id,count,price,description,services(id,name))')
        .eq('member_user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*')
        .eq('member_user_id', user.id)
        .eq('delivery', 'digital-ticket')
        .in('status', ['awaiting_payment', 'pending', 'payment_setup_failed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('ticket_redemptions')
        .select('id,user_ticket_id,booking_id,order_id,delta,reason,note,created_at,bookings(id,ref,service,appointment_date,start_time,status)')
        .eq('member_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (ticketsRes.error) return NextResponse.json({ error: ticketsRes.error.message }, { status: 500 })
    if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 })
    const redemptionsMissing = /ticket_redemptions|schema cache|relation|does not exist/i.test(String(redemptionsRes.error?.message || ''))
    if (redemptionsRes.error && !redemptionsMissing) return NextResponse.json({ error: redemptionsRes.error.message }, { status: 500 })

    return NextResponse.json(
      {
        tickets: ticketsRes.data || [],
        ticketOrders: ordersRes.data || [],
        pendingOrders: (ordersRes.data || []).filter((order) => ['awaiting_payment', 'pending', 'payment_setup_failed'].includes(String(order?.status || '').toLowerCase())),
        redemptions: redemptionsMissing ? [] : redemptionsRes.data || [],
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const normalizeText = (value) => String(value || '').trim()

export async function POST(request) {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
    }

    const body = await request.json()
    const ticketId = Number(body?.ticketId)
    if (!Number.isFinite(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('enabled', true)
      .maybeSingle()

    if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })

    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    const orderRef = `ORD${Date.now().toString().slice(-6)}`
    const ticketLabel = `Ticket: ${normalizeText(ticket.name) || `#${ticket.id}`}`

    const insertPayload = {
      member_user_id: user.id,
      ticket_id: ticket.id,
      ticket_name: ticket.name,
      remaining_count: Number(ticket.count || ticket.times || 0),
      expiry_date: expiryDate.toISOString(),
    }

    const { data, error } = await supabase.from('user_tickets').insert(insertPayload).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const orderPayload = {
      user_name: normalizeText(user.email) || 'Member',
      address: '',
      delivery: 'digital',
      payment: 'manual',
      items: ticketLabel,
      total: Number(ticket.price || 0),
      status: 'pending',
      created_at: new Date().toISOString(),
      member_user_id: user.id,
      ref: orderRef,
    }

    const { error: orderError } = await supabase.from('orders').insert(orderPayload)
    if (orderError) {
      await supabase.from('user_tickets').delete().eq('id', data.id)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    return NextResponse.json({ ticket: data, ref: orderRef }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

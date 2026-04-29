import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const normalizeText = (value) => String(value || '').trim()
const isPaidRequest = (body) =>
  normalizeText(body?.paymentState).toLowerCase() === 'paid' &&
  normalizeText(body?.paymentProvider).toLowerCase() === 'manual-admin'

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
    const paidRequest = isPaidRequest(body)
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
    const ticketLabel = `Package #${ticket.id}: ${normalizeText(ticket.name) || `#${ticket.id}`}`

    const orderPayload = {
      user_name: normalizeText(user.email) || 'Member',
      address: '',
      delivery: 'digital-ticket',
      payment: paidRequest ? 'manual-admin' : 'awaiting-payment',
      items: ticketLabel,
      total: Number(ticket.price || 0),
      status: paidRequest ? 'completed' : 'awaiting_payment',
      created_at: new Date().toISOString(),
      member_user_id: user.id,
      ref: orderRef,
    }

    const { data: order, error: orderError } = await supabase.from('orders').insert(orderPayload).select('*').single()
    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    if (!paidRequest) {
      return NextResponse.json(
        {
          ref: orderRef,
          order,
          entitlementIssued: false,
          requiresPayment: true,
          message: 'Order created and waiting for payment confirmation before the ticket is issued.',
        },
        { status: 202 }
      )
    }

    const insertPayload = {
      member_user_id: user.id,
      ticket_id: ticket.id,
      ticket_name: ticket.name,
      remaining_count: Number(ticket.count || ticket.times || 0),
      expiry_date: expiryDate.toISOString(),
    }

    const { data: issuedTicket, error: issueError } = await supabase.from('user_tickets').insert(insertPayload).select('*').single()
    if (issueError) {
      await supabase.from('orders').update({ status: 'fulfillment_failed', payment: 'manual-admin' }).eq('id', order.id)
      return NextResponse.json({ error: issueError.message, order, entitlementIssued: false }, { status: 500 })
    }

    const ledgerRes = await supabase.from('ticket_redemptions').insert({
      user_ticket_id: issuedTicket.id,
      order_id: order.id,
      member_user_id: user.id,
      delta: Number(issuedTicket.remaining_count || 0),
      reason: 'purchase_issued',
      note: `Issued from order ${orderRef}`,
      created_by: user.id,
    })
    const ledgerMessage = String(ledgerRes.error?.message || '')
    if (ledgerRes.error && !/ticket_redemptions|schema cache|relation|does not exist/i.test(ledgerMessage)) {
      return NextResponse.json({ error: ledgerRes.error.message, order, entitlementIssued: true, ticket: issuedTicket }, { status: 500 })
    }

    return NextResponse.json({ ticket: issuedTicket, order, ref: orderRef, entitlementIssued: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

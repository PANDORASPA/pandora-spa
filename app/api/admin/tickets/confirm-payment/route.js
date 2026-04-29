import { NextResponse } from 'next/server'
import { addYears, loadAdminContext, normalizePositiveInteger, normalizeText } from '../_helpers'

const parseTicketIdFromOrder = (order) => {
  const explicit = normalizePositiveInteger(order?.ticket_id)
  if (explicit) return explicit
  const match = String(order?.items || '').match(/#(\d+)/)
  return normalizePositiveInteger(match?.[1])
}

export async function POST(request) {
  try {
    const context = await loadAdminContext()
    if (context.error) {
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    const body = await request.json().catch(() => ({}))
    const orderId = normalizePositiveInteger(body?.orderId)
    if (!orderId) return NextResponse.json({ error: 'Invalid order.' }, { status: 400 })

    const { supabase, user } = context
    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.delivery !== 'digital-ticket') {
      return NextResponse.json({ error: 'This order is not a package order.' }, { status: 400 })
    }
    if (!order.member_user_id) {
      return NextResponse.json({ error: 'Order is not linked to a member account.' }, { status: 400 })
    }
    if (String(order.status || '').toLowerCase() === 'completed') {
      return NextResponse.json({ error: 'This package order has already been completed.' }, { status: 409 })
    }

    const ticketId = normalizePositiveInteger(body?.ticketId) || parseTicketIdFromOrder(order)
    if (!ticketId) return NextResponse.json({ error: 'Package template could not be identified.' }, { status: 400 })

    const existingIssuedRes = await supabase
      .from('ticket_redemptions')
      .select('id,user_ticket_id')
      .eq('order_id', order.id)
      .eq('reason', 'purchase_issued')
      .maybeSingle()
    const existingIssuedMissing = /ticket_redemptions|schema cache|relation|does not exist/i.test(String(existingIssuedRes.error?.message || ''))
    if (existingIssuedRes.error && !existingIssuedMissing) {
      return NextResponse.json({ error: existingIssuedRes.error.message }, { status: 500 })
    }
    const existingIssued = existingIssuedMissing ? null : existingIssuedRes.data
    if (existingIssued) {
      return NextResponse.json({ error: 'This order already issued a package.' }, { status: 409 })
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle()
    if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })
    if (!ticket || ticket.enabled === false) return NextResponse.json({ error: 'Package template is unavailable.' }, { status: 404 })

    const expiryDate = body?.expiryDate ? new Date(body.expiryDate) : addYears(new Date(), 1)
    if (Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: 'Invalid expiry date.' }, { status: 400 })
    }

    const insertPayload = {
      member_user_id: order.member_user_id,
      ticket_id: ticket.id,
      ticket_name: ticket.name,
      remaining_count: Number(ticket.count || ticket.times || 0),
      expiry_date: expiryDate.toISOString(),
    }

    const { data: issuedTicket, error: issueError } = await supabase
      .from('user_tickets')
      .insert(insertPayload)
      .select('*')
      .single()
    if (issueError) return NextResponse.json({ error: issueError.message }, { status: 500 })

    const updateOrderRes = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment: normalizeText(body?.paymentMethod) || 'manual-admin',
      })
      .eq('id', order.id)
      .select('*')
      .single()
    if (updateOrderRes.error) {
      return NextResponse.json({ error: updateOrderRes.error.message, issuedTicket }, { status: 500 })
    }

    const ledgerRes = await supabase.from('ticket_redemptions').insert({
      user_ticket_id: issuedTicket.id,
      order_id: order.id,
      member_user_id: order.member_user_id,
      delta: Number(issuedTicket.remaining_count || 0),
      reason: 'purchase_issued',
      note: `Issued from order ${order.ref || order.id}`,
      created_by: user.id,
    })
    const ledgerMessage = String(ledgerRes.error?.message || '')
    if (ledgerRes.error && !/ticket_redemptions|schema cache|relation|does not exist/i.test(ledgerMessage)) {
      return NextResponse.json({ error: ledgerRes.error.message, ticket: issuedTicket, order: updateOrderRes.data }, { status: 500 })
    }

    return NextResponse.json({ ticket: issuedTicket, order: updateOrderRes.data }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

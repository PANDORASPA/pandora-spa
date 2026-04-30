import { NextResponse } from 'next/server'
import { loadAdminContext, normalizePositiveInteger, normalizeText } from '../_helpers'
import { issueTicketForPaidOrder, parseTicketIdFromOrder } from '../../../../../lib/ticket-issuance'

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
    if (String(order.status || '').toLowerCase() === 'completed') {
      return NextResponse.json({ error: 'This package order has already been completed.' }, { status: 409 })
    }

    const issued = await issueTicketForPaidOrder({
      supabase,
      order,
      ticketId: normalizePositiveInteger(body?.ticketId) || parseTicketIdFromOrder(order),
      createdBy: user.id,
      paymentMethod: normalizeText(body?.paymentMethod) || 'manual-admin',
      paymentRef: normalizeText(body?.paymentRef),
    })

    return NextResponse.json({ ticket: issued.ticket, order: issued.order, alreadyIssued: issued.alreadyIssued }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: error?.status || 500 })
  }
}

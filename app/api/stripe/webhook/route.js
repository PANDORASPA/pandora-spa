import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'
import { verifyStripeWebhookSignature } from '../../../../lib/stripe'
import { issueTicketForPaidOrder, normalizePositiveInteger } from '../../../../lib/ticket-issuance'

const paidEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])

export async function POST(request) {
  const payload = await request.text()

  try {
    verifyStripeWebhookSignature({
      payload,
      signatureHeader: request.headers.get('stripe-signature'),
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    })

    const event = JSON.parse(payload)
    if (!paidEvents.has(event?.type)) {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 })
    }

    const session = event?.data?.object || {}
    if (session.payment_status && session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, ignored: true, paymentStatus: session.payment_status }, { status: 200 })
    }

    const metadata = session.metadata || {}
    const orderId = normalizePositiveInteger(metadata.order_id)
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order metadata.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    if (metadata.kind === 'ticket_order') {
      const issued = await issueTicketForPaidOrder({
        supabase,
        order,
        ticketId: normalizePositiveInteger(metadata.ticket_id),
        paymentMethod: 'stripe',
        paymentRef: session.payment_intent || session.id || '',
      })
      return NextResponse.json({ received: true, order: issued.order, ticket: issued.ticket, alreadyIssued: issued.alreadyIssued }, { status: 200 })
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed', payment: 'stripe' })
      .eq('id', order.id)
      .select('*')
      .single()
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ received: true, order: updatedOrder }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Stripe webhook failed.' }, { status: error?.status || 500 })
  }
}

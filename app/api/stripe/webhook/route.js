import { NextResponse } from 'next/server'
import { rateLimit } from '../../../../lib/security/request-guards'
import { getServiceClient } from '../../../../lib/supabase/service'
import { verifyStripeWebhookSignature } from '../../../../lib/stripe'
import { issueTicketForPaidOrder, normalizePositiveInteger } from '../../../../lib/ticket-issuance'

const paidEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const normalizeText = (value) => String(value || '').trim()

const assertStripeOrderMatches = ({ order, metadata, session }) => {
  const orderRef = normalizeText(order?.ref)
  const metadataRef = normalizeText(metadata?.order_ref)
  if (metadataRef && orderRef && metadataRef !== orderRef) {
    const error = new Error('Stripe metadata does not match the order reference.')
    error.status = 400
    throw error
  }

  const metadataMemberId = normalizeText(metadata?.member_user_id)
  const orderMemberId = normalizeText(order?.member_user_id)
  if (metadataMemberId && orderMemberId && metadataMemberId !== orderMemberId) {
    const error = new Error('Stripe metadata does not match the order owner.')
    error.status = 400
    throw error
  }

  const expectedAmount = Math.round(Number(order?.total || 0) * 100)
  const paidAmount = Number(session?.amount_total)
  if (Number.isFinite(paidAmount) && Number.isFinite(expectedAmount) && expectedAmount >= 0 && paidAmount !== expectedAmount) {
    const error = new Error('Stripe paid amount does not match the order total.')
    error.status = 400
    throw error
  }
}

export async function POST(request) {
  const throttleError = await rateLimit(request, { scope: 'stripe.webhook', limit: 120, windowMs: 60_000 })
  if (throttleError) return throttleError

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
    assertStripeOrderMatches({ order, metadata, session })

    if (metadata.kind === 'ticket_order') {
      if (order.delivery !== 'digital-ticket') {
        return NextResponse.json({ error: 'Order is not a ticket order.' }, { status: 400 })
      }
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

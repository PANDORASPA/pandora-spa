import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'
import { createCheckoutSession } from '../../../../lib/stripe'
import { issueTicketForPaidOrder, normalizePositiveInteger } from '../../../../lib/ticket-issuance'

const normalizeText = (value) => String(value || '').trim()
const isPaidRequest = (body) =>
  normalizeText(body?.paymentState).toLowerCase() === 'paid' &&
  normalizeText(body?.paymentProvider).toLowerCase() === 'manual-admin'
const isStripeRequest = (body) => normalizeText(body?.paymentMethod || body?.paymentProvider).toLowerCase() === 'stripe'

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
    const stripeRequest = isStripeRequest(body)
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

    const orderRef = `ORD${Date.now().toString().slice(-6)}`
    const ticketLabel = `Package #${ticket.id}: ${normalizeText(ticket.name) || `#${ticket.id}`}`

    const orderPayload = {
      user_name: normalizeText(user.email) || 'Member',
      address: '',
      delivery: 'digital-ticket',
      payment: paidRequest ? 'manual-admin' : stripeRequest ? 'stripe' : 'awaiting-payment',
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

    if (stripeRequest && !paidRequest) {
      try {
        const origin = normalizeText(process.env.NEXT_PUBLIC_SITE_URL) || request.nextUrl.origin
        const session = await createCheckoutSession({
          lineItems: [
            {
              name: ticket.name || `PANDORA HEAD SPA Package #${ticket.id}`,
              description: ticket.description || `${Number(ticket.count || 0)} head spa visits`,
              amount: Number(ticket.price || 0),
              quantity: 1,
            },
          ],
          customerEmail: user.email,
          clientReferenceId: order.ref || String(order.id),
          successUrl: `${origin}/account/tickets?payment=stripe_success&order=${encodeURIComponent(order.ref || order.id)}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/tickets?payment=stripe_cancelled&order=${encodeURIComponent(order.ref || order.id)}`,
          metadata: {
            kind: 'ticket_order',
            order_id: order.id,
            order_ref: order.ref || '',
            ticket_id: ticket.id,
            member_user_id: user.id,
          },
        })

        return NextResponse.json(
          {
            ref: orderRef,
            order,
            checkoutUrl: session.url,
            stripeSessionId: session.id,
            entitlementIssued: false,
            requiresPayment: true,
            paymentProvider: 'stripe',
            message: 'Stripe Checkout session created. Ticket will be issued after payment succeeds.',
          },
          { status: 200 },
        )
      } catch (stripeError) {
        await supabase.from('orders').update({ status: 'payment_setup_failed', payment: 'stripe' }).eq('id', order.id)
        return NextResponse.json({ error: stripeError?.message || 'Stripe Checkout setup failed.', order }, { status: stripeError?.status || 500 })
      }
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
        { status: 202 },
      )
    }

    const issued = await issueTicketForPaidOrder({
      supabase,
      order,
      ticketId: normalizePositiveInteger(ticket.id),
      createdBy: user.id,
      paymentMethod: 'manual-admin',
      paymentRef: orderRef,
    })

    return NextResponse.json({ ticket: issued.ticket, order: issued.order, ref: orderRef, entitlementIssued: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

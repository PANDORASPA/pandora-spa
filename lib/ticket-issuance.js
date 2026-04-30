export const addYears = (date, years) => {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

export const normalizeText = (value) => String(value || '').trim()

export const normalizePositiveInteger = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const parseTicketIdFromOrder = (order) => {
  const explicit = normalizePositiveInteger(order?.ticket_id)
  if (explicit) return explicit
  const match = String(order?.items || '').match(/#(\d+)/)
  return normalizePositiveInteger(match?.[1])
}

const isMissingLedgerTable = (error) => /ticket_redemptions|schema cache|relation|does not exist/i.test(String(error?.message || ''))

export async function issueTicketForPaidOrder({ supabase, order, ticketId, createdBy = null, paymentMethod = 'stripe', paymentRef = '' }) {
  if (!order) {
    const error = new Error('Order not found.')
    error.status = 404
    throw error
  }
  if (order.delivery !== 'digital-ticket') {
    const error = new Error('This order is not a package order.')
    error.status = 400
    throw error
  }
  if (!order.member_user_id) {
    const error = new Error('Order is not linked to a member account.')
    error.status = 400
    throw error
  }

  const existingIssuedRes = await supabase
    .from('ticket_redemptions')
    .select('id,user_ticket_id')
    .eq('order_id', order.id)
    .eq('reason', 'purchase_issued')
    .maybeSingle()

  if (existingIssuedRes.error && !isMissingLedgerTable(existingIssuedRes.error)) {
    throw existingIssuedRes.error
  }
  if (existingIssuedRes.data) {
    return { order, ticket: null, alreadyIssued: true, redemption: existingIssuedRes.data }
  }
  const resolvedTicketId = normalizePositiveInteger(ticketId) || parseTicketIdFromOrder(order)
  if (!resolvedTicketId) {
    const error = new Error('Package template could not be identified.')
    error.status = 400
    throw error
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', resolvedTicketId)
    .maybeSingle()
  if (ticketError) throw ticketError
  if (!ticket || ticket.enabled === false) {
    const error = new Error('Package template is unavailable.')
    error.status = 404
    throw error
  }

  const expiryDate = addYears(new Date(), 1)
  const { data: issuedTicket, error: issueError } = await supabase
    .from('user_tickets')
    .insert({
      member_user_id: order.member_user_id,
      ticket_id: ticket.id,
      ticket_name: ticket.name,
      remaining_count: Number(ticket.count || ticket.times || 0),
      expiry_date: expiryDate.toISOString(),
    })
    .select('*')
    .single()
  if (issueError) throw issueError

  const updatePayload = {
    status: 'completed',
    payment: normalizeText(paymentMethod) || 'stripe',
  }
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', order.id)
    .select('*')
    .single()
  if (updateError) throw updateError

  const ledgerRes = await supabase.from('ticket_redemptions').insert({
    user_ticket_id: issuedTicket.id,
    order_id: order.id,
    member_user_id: order.member_user_id,
    delta: Number(issuedTicket.remaining_count || 0),
    reason: 'purchase_issued',
    note: `Issued from paid order ${order.ref || order.id}${paymentRef ? ` (${paymentRef})` : ''}`,
    created_by: createdBy,
  })
  if (ledgerRes.error && !isMissingLedgerTable(ledgerRes.error)) throw ledgerRes.error

  return { order: updatedOrder || { ...order, ...updatePayload }, ticket: issuedTicket, alreadyIssued: false, redemption: ledgerRes.data || null }
}

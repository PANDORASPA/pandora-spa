import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'
import {
  buildBookingPayload,
  buildResourceAllocationPayload,
  loadPhase2Context,
  Phase2Error,
  validatePhase2Selection,
} from '../../../../lib/booking/phase2'

const loadTicketSnapshot = async (supabase, ticketId) => {
  const normalizedId = Number(ticketId)
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null
  const { data, error } = await supabase.from('user_tickets').select('id,remaining_count').eq('id', normalizedId).maybeSingle()
  if (error) throw error
  return data || null
}

const updateTicketRemainingCount = async (supabase, ticketId, nextCount) => {
  const normalizedId = Number(ticketId)
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null
  const { data, error } = await supabase
    .from('user_tickets')
    .update({ remaining_count: Number(nextCount || 0) })
    .eq('id', normalizedId)
    .select('id,remaining_count')
    .single()
  if (error) throw error
  return data
}

const inspectCreateRollbackState = async ({ supabase, bookingId, ticketSnapshot }) => {
  const [bookingRes, allocationRes, ticketRes] = await Promise.all([
    supabase.from('bookings').select('id').eq('id', bookingId).maybeSingle(),
    supabase.from('booking_resource_allocations').select('id').eq('booking_id', bookingId),
    ticketSnapshot?.id ? loadTicketSnapshot(supabase, ticketSnapshot.id) : Promise.resolve(null),
  ])

  return {
    bookingExists: Boolean(bookingRes?.data),
    bookingCheckError: bookingRes?.error?.message || null,
    allocationCount: Array.isArray(allocationRes?.data) ? allocationRes.data.length : 0,
    allocationCheckError: allocationRes?.error?.message || null,
    ticketRemaining: ticketRes ? Number(ticketRes.remaining_count || 0) : null,
    ticketCheckError: ticketSnapshot?.id && !ticketRes ? 'Ticket snapshot could not be reloaded.' : null,
  }
}

const rollbackCreateBooking = async ({ supabase, bookingId, ticketSnapshot, restoreTicket = Boolean(ticketSnapshot?.id) }) => {
  const details = {
    restoreTicketAttempted: Boolean(restoreTicket && ticketSnapshot?.id),
    bookingDeleted: false,
    allocationsDeleted: false,
    ticketRestored: ticketSnapshot ? false : null,
  }

  const bookingDeleteRes = await supabase.from('bookings').delete().eq('id', bookingId)
  if (bookingDeleteRes.error) {
    return { ok: false, stage: 'delete_booking', error: bookingDeleteRes.error.message, details }
  }
  details.bookingDeleted = true

  const allocationDeleteRes = await supabase.from('booking_resource_allocations').delete().eq('booking_id', bookingId)
  if (allocationDeleteRes.error) {
    return { ok: false, stage: 'delete_allocations', error: allocationDeleteRes.error.message, details }
  }
  details.allocationsDeleted = true

  if (restoreTicket && ticketSnapshot?.id) {
    try {
      await updateTicketRemainingCount(supabase, ticketSnapshot.id, ticketSnapshot.remaining_count)
      details.ticketRestored = true
    } catch (error) {
      return { ok: false, stage: 'restore_ticket', error: error?.message || 'Failed to restore ticket.', details }
    }
  }

  const verifyState = await inspectCreateRollbackState({ supabase, bookingId, ticketSnapshot })
  const bookingRemoved = !verifyState.bookingExists
  const allocationsRemoved = verifyState.allocationCount === 0
  const ticketRestored =
    !restoreTicket || !ticketSnapshot?.id || verifyState.ticketRemaining == null
      ? true
      : Number(verifyState.ticketRemaining || 0) === Number(ticketSnapshot.remaining_count || 0)

  if (!bookingRemoved || !allocationsRemoved || !ticketRestored) {
    return {
      ok: false,
      stage: 'verify_rollback',
      error: 'Rollback verification failed.',
      details: {
        ...details,
        ...verifyState,
        bookingRemoved,
        allocationsRemoved,
        ticketRestored,
      },
    }
  }

  return {
    ok: true,
    details: {
      ...details,
      ...verifyState,
      bookingRemoved,
      allocationsRemoved,
      ticketRestored,
    },
  }
}

export async function POST(request) {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in before booking.' }, { status: 401 })
    }

    const body = await request.json()
    const dateISO = body?.date
    const serviceId = Number(body?.serviceId)
    const staffIdInput = body?.staffId == null || body?.staffId === '' ? null : Number(body.staffId)
    const startTime = String(body?.startTime || '')
    let customerName = String(body?.customerName || '').trim()
    let customerPhone = String(body?.customerPhone || '').trim()
    const couponCode = body?.couponCode ? String(body.couponCode) : ''
    const userTicketId = body?.userTicketId ? Number(body.userTicketId) : null

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: 'Invalid appointment date.' }, { status: 400 })
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json({ error: 'Please choose a service.' }, { status: 400 })
    }
    if (!startTime) {
      return NextResponse.json({ error: 'Please choose a time slot.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    if (!customerName || !customerPhone) {
      const { data: profile } = await supabase
        .from('member_profiles')
        .select('full_name,phone')
        .eq('id', user.id)
        .maybeSingle()

      customerName = customerName || String(profile?.full_name || user.user_metadata?.full_name || '').trim()
      customerPhone = customerPhone || String(profile?.phone || user.user_metadata?.phone || '').trim()
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: 'Please complete your name and phone number before booking.' }, { status: 400 })
    }

    const context = await loadPhase2Context({
      supabase,
      dateISO,
      serviceId,
      requestedLocationId: null,
      requestedStaffId: staffIdInput,
      ignoreLocationProviderRules: true,
    })
    const { chosenStaff } = validatePhase2Selection(context, { startTime, requestedStaffId: staffIdInput })

    let finalPrice = Number(context.service.price) || 0

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('enabled', true)
        .maybeSingle()
      if (couponError) return NextResponse.json({ error: couponError.message }, { status: 500 })
      if (!coupon) return NextResponse.json({ error: 'Invalid coupon code.' }, { status: 400 })

      const now = new Date()
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        return NextResponse.json({ error: 'Coupon is not active yet.' }, { status: 400 })
      }
      if (coupon.end_date && new Date(coupon.end_date) < now) {
        return NextResponse.json({ error: 'Coupon has expired.' }, { status: 400 })
      }

      if (Number(coupon.usage_limit) > 0) {
        const { count, error: usageError } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('coupon', couponCode)
        if (usageError) return NextResponse.json({ error: usageError.message }, { status: 500 })
        if ((count || 0) >= Number(coupon.usage_limit)) {
          return NextResponse.json({ error: 'Coupon usage limit reached.' }, { status: 400 })
        }
      }

      finalPrice =
        coupon.type === 'percent'
          ? Math.max(0, finalPrice * (1 - Number(coupon.discount || 0) / 100))
          : Math.max(0, finalPrice - Number(coupon.discount || 0))
    }

    let userTicket = null
    let originalTicketSnapshot = null
    if (userTicketId) {
      const ticketRes = await supabase
        .from('user_tickets')
        .select('id,remaining_count,member_user_id,customer_id,ticket_name,ticket_id,tickets(*)')
        .eq('id', userTicketId)
        .maybeSingle()
      if (ticketRes.error) return NextResponse.json({ error: ticketRes.error.message }, { status: 500 })
      userTicket = ticketRes.data
      if (!userTicket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })

      const ownerMatches = String(userTicket.member_user_id || '') === String(user.id) || String(userTicket.customer_id || '') === String(user.id)
      if (!ownerMatches) return NextResponse.json({ error: 'You do not own this ticket.' }, { status: 403 })
      if (Number(userTicket.remaining_count || 0) <= 0) {
        return NextResponse.json({ error: 'Ticket has no remaining uses.' }, { status: 400 })
      }

      const ticketServiceId = Number(userTicket?.tickets?.service_id)
      if (Number.isFinite(ticketServiceId) && ticketServiceId !== Number(context.service.id)) {
        return NextResponse.json({ error: 'Ticket does not match this service.' }, { status: 400 })
      }
      originalTicketSnapshot = await loadTicketSnapshot(supabase, userTicket.id)
      finalPrice = 0
    }

    const payload = buildBookingPayload({
      user,
      service: context.service,
      dateISO,
      startTime,
      chosenStaff,
      durationMin: context.durationMin,
      bufferMin: context.bufferMin,
      locationId: context.resolvedLocationId,
      providerGroupId: context.requiredProviderGroupIds[0] || null,
      customerName,
      customerPhone,
      coupon: couponCode || null,
      userTicketId: userTicket?.id || null,
      finalPrice,
      servicePrice: context.service.price,
      status: 'pending',
    })

    const { data: inserted, error: insertError } = await supabase.from('bookings').insert(payload).select('*').single()
    if (insertError) {
      const message = insertError.message || ''
      if (message.includes('unique_booking') || message.includes('conflict') || message.includes('overlap')) {
        return NextResponse.json({ error: 'This time slot is already booked. Please choose another time.', code: 'staff_collision' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create booking: ' + message }, { status: 500 })
    }

    if (userTicket) {
      try {
        await updateTicketRemainingCount(supabase, userTicket.id, Number(userTicket.remaining_count || 0) - 1)
      } catch (ticketUpdateError) {
        const rollbackResult = await rollbackCreateBooking({
          supabase,
          bookingId: inserted.id,
          ticketSnapshot: originalTicketSnapshot,
          restoreTicket: false,
        })
        if (!rollbackResult.ok) {
          const stateSnapshot = await inspectCreateRollbackState({
            supabase,
            bookingId: inserted.id,
            ticketSnapshot: originalTicketSnapshot,
          })
          return NextResponse.json(
            {
              error: 'Ticket deduction failed and rollback could not be fully verified.',
              code: 'create_rollback_failed',
              details: {
                originalError: ticketUpdateError?.message || 'Ticket deduction failed.',
                rollbackStage: rollbackResult.stage,
                rollbackError: rollbackResult.error,
                rollbackDetails: rollbackResult.details,
                stateSnapshot,
              },
            },
            { status: 500 },
          )
        }
        return NextResponse.json(
          {
            error: 'Ticket deduction failed: ' + (ticketUpdateError?.message || 'Unknown error'),
            code: 'ticket_deduction_failed',
            details: { rollbackVerified: true },
          },
          { status: 500 },
        )
      }
    }

    const allocationPayload = buildResourceAllocationPayload({
      bookingId: inserted.id,
      serviceResources: context.serviceResources,
    })

    if (allocationPayload.length > 0) {
      const { error: allocationError } = await supabase.from('booking_resource_allocations').insert(allocationPayload)
      if (allocationError) {
        const rollbackResult = await rollbackCreateBooking({
          supabase,
          bookingId: inserted.id,
          ticketSnapshot: originalTicketSnapshot,
        })
        if (!rollbackResult.ok) {
          const stateSnapshot = await inspectCreateRollbackState({
            supabase,
            bookingId: inserted.id,
            ticketSnapshot: originalTicketSnapshot,
          })
          return NextResponse.json(
            {
              error: 'Resource allocation failed and rollback could not be fully verified.',
              code: 'create_rollback_failed',
              details: {
                originalError: allocationError.message,
                rollbackStage: rollbackResult.stage,
                rollbackError: rollbackResult.error,
                rollbackDetails: rollbackResult.details,
                stateSnapshot,
              },
            },
            { status: 500 },
          )
        }
        return NextResponse.json({ error: 'Resource allocation failed: ' + allocationError.message, code: 'resource_full', details: { rollbackVerified: true } }, { status: 500 })
      }

      const verifyAllocationsRes = await supabase.from('booking_resource_allocations').select('id').eq('booking_id', inserted.id)
      if (verifyAllocationsRes.error || (verifyAllocationsRes.data || []).length < allocationPayload.length) {
        const rollbackResult = await rollbackCreateBooking({
          supabase,
          bookingId: inserted.id,
          ticketSnapshot: originalTicketSnapshot,
        })
        if (!rollbackResult.ok) {
          const stateSnapshot = await inspectCreateRollbackState({
            supabase,
            bookingId: inserted.id,
            ticketSnapshot: originalTicketSnapshot,
          })
          return NextResponse.json(
            {
              error: 'Resource allocation verification failed and rollback could not be fully verified.',
              code: 'create_rollback_failed',
              details: {
                originalError: verifyAllocationsRes.error?.message || 'Resource allocation verification failed.',
                rollbackStage: rollbackResult.stage,
                rollbackError: rollbackResult.error,
                rollbackDetails: rollbackResult.details,
                expectedAllocationCount: allocationPayload.length,
                actualAllocationCount: (verifyAllocationsRes.data || []).length,
                stateSnapshot,
              },
            },
            { status: 500 },
          )
        }
        return NextResponse.json(
          {
            error: 'Resource allocation verification failed.',
            code: 'resource_full',
            details: {
              rollbackVerified: true,
              expectedAllocationCount: allocationPayload.length,
              actualAllocationCount: (verifyAllocationsRes.data || []).length,
            },
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ booking: inserted }, { status: 200 })
  } catch (error) {
    if (error instanceof Phase2Error) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Unknown error.' }, { status: 500 })
  }
}

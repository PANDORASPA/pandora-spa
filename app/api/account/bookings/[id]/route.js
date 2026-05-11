import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../../lib/supabase/server'
import { getServiceClient } from '../../../../../lib/supabase/service'
import {
  buildBookingPayload,
  buildResourceAllocationPayload,
  loadPhase2Context,
  normalizeOptionalNumber,
  Phase2Error,
  validatePhase2Selection,
} from '../../../../../lib/booking/phase2'

const getBookingScope = async (supabase, bookingId, userId) => {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).eq('user_id', userId).maybeSingle()
  return { booking: data, error }
}

const getBookingStatus = (booking) => {
  const status = String(booking?.status || '').trim().toLowerCase()
  return status || 'pending'
}

const parseOptionalTicketId = (value) => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const restoreTicketIfNeeded = async (supabase, booking) => {
  const ticketId = Number(booking?.user_ticket_id)
  if (!Number.isFinite(ticketId) || ticketId <= 0) return
  if (getBookingStatus(booking) === 'cancelled') return

  const ticketRes = await supabase.from('user_tickets').select('id,remaining_count').eq('id', ticketId).maybeSingle()
  if (ticketRes.error) throw ticketRes.error
  if (!ticketRes.data) return

  const updateRes = await supabase
    .from('user_tickets')
    .update({ remaining_count: Number(ticketRes.data.remaining_count || 0) + 1 })
    .eq('id', ticketId)
  if (updateRes.error) throw updateRes.error

  const ledgerRes = await supabase.from('ticket_redemptions').insert({
    user_ticket_id: ticketId,
    booking_id: booking.id,
    member_user_id: booking.user_id || null,
    delta: 1,
    reason: 'booking_cancelled_restore',
    note: `Restored from cancelled booking ${booking.ref || booking.id}`,
    created_by: booking.user_id || null,
  })
  const message = String(ledgerRes.error?.message || '')
  if (ledgerRes.error && !/ticket_redemptions|schema cache|relation|does not exist/i.test(message)) throw ledgerRes.error
}

const revertCancelledStatusIfNeeded = async (supabase, bookingId, userId, previousStatus) => {
  const nextStatus = String(previousStatus || '').trim() || 'pending'
  const { error } = await supabase.from('bookings').update({ status: nextStatus }).eq('id', bookingId).eq('user_id', userId)
  if (error) throw error
}

const normalizeAllocationRows = (rows) =>
  (rows || []).map((row) => ({
    booking_id: row.booking_id,
    resource_id: row.resource_id,
    quantity: row.quantity,
  }))

const sameAllocationSet = (leftRows, rightRows) => {
  const normalize = (rows) =>
    normalizeAllocationRows(rows)
      .map((row) => `${row.booking_id}:${row.resource_id}:${row.quantity}`)
      .sort()
  const left = normalize(leftRows)
  const right = normalize(rightRows)
  return left.length === right.length && left.every((value, index) => value === right[index])
}

const inspectRestoreState = async (supabase, bookingId) => {
  const [bookingRes, allocationRes] = await Promise.all([
    supabase.from('bookings').select('id,status,appointment_date,start_time,end_time,buffer_end_time').eq('id', bookingId).maybeSingle(),
    supabase.from('booking_resource_allocations').select('id,booking_id,resource_id,quantity').eq('booking_id', bookingId),
  ])

  return {
    bookingExists: Boolean(bookingRes?.data),
    bookingStatus: bookingRes?.data?.status || null,
    bookingCheckError: bookingRes?.error?.message || null,
    allocationCount: Array.isArray(allocationRes?.data) ? allocationRes.data.length : 0,
    allocationCheckError: allocationRes?.error?.message || null,
  }
}

const restoreBookingState = async ({ supabase, bookingId, userId, previousPayload, previousAllocations }) => {
  const bookingRestoreRes = await supabase
    .from('bookings')
    .update(previousPayload)
    .eq('id', bookingId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (bookingRestoreRes.error) {
    return {
      ok: false,
      stage: 'restore_booking',
      error: bookingRestoreRes.error.message,
      details: await inspectRestoreState(supabase, bookingId),
    }
  }

  const cleanupAllocationsRes = await supabase.from('booking_resource_allocations').delete().eq('booking_id', bookingId)
  if (cleanupAllocationsRes.error) {
    return {
      ok: false,
      stage: 'cleanup_allocations',
      error: cleanupAllocationsRes.error.message,
      details: await inspectRestoreState(supabase, bookingId),
    }
  }

  if ((previousAllocations || []).length > 0) {
    const restoreAllocationsRes = await supabase
      .from('booking_resource_allocations')
      .insert(normalizeAllocationRows(previousAllocations))
    if (restoreAllocationsRes.error) {
      return {
        ok: false,
        stage: 'restore_allocations',
        error: restoreAllocationsRes.error.message,
        details: {
          ...(await inspectRestoreState(supabase, bookingId)),
          expectedAllocationCount: (previousAllocations || []).length,
        },
      }
    }
  }

  const verifyBookingRes = await supabase
    .from('bookings')
    .select(
      'service,service_price,final_price,date,time,staff_id,staff_name,name,phone,coupon,user_ticket_id,status,user_id,customer_name,customer_phone,customer_email,service_id,location_id,provider_group_id,appointment_date,start_time,end_time,buffer_end_time,start_at,end_at,buffer_end_at,duration_min,buffer_min',
    )
    .eq('id', bookingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (verifyBookingRes.error) {
    return {
      ok: false,
      stage: 'verify_booking',
      error: verifyBookingRes.error.message,
      details: await inspectRestoreState(supabase, bookingId),
    }
  }

  const verifyAllocationsRes = await supabase.from('booking_resource_allocations').select('*').eq('booking_id', bookingId)
  if (verifyAllocationsRes.error) {
    return {
      ok: false,
      stage: 'verify_allocations',
      error: verifyAllocationsRes.error.message,
      details: await inspectRestoreState(supabase, bookingId),
    }
  }

  const restoredBooking = verifyBookingRes.data || {}
  const bookingMatches = Object.entries(previousPayload).every(([key, value]) => restoredBooking[key] === value)
  const allocationsMatch = sameAllocationSet(previousAllocations, verifyAllocationsRes.data || [])

  if (!bookingMatches || !allocationsMatch) {
    return {
      ok: false,
      stage: 'verify_restore',
      error: 'Rollback verification failed.',
      details: {
        ...(await inspectRestoreState(supabase, bookingId)),
        bookingMatches,
        allocationsMatch,
        allocationCount: (verifyAllocationsRes.data || []).length,
        expectedAllocationCount: (previousAllocations || []).length,
      },
    }
  }

  return { ok: true, booking: bookingRestoreRes.data, allocations: verifyAllocationsRes.data || [] }
}

export async function PATCH(request, { params }) {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
    }

    const bookingId = params?.id
    const supabase = getServiceClient()
    const { booking: existingBooking, error: bookingError } = await getBookingScope(supabase, bookingId, user.id)

    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })
    if (!existingBooking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

    const body = await request.json()
    const action = body?.action || 'reschedule'
    const requestHost = (() => {
      try {
        return new URL(request.url).hostname
      } catch {
        return ''
      }
    })()
    const shouldAllowSmokeFault =
      process.env.ALLOW_SMOKE_FAULTS === '1' ||
      /@example\.com$/i.test(String(user?.email || '')) ||
      ((requestHost === 'localhost' || requestHost === '127.0.0.1') && /@example\.test$/i.test(String(user?.email || '')))
    const shouldForceAllocationFailure =
      shouldAllowSmokeFault && request.headers.get('x-smoke-force-allocation-fail') === '1'

    if (action === 'cancel') {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      try {
        await restoreTicketIfNeeded(supabase, existingBooking)
      } catch (ticketRestoreError) {
        try {
          await revertCancelledStatusIfNeeded(supabase, bookingId, user.id, existingBooking.status)
        } catch (revertError) {
          return NextResponse.json(
            {
              error: 'Ticket restore failed after cancellation, and booking status could not be restored.',
              code: 'cancel_rollback_failed',
              details: {
                originalError: ticketRestoreError?.message || 'Ticket restore failed.',
                revertError: revertError?.message || 'Status revert failed.',
              },
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: 'Ticket restore failed after cancellation.',
            code: 'ticket_restore_failed',
            details: { rollbackVerified: true, originalError: ticketRestoreError?.message || 'Ticket restore failed.' },
          },
          { status: 500 },
        )
      }
      return NextResponse.json({ booking: data }, { status: 200 })
    }

    const dateISO = body?.date
    const requestedServiceId = Number(body?.serviceId || existingBooking.service_id)
    const existingServiceId = Number(existingBooking.service_id)
    const startTime = String(body?.startTime || '')
    const customerName = String(body?.customerName || existingBooking.customer_name || existingBooking.name || '')
    const customerPhone = String(body?.customerPhone || existingBooking.customer_phone || existingBooking.phone || '')
    const staffIdInput = body?.staffId == null || body?.staffId === '' || body?.staffId === 'random' ? null : Number(body.staffId)
    const requestedCoupon = String(body?.couponCode || '').trim() || null
    const existingCoupon = String(existingBooking.coupon || '').trim() || null
    const requestedTicketId = parseOptionalTicketId(body?.userTicketId)
    const existingTicketId = parseOptionalTicketId(existingBooking.user_ticket_id)
    const requestedLocationId = normalizeOptionalNumber(body?.locationId || existingBooking.location_id)

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: 'Invalid appointment date.' }, { status: 400 })
    }
    if (!Number.isFinite(requestedServiceId)) {
      return NextResponse.json({ error: 'Invalid service.' }, { status: 400 })
    }
    if (!startTime) {
      return NextResponse.json({ error: 'Please choose a time slot.' }, { status: 400 })
    }
    if (Number.isFinite(existingServiceId) && requestedServiceId !== existingServiceId) {
      return NextResponse.json({ error: 'Service changes are not supported when rescheduling.' }, { status: 400 })
    }
    if (requestedCoupon !== existingCoupon) {
      return NextResponse.json({ error: 'Coupon changes are not supported when rescheduling.' }, { status: 400 })
    }
    if (requestedTicketId !== existingTicketId) {
      return NextResponse.json({ error: 'Ticket changes are not supported when rescheduling.' }, { status: 400 })
    }

    const serviceId = Number.isFinite(existingServiceId) ? existingServiceId : requestedServiceId
    const previousAllocationsRes = await supabase.from('booking_resource_allocations').select('*').eq('booking_id', bookingId)
    if (previousAllocationsRes.error) {
      return NextResponse.json({ error: previousAllocationsRes.error.message }, { status: 500 })
    }

    const context = await loadPhase2Context({
      supabase,
      dateISO,
      serviceId,
      requestedLocationId,
      requestedStaffId: staffIdInput,
      excludeBookingId: bookingId,
    })
    const { chosenStaff } = validatePhase2Selection(context, { startTime, requestedStaffId: staffIdInput })

    const payload = buildBookingPayload({
      existingBooking,
      user,
      service: context.service,
      dateISO,
      startTime,
      chosenStaff,
      durationMin: context.durationMin,
      bufferMin: context.bufferMin,
      locationId: context.resolvedLocationId,
      providerGroupId: context.requiredProviderGroupIds[0] || existingBooking.provider_group_id || null,
      customerName,
      customerPhone,
      coupon: existingBooking.coupon || null,
      userTicketId: existingBooking.user_ticket_id ?? null,
      finalPrice: existingBooking.final_price ?? context.service.price,
      servicePrice: existingBooking.service_price ?? context.service.price,
      status: getBookingStatus(existingBooking),
    })

    const previousPayload = {
      service: existingBooking.service,
      service_price: existingBooking.service_price,
      final_price: existingBooking.final_price,
      date: existingBooking.date,
      time: existingBooking.time,
      staff_id: existingBooking.staff_id,
      staff_name: existingBooking.staff_name,
      name: existingBooking.name,
      phone: existingBooking.phone,
      coupon: existingBooking.coupon,
      user_ticket_id: existingBooking.user_ticket_id,
      status: existingBooking.status,
      user_id: existingBooking.user_id,
      customer_name: existingBooking.customer_name,
      customer_phone: existingBooking.customer_phone,
      customer_email: existingBooking.customer_email,
      service_id: existingBooking.service_id,
      location_id: existingBooking.location_id,
      provider_group_id: existingBooking.provider_group_id,
      appointment_date: existingBooking.appointment_date,
      start_time: existingBooking.start_time,
      end_time: existingBooking.end_time,
      buffer_end_time: existingBooking.buffer_end_time,
      start_at: existingBooking.start_at,
      end_at: existingBooking.end_at,
      buffer_end_at: existingBooking.buffer_end_at,
      duration_min: existingBooking.duration_min,
      buffer_min: existingBooking.buffer_min,
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const nextAllocations = buildResourceAllocationPayload({
      bookingId: bookingId,
      serviceResources: context.serviceResources,
    })

    const rollbackWithError = async ({ error, code = 'resource_full', stage, details = null }) => {
      const restoreResult = await restoreBookingState({
        supabase,
        bookingId,
        userId: user.id,
        previousPayload,
        previousAllocations: previousAllocationsRes.data || [],
      })

      if (!restoreResult.ok) {
        return NextResponse.json(
          {
            error: 'Rollback failed after reschedule error.',
            code: 'rollback_failed',
            details: {
              originalError: error,
              originalCode: code,
              originalStage: stage,
              restoreStage: restoreResult.stage,
              restoreError: restoreResult.error,
              restoreDetails: restoreResult.details || null,
            },
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error,
          code,
          details: {
            stage,
            rollbackVerified: true,
            ...(details ? { evidence: details } : {}),
          },
        },
        { status: 500 },
      )
    }

    const deleteAllocationsRes = await supabase.from('booking_resource_allocations').delete().eq('booking_id', bookingId)
    if (deleteAllocationsRes.error) {
      return rollbackWithError({
        error: deleteAllocationsRes.error.message,
        code: 'resource_full',
        stage: 'delete_allocations',
      })
    }

    if (nextAllocations.length > 0) {
      if (shouldForceAllocationFailure) {
        return rollbackWithError({
          error: 'Smoke-forced resource allocation failure.',
          code: 'resource_full',
          stage: 'forced_allocation_failure',
          details: { smokeForced: true },
        })
      }

      const insertAllocationsRes = await supabase.from('booking_resource_allocations').insert(nextAllocations)
      if (insertAllocationsRes.error) {
        return rollbackWithError({
          error: 'Resource allocation failed: ' + insertAllocationsRes.error.message,
          code: 'resource_full',
          stage: 'insert_allocations',
        })
      }

      const verifyAllocationsRes = await supabase.from('booking_resource_allocations').select('id').eq('booking_id', bookingId)
      if (verifyAllocationsRes.error || (verifyAllocationsRes.data || []).length < nextAllocations.length) {
        return rollbackWithError({
          error: 'Resource allocation verification failed.',
          code: 'resource_full',
          stage: 'verify_allocations',
          details: {
            expectedAllocationCount: nextAllocations.length,
            actualAllocationCount: (verifyAllocationsRes.data || []).length,
            verifyError: verifyAllocationsRes.error?.message || null,
          },
        })
      }
    }

    return NextResponse.json({ booking: data }, { status: 200 })
  } catch (error) {
    if (error instanceof Phase2Error) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET(_request, { params }) {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const { booking, error } = await getBookingScope(supabase, params?.id, user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

    return NextResponse.json({ booking }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'
import {
  buildBookingPayload,
  buildResourceAllocationPayload,
  loadPhase2Context,
  normalizeOptionalNumber,
  Phase2Error,
  validatePhase2Selection,
} from '../../../../lib/booking/phase2'

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
    const locationIdInput = normalizeOptionalNumber(body?.locationId)
    const startTime = String(body?.startTime || '')
    const customerName = String(body?.customerName || '')
    const customerPhone = String(body?.customerPhone || '')
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
    const context = await loadPhase2Context({
      supabase,
      dateISO,
      serviceId,
      requestedLocationId: locationIdInput,
      requestedStaffId: staffIdInput,
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
      const { error: ticketUpdateError } = await supabase
        .from('user_tickets')
        .update({ remaining_count: Number(userTicket.remaining_count || 0) - 1 })
        .eq('id', userTicket.id)
      if (ticketUpdateError) {
        await supabase.from('bookings').delete().eq('id', inserted.id)
        return NextResponse.json({ error: 'Ticket deduction failed: ' + ticketUpdateError.message }, { status: 500 })
      }
    }

    const allocationPayload = buildResourceAllocationPayload({
      bookingId: inserted.id,
      serviceResources: context.serviceResources,
    })

    if (allocationPayload.length > 0) {
      const { error: allocationError } = await supabase.from('booking_resource_allocations').insert(allocationPayload)
      if (allocationError) {
        await supabase.from('bookings').delete().eq('id', inserted.id)
        if (userTicket) {
          await supabase
            .from('user_tickets')
            .update({ remaining_count: Number(userTicket.remaining_count || 0) })
            .eq('id', userTicket.id)
        }
        return NextResponse.json({ error: 'Resource allocation failed: ' + allocationError.message, code: 'resource_full' }, { status: 500 })
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

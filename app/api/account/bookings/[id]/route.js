import { NextResponse } from 'next/server'
import { addMinutesToTime, parseList } from '../../../../../lib/time'
import { addMinutesToHKTimestamp, getAvailableSlots, timeToHKTimestamp } from '../../../../../lib/booking/availability'
import { getServerClient } from '../../../../../lib/supabase/server'
import { getServiceClient } from '../../../../../lib/supabase/service'

const settingsToMap = (rows) => {
  const map = {}
  for (const row of rows || []) map[row.key] = row.value
  return map
}

const getNumberSetting = (settings, key, fallback) => {
  const raw = settings?.[key]
  const value = typeof raw === 'number' ? raw : Number(String(raw || ''))
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

const staffCanDoService = (staff, serviceId) => {
  const list = parseList(staff?.services)
  if (list.length === 0) return true
  const target = String(serviceId)
  return list.includes(target)
}

const safeSelect = async (promise) => {
  const result = await promise
  if (result?.error && String(result.error.message || '').includes('does not exist')) {
    return { data: [] }
  }
  return result
}

const getBookingScope = async (supabase, bookingId, userId) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('user_id', userId)
    .maybeSingle()

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

  const ticketRes = await supabase
    .from('user_tickets')
    .select('id,remaining_count')
    .eq('id', ticketId)
    .maybeSingle()

  if (ticketRes.error) throw ticketRes.error
  if (!ticketRes.data) return

  const updateRes = await supabase
    .from('user_tickets')
    .update({ remaining_count: Number(ticketRes.data.remaining_count || 0) + 1 })
    .eq('id', ticketId)

  if (updateRes.error) throw updateRes.error
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

    if (action === 'cancel') {
      await restoreTicketIfNeeded(supabase, existingBooking)

      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

    const serviceRes = await supabase.from('services').select('id,name,price,time,buffer_min,enabled').eq('id', serviceId).single()
    const settingsRes = await supabase.from('settings').select('key,value')
    if (serviceRes.error || !serviceRes.data) {
      return NextResponse.json({ error: 'Service not found.' }, { status: 404 })
    }
    if (serviceRes.data.enabled === false) {
      return NextResponse.json({ error: 'Service is disabled.' }, { status: 400 })
    }
    if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })

    const shopSettings = settingsToMap(settingsRes.data)
    const stepMin = getNumberSetting(shopSettings, 'slot_step_min', 15)
    const defaultBufferMin = getNumberSetting(shopSettings, 'default_buffer_min', 15)
    const bufferMin = Number.isFinite(Number(serviceRes.data.buffer_min)) ? Number(serviceRes.data.buffer_min) : defaultBufferMin
    const durationMin = Number(serviceRes.data.time) || 60

    const staffQuery = supabase.from('staff').select('*').eq('enabled', true).order('name')
    const { data: staffList, error: staffError } = staffIdInput ? await staffQuery.eq('id', staffIdInput) : await staffQuery
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 })

    const candidateStaff = (staffList || []).filter((staff) => staffCanDoService(staff, serviceId))
    const staffIds = candidateStaff.map((staff) => staff.id).filter(Boolean)
    if (staffIds.length === 0) {
      return NextResponse.json({ error: 'No available staff for this service.' }, { status: 400 })
    }

    const { data: shifts, error: shiftsError } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('date', dateISO)
      .in('staff_id', staffIds)
    if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 })

    const breaksRes = await safeSelect(supabase.from('staff_breaks').select('*').in('staff_id', staffIds))
    const timeOffRes = await safeSelect(supabase.from('staff_time_off').select('*').eq('date', dateISO).in('staff_id', staffIds))
    const blockedRes = await safeSelect(supabase.from('blocked_slots').select('*').eq('date', dateISO).in('staff_id', staffIds))

    const bookingsRes = await supabase
      .from('bookings')
      .select('id,staff_id,status,start_time,end_time,buffer_end_time,duration_min,buffer_min,time')
      .eq('appointment_date', dateISO)
      .in('staff_id', staffIds)
    if (bookingsRes.error) return NextResponse.json({ error: bookingsRes.error.message }, { status: 500 })

    const byStaffShift = new Map()
    for (const row of shifts || []) byStaffShift.set(row.staff_id, row)

    const breaksByStaff = new Map()
    for (const row of breaksRes.data || []) {
      if (!breaksByStaff.has(row.staff_id)) breaksByStaff.set(row.staff_id, [])
      breaksByStaff.get(row.staff_id).push(row)
    }

    const timeOffByStaff = new Map()
    for (const row of timeOffRes.data || []) {
      if (!timeOffByStaff.has(row.staff_id)) timeOffByStaff.set(row.staff_id, [])
      timeOffByStaff.get(row.staff_id).push(row.is_all_day ? { start_time: '00:00', end_time: '23:59' } : row)
    }

    const blockedByStaff = new Map()
    for (const row of blockedRes.data || []) {
      if (!blockedByStaff.has(row.staff_id)) blockedByStaff.set(row.staff_id, [])
      blockedByStaff.get(row.staff_id).push(row)
    }

    const byStaffBookings = new Map()
    for (const row of bookingsRes.data || []) {
      if (String(row.id) === String(bookingId)) continue
      if (!byStaffBookings.has(row.staff_id)) byStaffBookings.set(row.staff_id, [])
      byStaffBookings.get(row.staff_id).push(row)
    }

    let chosenStaff = null
    for (const staff of candidateStaff) {
      const slots = getAvailableSlots({
        staff,
        shift: byStaffShift.get(staff.id) || null,
        dateISO,
        shopSettings,
        serviceDurationMin: durationMin,
        bufferMin,
        stepMin,
        bookings: byStaffBookings.get(staff.id) || [],
        breaks: breaksByStaff.get(staff.id) || [],
        timeOffs: timeOffByStaff.get(staff.id) || [],
        blockedSlots: blockedByStaff.get(staff.id) || [],
      })
      if (slots.includes(startTime)) {
        chosenStaff = staff
        break
      }
    }

    if (!chosenStaff) {
      return NextResponse.json({ error: 'This time slot is no longer available.' }, { status: 409 })
    }

    const endTime = addMinutesToTime(startTime, durationMin)
    const bufferEndTime = addMinutesToTime(endTime, bufferMin)
    const startAt = timeToHKTimestamp(dateISO, startTime)
    const endAt = addMinutesToHKTimestamp(dateISO, startTime, durationMin)
    const bufferEndAt = addMinutesToHKTimestamp(dateISO, startTime, durationMin + bufferMin)
    const legacyDateParts = dateISO.split('-')
    const legacyDate = `${Number(legacyDateParts[2])}/${Number(legacyDateParts[1])}/${legacyDateParts[0]}`

    const payload = {
      service: serviceRes.data.name,
      service_price: existingBooking.service_price ?? serviceRes.data.price,
      final_price: existingBooking.final_price ?? serviceRes.data.price,
      date: legacyDate,
      time: startTime,
      staff_id: chosenStaff.id,
      staff_name: chosenStaff.name,
      name: customerName,
      phone: customerPhone,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: user.email,
      service_id: serviceRes.data.id,
      appointment_date: dateISO,
      start_time: startTime,
      end_time: endTime,
      buffer_end_time: bufferEndTime,
      start_at: startAt,
      end_at: endAt,
      buffer_end_at: bufferEndAt,
      duration_min: durationMin,
      buffer_min: bufferMin,
      coupon: existingBooking.coupon || null,
      user_ticket_id: existingBooking.user_ticket_id ?? null,
      status: getBookingStatus(existingBooking),
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ booking: data }, { status: 200 })
  } catch (error) {
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

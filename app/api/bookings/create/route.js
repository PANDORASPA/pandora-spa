import { NextResponse } from 'next/server'
import { getAvailableSlots, addMinutesToHKTimestamp, timeToHKTimestamp, holidayCoversDate } from '../../../../lib/booking/availability'
import { addMinutesToTime, intervalsOverlap, parseList, parseTimeToMinutes } from '../../../../lib/time'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const toLegacyDate = (dateISO) => {
  const [y, m, d] = String(dateISO || '').split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

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
  return list.includes(target) || list.includes(Number(serviceId).toString())
}

const safeSelect = async (promise) => {
  const result = await promise
  if (result?.error && String(result.error.message || '').includes('does not exist')) {
    return { data: [] }
  }
  return result
}

const normalizeOptionalNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const buildStaffProviderGroupMap = (rows = []) => {
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.staff_id)) map.set(row.staff_id, new Set())
    map.get(row.staff_id).add(Number(row.provider_group_id))
  }
  return map
}

const staffMatchesProviderGroups = (staff, requiredGroupIds = [], staffProviderGroupMap = new Map()) => {
  if (!requiredGroupIds.length) return true
  const directGroupId = normalizeOptionalNumber(staff?.provider_group_id)
  const groupSet = new Set([...(staffProviderGroupMap.get(staff.id) || []), ...(directGroupId ? [directGroupId] : [])])
  return requiredGroupIds.some((groupId) => groupSet.has(Number(groupId)))
}

const staffMatchesLocation = (staff, locationId) => {
  if (!locationId) return true
  const staffLocationId = normalizeOptionalNumber(staff?.location_id)
  return !staffLocationId || staffLocationId === locationId
}

const holidayMatchesScope = (holiday, { dateISO, locationId, staffId, providerGroupIds = [] }) => {
  if (!holidayCoversDate(holiday, dateISO)) return false

  const holidayLocationId = normalizeOptionalNumber(holiday?.location_id)
  const holidayStaffId = normalizeOptionalNumber(holiday?.staff_id)
  const holidayProviderGroupId = normalizeOptionalNumber(holiday?.provider_group_id)

  if (!holidayLocationId && !holidayStaffId && !holidayProviderGroupId) return true
  if (holidayStaffId && holidayStaffId === Number(staffId)) return true
  if (holidayLocationId && locationId && holidayLocationId === Number(locationId)) return true
  if (holidayProviderGroupId && providerGroupIds.includes(Number(holidayProviderGroupId))) return true
  return false
}

const resourcesAvailableForSlot = ({
  startTime,
  bookings = [],
  allocations = [],
  resources = [],
  serviceResources = [],
  durationMin,
  bufferMin,
}) => {
  if (!serviceResources.length) return true

  const slotStart = parseTimeToMinutes(startTime)
  const slotEnd = slotStart + durationMin + bufferMin
  const allocationsByBooking = new Map()
  for (const allocation of allocations || []) {
    if (!allocationsByBooking.has(allocation.booking_id)) allocationsByBooking.set(allocation.booking_id, [])
    allocationsByBooking.get(allocation.booking_id).push(allocation)
  }

  return serviceResources.every((requirement) => {
    const resource = (resources || []).find((item) => Number(item.id) === Number(requirement.resource_id) && item.enabled !== false)
    if (!resource) return false

    const capacity = Number(resource.capacity || 1)
    const needed = Number(requirement.quantity || 1)
    const used = (bookings || []).reduce((sum, booking) => {
      if (booking.status !== 'pending' && booking.status !== 'confirmed') return sum

      const bookingStart = parseTimeToMinutes(booking.start_time || booking.time)
      const bookingEnd = parseTimeToMinutes(booking.buffer_end_time || booking.end_time || booking.time)
      if (bookingStart == null || bookingEnd == null) return sum
      if (!intervalsOverlap(slotStart, slotEnd, bookingStart, bookingEnd)) return sum

      return sum + (allocationsByBooking.get(booking.id) || [])
        .filter((allocation) => Number(allocation.resource_id) === Number(requirement.resource_id))
        .reduce((inner, allocation) => inner + Number(allocation.quantity || 1), 0)
    }, 0)

    return capacity - used >= needed
  })
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
    const serviceRes = await supabase.from('services').select('id,name,price,time,buffer_min,enabled,default_location_id,default_provider_group_id').eq('id', serviceId).single()
    const settingsRes = await supabase.from('settings').select('key,value')

    if (serviceRes.error && String(serviceRes.error.message || '').includes('buffer_min')) {
      const fallbackRes = await supabase.from('services').select('id,name,price,time,enabled,default_location_id,default_provider_group_id').eq('id', serviceId).single()
      if (fallbackRes.error) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })
      serviceRes.data = fallbackRes.data
      serviceRes.error = null
    }

    const service = serviceRes.data
    if (serviceRes.error || !service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })
    if (service.enabled === false) return NextResponse.json({ error: 'Service is disabled.' }, { status: 400 })
    if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })

    const shopSettings = settingsToMap(settingsRes.data)
    const stepMin = getNumberSetting(shopSettings, 'slot_step_min', 15)
    const defaultBufferMin = getNumberSetting(shopSettings, 'default_buffer_min', 15)
    const bufferMin = Number.isFinite(Number(service.buffer_min)) ? Number(service.buffer_min) : defaultBufferMin
    const durationMin = Number(service.time) || 60
    const legacyDate = toLegacyDate(dateISO)

    const [serviceLocationsRes, serviceProviderGroupsRes, staffProviderGroupsRes, holidaysRes, serviceResourcesRes] = await Promise.all([
      safeSelect(supabase.from('service_locations').select('*').eq('service_id', serviceId).eq('enabled', true)),
      safeSelect(supabase.from('service_provider_groups').select('*').eq('service_id', serviceId)),
      safeSelect(supabase.from('staff_provider_groups').select('*')),
      safeSelect(supabase.from('holidays').select('*').lte('holiday_date', dateISO)),
      safeSelect(supabase.from('service_resources').select('*').eq('service_id', serviceId)),
    ])

    const allowedLocationIds = (serviceLocationsRes.data || []).map((row) => Number(row.location_id)).filter(Number.isFinite)
    const resolvedLocationId =
      locationIdInput ||
      (allowedLocationIds.length === 1 ? allowedLocationIds[0] : normalizeOptionalNumber(service?.default_location_id))

    if (locationIdInput && allowedLocationIds.length > 0 && !allowedLocationIds.includes(locationIdInput)) {
      return NextResponse.json({ error: 'This service is not available at the selected location.' }, { status: 400 })
    }

    const requiredProviderGroupIds = (serviceProviderGroupsRes.data || []).map((row) => Number(row.provider_group_id)).filter(Number.isFinite)
    if (requiredProviderGroupIds.length === 0) {
      const defaultGroupId = normalizeOptionalNumber(service?.default_provider_group_id)
      if (defaultGroupId) requiredProviderGroupIds.push(defaultGroupId)
    }

    const staffProviderGroupMap = buildStaffProviderGroupMap(staffProviderGroupsRes.data || [])

    const staffQuery = supabase.from('staff').select('*').eq('enabled', true).order('name')
    const { data: staffList, error: staffError } = staffIdInput ? await staffQuery.eq('id', staffIdInput) : await staffQuery
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 })

    const candidateStaff = (staffList || []).filter(
      (staff) =>
        staffCanDoService(staff, serviceId) &&
        staffMatchesLocation(staff, resolvedLocationId) &&
        staffMatchesProviderGroups(staff, requiredProviderGroupIds, staffProviderGroupMap)
    )
    const staffIds = candidateStaff.map((staff) => staff.id).filter(Boolean)
    if (staffIds.length === 0) {
      return NextResponse.json({ error: 'No available staff for this service.' }, { status: 400 })
    }

    const { data: shifts, error: shiftsError } = await supabase.from('staff_shifts').select('*').eq('date', dateISO).in('staff_id', staffIds)
    if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 })

    const breaksRes = await safeSelect(supabase.from('staff_breaks').select('*').in('staff_id', staffIds))
    const timeOffRes = await safeSelect(supabase.from('staff_time_off').select('*').eq('date', dateISO).in('staff_id', staffIds))
    const blockedRes = await safeSelect(supabase.from('blocked_slots').select('*').eq('date', dateISO).in('staff_id', staffIds))

    const bookingsResult = await (async () => {
      const result = await supabase
        .from('bookings')
        .select('id,staff_id,status,start_time,end_time,buffer_end_time,duration_min,buffer_min,time')
        .eq('appointment_date', dateISO)
        .in('staff_id', staffIds)
      if (!result.error) return result
      if (String(result.error.message || '').includes('appointment_date')) {
        return supabase.from('bookings').select('id,staff_id,status,time').eq('date', legacyDate).in('staff_id', staffIds)
      }
      return result
    })()
    if (bookingsResult.error) return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 })

    const bookingIds = (bookingsResult.data || []).map((booking) => booking.id).filter(Boolean)
    const resourceIds = (serviceResourcesRes.data || []).map((row) => Number(row.resource_id)).filter(Number.isFinite)
    const [resourcesRes, allocationsRes] = await Promise.all([
      resourceIds.length > 0 ? safeSelect(supabase.from('resources').select('*').in('id', resourceIds)) : Promise.resolve({ data: [] }),
      bookingIds.length > 0 ? safeSelect(supabase.from('booking_resource_allocations').select('*').in('booking_id', bookingIds)) : Promise.resolve({ data: [] }),
    ])

    const byStaffBookings = new Map()
    for (const booking of bookingsResult.data || []) {
      if (!byStaffBookings.has(booking.staff_id)) byStaffBookings.set(booking.staff_id, [])
      byStaffBookings.get(booking.staff_id).push(booking)
    }

    const byStaffShift = new Map()
    for (const shift of shifts || []) byStaffShift.set(shift.staff_id, shift)

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

    const candidateHolidays = (holidaysRes.data || []).filter((holiday) => holidayCoversDate(holiday, dateISO))
    const resourceRows = (resourcesRes.data || []).filter(
      (resource) => resource.enabled !== false && (!resolvedLocationId || !resource.location_id || Number(resource.location_id) === Number(resolvedLocationId))
    )

    let chosenStaff = null
    let chosenStaffId = null
    for (const staff of candidateStaff) {
      const providerGroupIds = Array.from(staffProviderGroupMap.get(staff.id) || [])
      const directProviderGroupId = normalizeOptionalNumber(staff?.provider_group_id)
      if (directProviderGroupId && !providerGroupIds.includes(directProviderGroupId)) providerGroupIds.push(directProviderGroupId)

      const holidays = candidateHolidays.filter((holiday) =>
        holidayMatchesScope(holiday, {
          dateISO,
          locationId: resolvedLocationId,
          staffId: staff.id,
          providerGroupIds,
        })
      )

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
        holidays,
      })
      if (
        slots.includes(startTime) &&
        resourcesAvailableForSlot({
          startTime,
          bookings: byStaffBookings.get(staff.id) || [],
          allocations: allocationsRes.data || [],
          resources: resourceRows,
          serviceResources: serviceResourcesRes.data || [],
          durationMin,
          bufferMin,
        })
      ) {
        chosenStaff = staff
        chosenStaffId = staff.id
        break
      }
    }

    if (!chosenStaffId) {
      return NextResponse.json({ error: 'This time slot is already booked. Please choose another time.' }, { status: 409 })
    }

    const endTime = addMinutesToTime(startTime, durationMin)
    const bufferEndTime = addMinutesToTime(endTime, bufferMin)
    const startAt = timeToHKTimestamp(dateISO, startTime)
    const endAt = addMinutesToHKTimestamp(dateISO, startTime, durationMin)
    const bufferEndAt = addMinutesToHKTimestamp(dateISO, startTime, durationMin + bufferMin)
    let finalPrice = Number(service.price) || 0

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase.from('coupons').select('*').eq('code', couponCode).eq('enabled', true).maybeSingle()
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
        const { count, error: usageError } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('coupon', couponCode)
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
      const ticketRes = await supabase.from('user_tickets').select('id,remaining_count,member_user_id,customer_id,ticket_name,ticket_id,tickets(*)').eq('id', userTicketId).maybeSingle()
      if (ticketRes.error) return NextResponse.json({ error: ticketRes.error.message }, { status: 500 })
      userTicket = ticketRes.data
      if (!userTicket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 })

      const ownerMatches = String(userTicket.member_user_id || '') === String(user.id) || String(userTicket.customer_id || '') === String(user.id)
      if (!ownerMatches) return NextResponse.json({ error: 'You do not own this ticket.' }, { status: 403 })
      if (Number(userTicket.remaining_count || 0) <= 0) {
        return NextResponse.json({ error: 'Ticket has no remaining uses.' }, { status: 400 })
      }
      const ticketServiceId = Number(userTicket?.tickets?.service_id)
      if (Number.isFinite(ticketServiceId) && ticketServiceId !== Number(service.id)) {
        return NextResponse.json({ error: 'Ticket does not match this service.' }, { status: 400 })
      }
      finalPrice = 0
    }

    const payload = {
      ref: `${Date.now()}`,
      service: service.name,
      service_price: service.price,
      final_price: finalPrice,
      date: legacyDate,
      time: startTime,
      staff_id: chosenStaffId,
      staff_name: chosenStaff.name,
      name: customerName,
      phone: customerPhone,
      coupon: couponCode || null,
      user_ticket_id: userTicket?.id || null,
      status: 'pending',
      user_id: user.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: user.email,
      service_id: service.id,
      location_id: resolvedLocationId,
      provider_group_id: requiredProviderGroupIds[0] || null,
      appointment_date: dateISO,
      start_time: startTime,
      end_time: endTime,
      buffer_end_time: bufferEndTime,
      start_at: startAt,
      end_at: endAt,
      buffer_end_at: bufferEndAt,
      duration_min: durationMin,
      buffer_min: bufferMin,
    }

    const { data: inserted, error: insertError } = await supabase.from('bookings').insert(payload).select('*').single()
    if (insertError) {
      const message = insertError.message || ''
      if (message.includes('unique_booking') || message.includes('conflict') || message.includes('overlap')) {
        return NextResponse.json({ error: 'This time slot is already booked. Please choose another time.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create booking: ' + message }, { status: 500 })
    }

    if (userTicket) {
      const { error: ticketUpdateError } = await supabase.from('user_tickets').update({ remaining_count: Number(userTicket.remaining_count || 0) - 1 }).eq('id', userTicket.id)
      if (ticketUpdateError) {
        await supabase.from('bookings').delete().eq('id', inserted.id)
        return NextResponse.json({ error: 'Ticket deduction failed: ' + ticketUpdateError.message }, { status: 500 })
      }
    }

    if ((serviceResourcesRes.data || []).length > 0) {
      const allocationPayload = (serviceResourcesRes.data || []).map((requirement) => ({
        booking_id: inserted.id,
        resource_id: requirement.resource_id,
        quantity: Number(requirement.quantity || 1),
      }))

      const { error: allocationError } = await supabase.from('booking_resource_allocations').insert(allocationPayload)
      if (allocationError) {
        await supabase.from('bookings').delete().eq('id', inserted.id)
        if (userTicket) {
          await supabase.from('user_tickets').update({ remaining_count: Number(userTicket.remaining_count || 0) }).eq('id', userTicket.id)
        }
        return NextResponse.json({ error: 'Resource allocation failed: ' + allocationError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ booking: inserted }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error.' }, { status: 500 })
  }
}

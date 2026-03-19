import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../lib/supabase/service'
import { getSlotMatrix, holidayCoversDate } from '../../../lib/booking/availability'
import { intervalsOverlap, parseList, parseTimeToMinutes } from '../../../lib/time'

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
  return Number.isFinite(value) && value > 0 ? value : fallback
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

const staffCanDoService = (staff, serviceId) => {
  const list = parseList(staff?.services).map((item) => Number(item)).filter(Number.isFinite)
  if (list.length === 0) return true
  return list.includes(Number(serviceId))
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

const filterSlotMatrixByResources = ({
  slotMatrix = [],
  bookings = [],
  allocations = [],
  resources = [],
  serviceResources = [],
  durationMin,
  bufferMin,
}) => {
  if (!serviceResources.length) return slotMatrix

  const resourceMap = new Map((resources || []).map((resource) => [Number(resource.id), resource]))
  const allocationsByBooking = new Map()
  for (const allocation of allocations || []) {
    if (!allocationsByBooking.has(allocation.booking_id)) allocationsByBooking.set(allocation.booking_id, [])
    allocationsByBooking.get(allocation.booking_id).push(allocation)
  }

  return slotMatrix.map((entry) => {
    if (!entry.available) return entry

    const startMin = parseTimeToMinutes(entry.time)
    const endMin = startMin + durationMin + bufferMin

    const resourcesOk = serviceResources.every((requirement) => {
      const resource = resourceMap.get(Number(requirement.resource_id))
      if (!resource || resource.enabled === false) return false

      const needed = Number(requirement.quantity || 1)
      const capacity = Number(resource.capacity || 1)
      const used = (bookings || []).reduce((sum, booking) => {
        if (booking.status !== 'pending' && booking.status !== 'confirmed') return sum

        const bookingStart = parseTimeToMinutes(booking.start_time || booking.time)
        const bookingEnd = parseTimeToMinutes(booking.buffer_end_time || booking.end_time || booking.time)
        if (bookingStart == null || bookingEnd == null) return sum
        if (!intervalsOverlap(startMin, endMin, bookingStart, bookingEnd)) return sum

        return sum + (allocationsByBooking.get(booking.id) || [])
          .filter((allocation) => Number(allocation.resource_id) === Number(requirement.resource_id))
          .reduce((inner, allocation) => inner + Number(allocation.quantity || 1), 0)
      }, 0)

      return capacity - used >= needed
    })

    return { ...entry, available: resourcesOk }
  })
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const dateISO = url.searchParams.get('date')
    const serviceId = Number(url.searchParams.get('serviceId'))
    const staffIdParam = url.searchParams.get('staffId')
    const staffId = staffIdParam ? Number(staffIdParam) : null
    const requestedLocationId = normalizeOptionalNumber(url.searchParams.get('locationId'))

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: 'Invalid appointment date.' }, { status: 400 })
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json({ error: 'Missing service.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const serviceRes = await supabase.from('services').select('id,time,buffer_min,enabled,default_location_id,default_provider_group_id').eq('id', serviceId).single()
    const settingsRes = await supabase.from('settings').select('key,value')

    if (serviceRes.error && String(serviceRes.error.message || '').includes('buffer_min')) {
      const fallbackRes = await supabase.from('services').select('id,time,enabled,default_location_id,default_provider_group_id').eq('id', serviceId).single()
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
    const serviceDurationMin = Number(service.time) || 60

    const [serviceLocationsRes, serviceProviderGroupsRes, staffProviderGroupsRes, holidaysRes, serviceResourcesRes] = await Promise.all([
      safeSelect(supabase.from('service_locations').select('*').eq('service_id', serviceId).eq('enabled', true)),
      safeSelect(supabase.from('service_provider_groups').select('*').eq('service_id', serviceId)),
      safeSelect(supabase.from('staff_provider_groups').select('*')),
      safeSelect(supabase.from('holidays').select('*').lte('holiday_date', dateISO)),
      safeSelect(supabase.from('service_resources').select('*').eq('service_id', serviceId)),
    ])

    const allowedLocationIds = (serviceLocationsRes.data || []).map((row) => Number(row.location_id)).filter(Number.isFinite)
    const resolvedLocationId =
      requestedLocationId ||
      (allowedLocationIds.length === 1 ? allowedLocationIds[0] : normalizeOptionalNumber(service?.default_location_id))

    if (requestedLocationId && allowedLocationIds.length > 0 && !allowedLocationIds.includes(requestedLocationId)) {
      return NextResponse.json({ slots: [], slotMatrix: [], staffAvailability: {}, locationId: requestedLocationId }, { status: 200 })
    }

    const requiredProviderGroupIds = (serviceProviderGroupsRes.data || []).map((row) => Number(row.provider_group_id)).filter(Number.isFinite)
    if (requiredProviderGroupIds.length === 0) {
      const defaultGroupId = normalizeOptionalNumber(service?.default_provider_group_id)
      if (defaultGroupId) requiredProviderGroupIds.push(defaultGroupId)
    }

    const staffProviderGroupMap = buildStaffProviderGroupMap(staffProviderGroupsRes.data || [])

    const staffQuery = supabase.from('staff').select('*').eq('enabled', true).order('name')
    const { data: staffList, error: staffError } = staffId ? await staffQuery.eq('id', staffId) : await staffQuery
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 })

    const eligibleStaffList = (staffList || []).filter(
      (staff) =>
        staffCanDoService(staff, serviceId) &&
        staffMatchesLocation(staff, resolvedLocationId) &&
        staffMatchesProviderGroups(staff, requiredProviderGroupIds, staffProviderGroupMap)
    )
    const staffIds = eligibleStaffList.map((staff) => staff.id).filter(Boolean)
    if (staffIds.length === 0) {
      return NextResponse.json({ slots: [], slotMatrix: [], staffAvailability: {}, locationId: resolvedLocationId }, { status: 200 })
    }

    const { data: shifts, error: shiftsError } = await supabase.from('staff_shifts').select('*').eq('date', dateISO).in('staff_id', staffIds)
    if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 })

    const breaksRes = await safeSelect(supabase.from('staff_breaks').select('*').in('staff_id', staffIds))
    const timeOffRes = await safeSelect(supabase.from('staff_time_off').select('*').eq('date', dateISO).in('staff_id', staffIds))
    const blockedRes = await safeSelect(supabase.from('blocked_slots').select('*').eq('date', dateISO).in('staff_id', staffIds))

    const legacyDate = toLegacyDate(dateISO)
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

    const staffAvailability = {}
    const staffSlotMatrix = {}
    for (const staff of eligibleStaffList) {
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

      const params = {
        staff,
        shift: byStaffShift.get(staff.id) || null,
        dateISO,
        shopSettings,
        serviceDurationMin,
        bufferMin,
        stepMin,
        bookings: byStaffBookings.get(staff.id) || [],
        breaks: breaksByStaff.get(staff.id) || [],
        timeOffs: timeOffByStaff.get(staff.id) || [],
        blockedSlots: blockedByStaff.get(staff.id) || [],
        holidays,
      }
      const slotMatrix = filterSlotMatrixByResources({
        slotMatrix: getSlotMatrix(params),
        bookings: byStaffBookings.get(staff.id) || [],
        allocations: allocationsRes.data || [],
        resources: resourceRows,
        serviceResources: serviceResourcesRes.data || [],
        durationMin: serviceDurationMin,
        bufferMin,
      })
      staffAvailability[staff.id] = slotMatrix.filter((slot) => slot.available).map((slot) => slot.time)
      staffSlotMatrix[staff.id] = slotMatrix
    }

    if (staffId) {
      return NextResponse.json(
        {
          slots: staffAvailability[staffId] || [],
          slotMatrix: staffSlotMatrix[staffId] || [],
          locationId: resolvedLocationId,
        },
        { status: 200 }
      )
    }

    const allSlots = new Set()
    for (const slots of Object.values(staffAvailability)) {
      for (const slot of slots) allSlots.add(slot)
    }

    const mergedSlotMatrixMap = new Map()
    for (const matrix of Object.values(staffSlotMatrix)) {
      for (const entry of matrix) {
        const current = mergedSlotMatrixMap.get(entry.time)
        mergedSlotMatrixMap.set(entry.time, {
          time: entry.time,
          available: Boolean(current?.available || entry.available),
        })
      }
    }

    return NextResponse.json(
      {
        slots: Array.from(allSlots).sort(),
        slotMatrix: Array.from(mergedSlotMatrixMap.values()).sort((a, b) => a.time.localeCompare(b.time)),
        staffAvailability,
        locationId: resolvedLocationId,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../lib/supabase/service'
import { getAvailableSlots, getSlotMatrix } from '../../../lib/booking/availability'
import { parseList } from '../../../lib/time'

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

const staffCanDoService = (staff, serviceId) => {
  const list = parseList(staff?.services).map((item) => Number(item)).filter(Number.isFinite)
  if (list.length === 0) return true
  return list.includes(Number(serviceId))
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const dateISO = url.searchParams.get('date')
    const serviceId = Number(url.searchParams.get('serviceId'))
    const staffIdParam = url.searchParams.get('staffId')
    const staffId = staffIdParam ? Number(staffIdParam) : null

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: 'Invalid appointment date.' }, { status: 400 })
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json({ error: 'Missing service.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const serviceRes = await supabase.from('services').select('id,time,buffer_min,enabled').eq('id', serviceId).single()
    const settingsRes = await supabase.from('settings').select('key,value')

    if (serviceRes.error && String(serviceRes.error.message || '').includes('buffer_min')) {
      const fallbackRes = await supabase.from('services').select('id,time,enabled').eq('id', serviceId).single()
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

    const staffQuery = supabase.from('staff').select('*').eq('enabled', true).order('name')
    const { data: staffList, error: staffError } = staffId ? await staffQuery.eq('id', staffId) : await staffQuery
    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 })

    const eligibleStaffList = (staffList || []).filter((staff) => staffCanDoService(staff, serviceId))
    const staffIds = eligibleStaffList.map((staff) => staff.id).filter(Boolean)
    if (staffIds.length === 0) {
      return NextResponse.json({ slots: [], slotMatrix: [], staffAvailability: {} }, { status: 200 })
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

    const staffAvailability = {}
    const staffSlotMatrix = {}
    for (const staff of eligibleStaffList) {
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
      }
      const slots = getAvailableSlots(params)
      const slotMatrix = getSlotMatrix(params)
      staffAvailability[staff.id] = slots
      staffSlotMatrix[staff.id] = slotMatrix
    }

    if (staffId) {
      return NextResponse.json(
        {
          slots: staffAvailability[staffId] || [],
          slotMatrix: staffSlotMatrix[staffId] || [],
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
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

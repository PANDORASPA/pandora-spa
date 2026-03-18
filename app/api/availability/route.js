import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../lib/supabase/service'
import { getAvailableSlots } from '../../../lib/booking/availability'

const toLegacyDate = (dateISO) => {
  const [y, m, d] = String(dateISO || '').split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

const settingsToMap = (rows) => {
  const map = {}
  for (const r of rows || []) map[r.key] = r.value
  return map
}

const getNumberSetting = (settings, key, fallback) => {
  const v = settings?.[key]
  const n = typeof v === 'number' ? v : Number(String(v || ''))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const safeSelect = async (promise) => {
  const res = await promise
  if (res?.error && String(res.error.message || '').includes('does not exist')) {
    return { data: [] }
  }
  return res
}

const normalizeServiceIds = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => Number(item)).filter(Number.isFinite)
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text)
        return Array.isArray(parsed) ? parsed.map((item) => Number(item)).filter(Number.isFinite) : []
      } catch {
        return []
      }
    }
  }
  return []
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const dateISO = url.searchParams.get('date')
    const serviceId = Number(url.searchParams.get('serviceId'))
    const staffIdParam = url.searchParams.get('staffId')
    const staffId = staffIdParam ? Number(staffIdParam) : null

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: '日期格式錯誤' }, { status: 400 })
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json({ error: '缺少服務' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const serviceRes = await supabase.from('services').select('id,time,buffer_min,enabled').eq('id', serviceId).single()
    const settingsRes = await supabase.from('settings').select('key,value')

    const service = serviceRes.data
    const svcErr = serviceRes.error
    const settingsRows = settingsRes.data
    const setErr = settingsRes.error

    if (svcErr && String(svcErr.message || '').includes('buffer_min')) {
      const fallbackRes = await supabase.from('services').select('id,time,enabled').eq('id', serviceId).single()
      if (fallbackRes.error) return NextResponse.json({ error: '找不到服務' }, { status: 404 })
      serviceRes.data = fallbackRes.data
      serviceRes.error = null
    }

    const svc = serviceRes.data
    if (serviceRes.error || !svc) return NextResponse.json({ error: '找不到服務' }, { status: 404 })
    if (svc.enabled === false) return NextResponse.json({ error: '服務已停用' }, { status: 400 })
    if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })

    const shopSettings = settingsToMap(settingsRows)
    const stepMin = getNumberSetting(shopSettings, 'slot_step_min', 15)
    const defaultBufferMin = getNumberSetting(shopSettings, 'default_buffer_min', 15)
    const bufferMin = Number.isFinite(Number(svc.buffer_min)) ? Number(svc.buffer_min) : defaultBufferMin
    const serviceDurationMin = Number(svc.time) || 60

    const staffQuery = supabase.from('staff').select('*').eq('enabled', true).order('name')
    const { data: staffList, error: staffErr } = staffId ? await staffQuery.eq('id', staffId) : await staffQuery
    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 })

    const eligibleStaffList = (staffList || []).filter((member) => {
      const serviceIds = normalizeServiceIds(member?.services)
      return serviceIds.length === 0 || serviceIds.includes(serviceId)
    })

    const staffIds = eligibleStaffList.map((s) => s.id).filter(Boolean)
    if (staffIds.length === 0) return NextResponse.json({ slots: [], staffAvailability: {} }, { status: 200 })

    const { data: shifts, error: shiftsErr } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('date', dateISO)
      .in('staff_id', staffIds)

    if (shiftsErr) return NextResponse.json({ error: shiftsErr.message }, { status: 500 })

    const breaksRes = await safeSelect(supabase.from('staff_breaks').select('*').in('staff_id', staffIds))
    const timeOffRes = await safeSelect(supabase.from('staff_time_off').select('*').eq('date', dateISO).in('staff_id', staffIds))
    const blockedRes = await safeSelect(supabase.from('blocked_slots').select('*').eq('date', dateISO).in('staff_id', staffIds))

    const legacyDate = toLegacyDate(dateISO)

    const bookingsResult = await (async () => {
      const res = await supabase
        .from('bookings')
        .select('id,staff_id,status,start_time,end_time,buffer_end_time,duration_min,buffer_min,time')
        .eq('appointment_date', dateISO)
        .in('staff_id', staffIds)

      if (!res.error) return res
      if (String(res.error.message || '').includes('appointment_date')) {
        return supabase
          .from('bookings')
          .select('id,staff_id,status,time')
          .eq('date', legacyDate)
          .in('staff_id', staffIds)
      }
      return res
    })()

    if (bookingsResult.error) return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 })
    const bookings = bookingsResult.data || []

    const byStaffBookings = new Map()
    for (const b of bookings) {
      const id = b.staff_id
      if (!byStaffBookings.has(id)) byStaffBookings.set(id, [])
      byStaffBookings.get(id).push(b)
    }

    const byStaffShift = new Map()
    for (const s of shifts || []) byStaffShift.set(s.staff_id, s)

    const breaksByStaff = new Map()
    for (const b of breaksRes.data || []) {
      if (!breaksByStaff.has(b.staff_id)) breaksByStaff.set(b.staff_id, [])
      breaksByStaff.get(b.staff_id).push(b)
    }

    const timeOffByStaff = new Map()
    for (const t of timeOffRes.data || []) {
      if (!timeOffByStaff.has(t.staff_id)) timeOffByStaff.set(t.staff_id, [])
      timeOffByStaff.get(t.staff_id).push(t.is_all_day ? { start_time: '00:00', end_time: '23:59' } : t)
    }

    const blockedByStaff = new Map()
    for (const b of blockedRes.data || []) {
      if (!blockedByStaff.has(b.staff_id)) blockedByStaff.set(b.staff_id, [])
      blockedByStaff.get(b.staff_id).push(b)
    }

    const staffAvailability = {}
    for (const staff of eligibleStaffList) {
      const shift = byStaffShift.get(staff.id) || null
      const slots = getAvailableSlots({
        staff,
        shift,
        dateISO,
        shopSettings,
        serviceDurationMin,
        bufferMin,
        stepMin,
        bookings: byStaffBookings.get(staff.id) || [],
        breaks: breaksByStaff.get(staff.id) || [],
        timeOffs: timeOffByStaff.get(staff.id) || [],
        blockedSlots: blockedByStaff.get(staff.id) || [],
      })
      staffAvailability[staff.id] = slots
    }

    if (staffId) {
      return NextResponse.json({ slots: staffAvailability[staffId] || [] }, { status: 200 })
    }

    const allSlots = new Set()
    for (const slots of Object.values(staffAvailability)) {
      for (const t of slots) allSlots.add(t)
    }
    const merged = Array.from(allSlots).sort()
    return NextResponse.json({ slots: merged, staffAvailability }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: e?.message || '未知錯誤' }, { status: 500 })
  }
}

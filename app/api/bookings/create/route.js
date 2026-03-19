import { NextResponse } from 'next/server'
import { getAvailableSlots } from '../../../../lib/booking/availability'
import { addMinutesToTime, parseList } from '../../../../lib/time'
import { addMinutesToHKTimestamp, timeToHKTimestamp } from '../../../../lib/booking/availability'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

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
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const staffCanDoService = (staff, serviceId) => {
  const list = parseList(staff?.services)
  if (list.length === 0) return true
  return list.includes(String(serviceId)) || list.includes(Number(serviceId).toString())
}

const safeSelect = async (promise) => {
  const res = await promise
  if (res?.error && String(res.error.message || '').includes('does not exist')) {
    return { data: [] }
  }
  return res
}

export async function POST(request) {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '請先登入會員後再預約' }, { status: 401 })
    }

    const body = await request.json()
    const dateISO = body?.date
    const serviceId = Number(body?.serviceId)
    const staffIdInput = body?.staffId == null || body?.staffId === '' ? null : Number(body.staffId)
    const startTime = String(body?.startTime || '')
    const customerName = String(body?.customerName || '')
    const customerPhone = String(body?.customerPhone || '')
    const couponCode = body?.couponCode ? String(body.couponCode) : ''
    const userTicketId = body?.userTicketId ? Number(body.userTicketId) : null

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: '日期格式錯誤' }, { status: 400 })
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json({ error: '請選擇服務' }, { status: 400 })
    }
    if (!startTime) {
      return NextResponse.json({ error: '請選擇時間' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const serviceRes = await supabase.from('services').select('id,name,price,time,buffer_min,enabled').eq('id', serviceId).single()
    const settingsRes = await supabase.from('settings').select('key,value')

    if (serviceRes.error && String(serviceRes.error.message || '').includes('buffer_min')) {
      const fallbackRes = await supabase.from('services').select('id,name,price,time,enabled').eq('id', serviceId).single()
      if (fallbackRes.error) return NextResponse.json({ error: '找不到服務' }, { status: 404 })
      serviceRes.data = fallbackRes.data
      serviceRes.error = null
    }

    const service = serviceRes.data
    if (serviceRes.error || !service) return NextResponse.json({ error: '找不到服務' }, { status: 404 })
    if (service.enabled === false) return NextResponse.json({ error: '服務已停用' }, { status: 400 })
    if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })

    const shopSettings = settingsToMap(settingsRes.data)
    const stepMin = getNumberSetting(shopSettings, 'slot_step_min', 15)
    const defaultBufferMin = getNumberSetting(shopSettings, 'default_buffer_min', 15)
    const bufferMin = Number.isFinite(Number(service.buffer_min)) ? Number(service.buffer_min) : defaultBufferMin
    const durationMin = Number(service.time) || 60

    const legacyDate = toLegacyDate(dateISO)

    const staffQuery = supabase.from('staff').select('*').eq('enabled', true).order('name')
    const { data: staffList, error: staffErr } = staffIdInput ? await staffQuery.eq('id', staffIdInput) : await staffQuery
    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 })

    const candidateStaff = (staffList || []).filter((staff) => staffCanDoService(staff, serviceId))
    const staffIds = candidateStaff.map((staff) => staff.id).filter(Boolean)
    if (staffIds.length === 0) return NextResponse.json({ error: '找不到可用員工' }, { status: 400 })

    const { data: shifts, error: shiftsErr } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('date', dateISO)
      .in('staff_id', staffIds)
    if (shiftsErr) return NextResponse.json({ error: shiftsErr.message }, { status: 500 })

    const breaksRes = await safeSelect(supabase.from('staff_breaks').select('*').in('staff_id', staffIds))
    const timeOffRes = await safeSelect(supabase.from('staff_time_off').select('*').eq('date', dateISO).in('staff_id', staffIds))
    const blockedRes = await safeSelect(supabase.from('blocked_slots').select('*').eq('date', dateISO).in('staff_id', staffIds))

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

    let chosenStaff = null
    let chosenStaffId = null

    for (const staff of candidateStaff || []) {
      const shift = byStaffShift.get(staff.id) || null
      const slots = getAvailableSlots({
        staff,
        shift,
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
        chosenStaffId = staff.id
        break
      }
    }

    if (!chosenStaffId) {
      return NextResponse.json({ error: '此時段已被預約，請選擇其他時間' }, { status: 409 })
    }

    const endTime = addMinutesToTime(startTime, durationMin)
    const bufferEndTime = addMinutesToTime(endTime, bufferMin)
    const startAt = timeToHKTimestamp(dateISO, startTime)
    const endAt = addMinutesToHKTimestamp(dateISO, startTime, durationMin)
    const bufferEndAt = addMinutesToHKTimestamp(dateISO, startTime, durationMin + bufferMin)
    let finalPrice = Number(service.price) || 0

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

      if (coupon.type === 'percent') {
        finalPrice = Math.max(0, finalPrice * (1 - Number(coupon.discount || 0) / 100))
      } else {
        finalPrice = Math.max(0, finalPrice - Number(coupon.discount || 0))
      }
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

      const ownerMatches =
        String(userTicket.member_user_id || '') === String(user.id) ||
        String(userTicket.customer_id || '') === String(user.id)
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

    const { data: inserted, error: insErr } = await supabase.from('bookings').insert(payload).select('*').single()
    if (insErr) {
      const msg = insErr.message || ''
      if (msg.includes('unique_booking') || msg.includes('conflict') || msg.includes('overlap')) {
        return NextResponse.json({ error: '此時段已被預約，請選擇其他時間' }, { status: 409 })
      }
      return NextResponse.json({ error: '建立預約失敗: ' + msg }, { status: 500 })
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

    return NextResponse.json(
      {
        booking: inserted,
      },
      { status: 200 }
    )
  } catch (e) {
    return NextResponse.json({ error: e?.message || '未知錯誤' }, { status: 500 })
  }
}

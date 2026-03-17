import { addMinutesToTime, intervalsOverlap, normalizeTime, parseList, parseTimeToMinutes, minutesToTime } from '../time'

export function parseBusinessHours(value) {
  const s = String(value || '11:00 - 20:00')
  const parts = s.split('-').map(p => p.trim())
  if (parts.length !== 2) return { start: '11:00', end: '20:00' }
  const start = normalizeTime(parts[0])
  const end = normalizeTime(parts[1])
  return { start: start || '11:00', end: end || '20:00' }
}

export function getDayOfWeek(dateISO) {
  const d = new Date(`${dateISO}T00:00:00Z`)
  return d.getUTCDay()
}

export function getWorkingWindow({ staff, shift, dateISO, shopSettings }) {
  const dayOfWeek = getDayOfWeek(dateISO)
  const dayKey = String(dayOfWeek)
  const dayName = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]

  const shopDaysOff = parseList(shopSettings?.days_off)
  if (shopDaysOff.includes(dayKey) || shopDaysOff.includes(dayName)) return null

  if (shift) {
    if (shift.is_off) return null
    const start = normalizeTime(shift.start_time)
    const end = normalizeTime(shift.end_time)
    if (!start || !end) return null
    return { startMin: parseTimeToMinutes(start), endMin: parseTimeToMinutes(end) }
  }

  const staffDaysOff = parseList(staff?.daysOff)
  if (staffDaysOff.includes(dayKey)) return null

  const start = normalizeTime(staff?.schedule?.[dayKey]?.start)
  const end = normalizeTime(staff?.schedule?.[dayKey]?.end)
  if (!start || !end) return null
  return { startMin: parseTimeToMinutes(start), endMin: parseTimeToMinutes(end) }
}

export function getBreakIntervals({ staff, breaks, dateISO }) {
  const result = []
  const dayOfWeek = getDayOfWeek(dateISO)

  const bs = normalizeTime(staff?.break_start)
  const be = normalizeTime(staff?.break_end)
  const bsMin = parseTimeToMinutes(bs)
  const beMin = parseTimeToMinutes(be)
  if (bsMin != null && beMin != null && bsMin < beMin) {
    result.push({ startMin: bsMin, endMin: beMin })
  }

  if (Array.isArray(breaks)) {
    for (const b of breaks) {
      if (!b || b.enabled === false) continue
      if (Number(b.day_of_week) !== dayOfWeek) continue
      const s = parseTimeToMinutes(b.start_time)
      const e = parseTimeToMinutes(b.end_time)
      if (s != null && e != null && s < e) result.push({ startMin: s, endMin: e })
    }
  }

  return result
}

export function getBookedIntervals({ bookings, serviceDurationMinFallback = 60, bufferMinFallback = 0 }) {
  const result = []
  if (!Array.isArray(bookings)) return result

  for (const b of bookings) {
    if (!b) continue
    if (b.status !== 'pending' && b.status !== 'confirmed') continue

    const start = parseTimeToMinutes(b.start_time || b.time)
    if (start == null) continue

    const duration = Number.isFinite(Number(b.duration_min)) ? Number(b.duration_min) : serviceDurationMinFallback
    const buffer = Number.isFinite(Number(b.buffer_min)) ? Number(b.buffer_min) : bufferMinFallback

    const end = b.end_time ? parseTimeToMinutes(b.end_time) : start + duration
    const bufferEnd = b.buffer_end_time ? parseTimeToMinutes(b.buffer_end_time) : end + buffer
    if (end == null || bufferEnd == null) continue

    result.push({ startMin: start, endMin: bufferEnd })
  }

  return result
}

export function getTimeOffIntervals({ timeOffs }) {
  const result = []
  if (!Array.isArray(timeOffs)) return result
  for (const t of timeOffs) {
    if (!t) continue
    const s = parseTimeToMinutes(t.start_time)
    const e = parseTimeToMinutes(t.end_time)
    if (s != null && e != null && s < e) result.push({ startMin: s, endMin: e })
  }
  return result
}

export function generateStartSlots({ windowStartMin, windowEndMin, serviceDurationMin, bufferMin, stepMin }) {
  const slots = []
  if (windowStartMin == null || windowEndMin == null) return slots
  const total = (serviceDurationMin || 0) + (bufferMin || 0)
  if (total <= 0) return slots
  const lastStart = windowEndMin - total
  for (let t = windowStartMin, count = 0; t <= lastStart && count < 300; t += stepMin, count++) {
    slots.push(minutesToTime(t))
  }
  return slots
}

export function isTimeSlotAvailable({ startMin, serviceDurationMin, bufferMin, window, breakIntervals, blockedIntervals }) {
  if (!window) return false
  const endMin = startMin + serviceDurationMin
  const bufferEndMin = endMin + bufferMin
  if (startMin < window.startMin || bufferEndMin > window.endMin) return false

  if (Array.isArray(breakIntervals)) {
    for (const br of breakIntervals) {
      if (intervalsOverlap(startMin, bufferEndMin, br.startMin, br.endMin)) return false
    }
  }
  if (Array.isArray(blockedIntervals)) {
    for (const it of blockedIntervals) {
      if (intervalsOverlap(startMin, bufferEndMin, it.startMin, it.endMin)) return false
    }
  }

  return true
}

export function getAvailableSlots(params) {
  const {
    staff,
    shift,
    dateISO,
    shopSettings,
    serviceDurationMin,
    bufferMin,
    stepMin,
    bookings,
    breaks,
    timeOffs,
    blockedSlots,
  } = params

  const window = getWorkingWindow({ staff, shift, dateISO, shopSettings })
  if (!window) return []

  const breakIntervals = getBreakIntervals({ staff, breaks, dateISO })
  const blockedIntervals = [
    ...getBookedIntervals({ bookings, serviceDurationMinFallback: serviceDurationMin, bufferMinFallback: bufferMin }),
    ...getTimeOffIntervals({ timeOffs }),
    ...getTimeOffIntervals({ timeOffs: blockedSlots }),
  ]

  const candidateSlots = generateStartSlots({
    windowStartMin: window.startMin,
    windowEndMin: window.endMin,
    serviceDurationMin,
    bufferMin,
    stepMin,
  })

  return candidateSlots.filter((t) => {
    const startMin = parseTimeToMinutes(t)
    if (startMin == null) return false
    return isTimeSlotAvailable({ startMin, serviceDurationMin, bufferMin, window, breakIntervals, blockedIntervals })
  })
}

export function timeToHKTimestamp(dateISO, timeHHMM) {
  const t = normalizeTime(timeHHMM)
  return `${dateISO}T${t}:00+08:00`
}

export function addMinutesToHKTimestamp(dateISO, timeHHMM, minutes) {
  const startMin = parseTimeToMinutes(timeHHMM)
  if (startMin == null) return null
  const endMin = startMin + minutes
  return timeToHKTimestamp(dateISO, minutesToTime(endMin))
}


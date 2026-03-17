import { intervalsOverlap, normalizeTime, parseList, parseTimeToMinutes, minutesToTime } from '../time'

export function parseBusinessHours(value) {
  const source = String(value || '11:00 - 20:00')
  const parts = source.split('-').map((part) => part.trim())
  if (parts.length !== 2) return { start: '11:00', end: '20:00' }

  const start = normalizeTime(parts[0])
  const end = normalizeTime(parts[1])
  return { start: start || '11:00', end: end || '20:00' }
}

export function getDayOfWeek(dateISO) {
  const date = new Date(`${dateISO}T00:00:00Z`)
  return date.getUTCDay()
}

export function getWorkingWindow({ staff, shift, dateISO, shopSettings }) {
  const dayOfWeek = getDayOfWeek(dateISO)
  const dayKey = String(dayOfWeek)
  const businessHours = parseBusinessHours(shopSettings?.business_hours)

  const shopDaysOff = parseList(shopSettings?.days_off)
  if (shopDaysOff.includes(dayKey)) return null

  if (shift) {
    if (shift.is_off) return null
    const start = normalizeTime(shift.start_time)
    const end = normalizeTime(shift.end_time)
    if (!start || !end) return null
    return {
      startMin: parseTimeToMinutes(start),
      endMin: parseTimeToMinutes(end),
    }
  }

  const staffDaysOff = parseList(staff?.daysOff)
  if (staffDaysOff.includes(dayKey)) return null

  const scheduledStart = normalizeTime(staff?.schedule?.[dayKey]?.start)
  const scheduledEnd = normalizeTime(staff?.schedule?.[dayKey]?.end)
  const start = scheduledStart || businessHours.start
  const end = scheduledEnd || businessHours.end

  const startMin = parseTimeToMinutes(start)
  const endMin = parseTimeToMinutes(end)
  if (startMin == null || endMin == null || startMin >= endMin) return null

  return { startMin, endMin }
}

export function getBreakIntervals({ staff, breaks, dateISO }) {
  const result = []
  const dayOfWeek = getDayOfWeek(dateISO)

  const breakStart = parseTimeToMinutes(normalizeTime(staff?.break_start))
  const breakEnd = parseTimeToMinutes(normalizeTime(staff?.break_end))
  if (breakStart != null && breakEnd != null && breakStart < breakEnd) {
    result.push({ startMin: breakStart, endMin: breakEnd })
  }

  if (Array.isArray(breaks)) {
    for (const item of breaks) {
      if (!item || item.enabled === false) continue
      if (Number(item.day_of_week) !== dayOfWeek) continue
      const start = parseTimeToMinutes(item.start_time)
      const end = parseTimeToMinutes(item.end_time)
      if (start != null && end != null && start < end) {
        result.push({ startMin: start, endMin: end })
      }
    }
  }

  return result
}

export function getBookedIntervals({ bookings, serviceDurationMinFallback = 60, bufferMinFallback = 0 }) {
  const result = []
  if (!Array.isArray(bookings)) return result

  for (const booking of bookings) {
    if (!booking) continue
    if (booking.status !== 'pending' && booking.status !== 'confirmed') continue

    const start = parseTimeToMinutes(booking.start_time || booking.time)
    if (start == null) continue

    const duration = Number.isFinite(Number(booking.duration_min)) ? Number(booking.duration_min) : serviceDurationMinFallback
    const buffer = Number.isFinite(Number(booking.buffer_min)) ? Number(booking.buffer_min) : bufferMinFallback
    const end = booking.end_time ? parseTimeToMinutes(booking.end_time) : start + duration
    const bufferEnd = booking.buffer_end_time ? parseTimeToMinutes(booking.buffer_end_time) : end + buffer

    if (end == null || bufferEnd == null) continue
    result.push({ startMin: start, endMin: bufferEnd })
  }

  return result
}

export function getTimeOffIntervals({ timeOffs }) {
  const result = []
  if (!Array.isArray(timeOffs)) return result

  for (const item of timeOffs) {
    if (!item) continue
    const start = parseTimeToMinutes(item.start_time)
    const end = parseTimeToMinutes(item.end_time)
    if (start != null && end != null && start < end) {
      result.push({ startMin: start, endMin: end })
    }
  }

  return result
}

export function generateStartSlots({ windowStartMin, windowEndMin, serviceDurationMin, bufferMin, stepMin }) {
  const slots = []
  if (windowStartMin == null || windowEndMin == null) return slots

  const totalMinutes = (serviceDurationMin || 0) + (bufferMin || 0)
  if (totalMinutes <= 0) return slots

  const lastStart = windowEndMin - totalMinutes
  for (let minute = windowStartMin, count = 0; minute <= lastStart && count < 300; minute += stepMin, count += 1) {
    slots.push(minutesToTime(minute))
  }
  return slots
}

export function isTimeSlotAvailable({ startMin, serviceDurationMin, bufferMin, window, breakIntervals, blockedIntervals }) {
  if (!window) return false

  const endMin = startMin + serviceDurationMin
  const bufferEndMin = endMin + bufferMin
  if (startMin < window.startMin || bufferEndMin > window.endMin) return false

  if (Array.isArray(breakIntervals)) {
    for (const interval of breakIntervals) {
      if (intervalsOverlap(startMin, bufferEndMin, interval.startMin, interval.endMin)) return false
    }
  }

  if (Array.isArray(blockedIntervals)) {
    for (const interval of blockedIntervals) {
      if (intervalsOverlap(startMin, bufferEndMin, interval.startMin, interval.endMin)) return false
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

  return candidateSlots.filter((time) => {
    const startMin = parseTimeToMinutes(time)
    if (startMin == null) return false
    return isTimeSlotAvailable({ startMin, serviceDurationMin, bufferMin, window, breakIntervals, blockedIntervals })
  })
}

export function timeToHKTimestamp(dateISO, timeHHMM) {
  const time = normalizeTime(timeHHMM)
  return `${dateISO}T${time}:00+08:00`
}

export function addMinutesToHKTimestamp(dateISO, timeHHMM, minutes) {
  const startMin = parseTimeToMinutes(timeHHMM)
  if (startMin == null) return null
  return timeToHKTimestamp(dateISO, minutesToTime(startMin + minutes))
}

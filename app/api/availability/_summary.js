import { getWorkingWindow } from '../../../lib/booking/availability'
import {
  evaluatePhase2Availability,
  getStaffProviderGroupIds,
  holidayMatchesScope,
  loadPhase2Context,
} from '../../../lib/booking/phase2'

const MAX_DAYS = 31
const DEFAULT_DAYS = 14
const HK_TIME_ZONE = 'Asia/Hong_Kong'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const normalizeDateISO = (value) => {
  const text = String(value || '').trim()
  return ISO_DATE_RE.test(text) ? text : ''
}

export const getTodayISO = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

export const addDays = (dateISO, offset) => {
  const date = new Date(`${dateISO}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const parseOptionalNumber = (value) => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const resolveMonthReferenceISO = ({ startDate, year, month } = {}) => {
  const normalizedStartDate = normalizeDateISO(startDate)
  if (normalizedStartDate) return normalizedStartDate

  const parsedYear = parsePositiveInt(year, null)
  const parsedMonth = parsePositiveInt(month, null)
  if (parsedYear && parsedMonth && parsedMonth >= 1 && parsedMonth <= 12) {
    return `${String(parsedYear).padStart(4, '0')}-${String(parsedMonth).padStart(2, '0')}-01`
  }

  return getTodayISO()
}

export const getMonthWindow = (referenceDateISO) => {
  const normalizedReference = normalizeDateISO(referenceDateISO) || getTodayISO()
  const [yearText, monthText] = normalizedReference.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const monthStartISO = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
  const monthEndDate = new Date(Date.UTC(year, month, 0))
  const monthEndISO = monthEndDate.toISOString().slice(0, 10)
  const daysInMonth = monthEndDate.getUTCDate()

  return {
    monthStartISO,
    monthEndISO,
    daysInMonth,
  }
}

export const buildDateSummary = async ({ supabase, dateISO, serviceId, staffId, locationId }) => {
  const context = await loadPhase2Context({
    supabase,
    dateISO,
    serviceId,
    requestedLocationId: locationId,
    requestedStaffId: staffId,
  })

  const staff =
    (context.eligibleStaff || []).find((row) => Number(row.id) === Number(staffId)) ||
    (context.staffList || []).find((row) => Number(row.id) === Number(staffId)) ||
    null

  if (!staff) {
    return {
      date: dateISO,
      status: 'off',
      hasWorkingHours: false,
      hasAvailableSlots: false,
      availableCount: 0,
      slotCount: 0,
      reason: 'staff_unavailable',
    }
  }

  const providerGroupIds = getStaffProviderGroupIds(staff, context.staffProviderGroupMap)
  const matchedHolidays = (context.holidays || []).filter((holiday) =>
    holidayMatchesScope(holiday, {
      dateISO,
      locationId: context.resolvedLocationId,
      staffId: staff.id,
      providerGroupIds,
    }),
  )

  const shift = (context.shifts || []).find((row) => Number(row.staff_id) === Number(staff.id)) || null
  const workingWindow = getWorkingWindow({
    staff,
    shift,
    dateISO,
    shopSettings: context.shopSettings,
    holidays: matchedHolidays,
  })

  const evaluation = evaluatePhase2Availability(context, { requestedStaffId: staff.id })
  const slotMatrix = Array.isArray(evaluation.staffSlotMatrix?.[staff.id]) ? evaluation.staffSlotMatrix[staff.id] : []
  const availableCount = slotMatrix.filter((entry) => entry?.available).length
  const hasWorkingHours =
    Boolean(workingWindow) &&
    Number.isFinite(workingWindow?.startMin) &&
    Number.isFinite(workingWindow?.endMin) &&
    workingWindow.startMin < workingWindow.endMin

  return {
    date: dateISO,
    status: !hasWorkingHours ? 'off' : availableCount > 0 ? 'available' : 'full',
    hasWorkingHours,
    hasAvailableSlots: availableCount > 0,
    availableCount,
    slotCount: slotMatrix.length,
    reason: !hasWorkingHours ? 'off' : availableCount > 0 ? 'available' : 'full',
  }
}

export const buildDateSummaries = async ({
  supabase,
  startDate,
  days = DEFAULT_DAYS,
  serviceId,
  staffId,
  locationId,
}) => {
  const normalizedStartDate = normalizeDateISO(startDate) || getTodayISO()
  const safeDays = Math.min(parsePositiveInt(days, DEFAULT_DAYS), MAX_DAYS)
  const dates = await Promise.all(
    Array.from({ length: safeDays }, (_, index) =>
      buildDateSummary({
        supabase,
        dateISO: addDays(normalizedStartDate, index),
        serviceId,
        staffId,
        locationId,
      }),
    ),
  )

  return {
    startDate: normalizedStartDate,
    days: safeDays,
    dates,
  }
}

export const buildMonthSummaries = async ({
  supabase,
  referenceDateISO,
  serviceId,
  staffId,
  locationId,
}) => {
  const { monthStartISO, monthEndISO, daysInMonth } = getMonthWindow(referenceDateISO)
  const result = await buildDateSummaries({
    supabase,
    startDate: monthStartISO,
    days: daysInMonth,
    serviceId,
    staffId,
    locationId,
  })

  return {
    monthStartDate: monthStartISO,
    monthEndDate: monthEndISO,
    daysInMonth,
    ...result,
  }
}

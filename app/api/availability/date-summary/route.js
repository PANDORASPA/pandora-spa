import { NextResponse } from 'next/server'
import { getWorkingWindow } from '../../../../lib/booking/availability'
import {
  evaluatePhase2Availability,
  getStaffProviderGroupIds,
  holidayMatchesScope,
  loadPhase2Context,
} from '../../../../lib/booking/phase2'
import { getServiceClient } from '../../../../lib/supabase/service'

const MAX_DAYS = 21
const DEFAULT_DAYS = 14

const normalizeDateISO = (value) => {
  const text = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

const getTodayISO = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

const addDays = (dateISO, offset) => {
  const date = new Date(`${dateISO}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const parseOptionalNumber = (value) => {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const buildDateSummary = async ({ supabase, dateISO, serviceId, staffId, locationId }) => {
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

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const serviceId = parsePositiveInt(url.searchParams.get('serviceId'), null)
    const staffId = parsePositiveInt(url.searchParams.get('staffId'), null)
    const startDate = normalizeDateISO(url.searchParams.get('startDate')) || getTodayISO()
    const days = Math.min(parsePositiveInt(url.searchParams.get('days'), DEFAULT_DAYS), MAX_DAYS)
    const locationId = parseOptionalNumber(url.searchParams.get('locationId'))

    if (!serviceId || !staffId) {
      return NextResponse.json({ error: 'Missing serviceId or staffId.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const dates = await Promise.all(
      Array.from({ length: days }, (_, index) =>
        buildDateSummary({
          supabase,
          dateISO: addDays(startDate, index),
          serviceId,
          staffId,
          locationId,
        }),
      ),
    )

    return NextResponse.json({ dates }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

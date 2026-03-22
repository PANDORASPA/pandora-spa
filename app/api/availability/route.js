import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../lib/supabase/service'
import { loadPhase2Context, evaluatePhase2Availability, normalizeOptionalNumber, Phase2Error } from '../../../lib/booking/phase2'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const dateISO = url.searchParams.get('date')
    const serviceId = Number(url.searchParams.get('serviceId'))
    const staffId = normalizeOptionalNumber(url.searchParams.get('staffId'))
    const includeDebug = url.searchParams.get('debug') === '1'

    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      return NextResponse.json({ error: 'Invalid appointment date.' }, { status: 400 })
    }
    if (!Number.isFinite(serviceId)) {
      return NextResponse.json({ error: 'Missing service.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const context = await loadPhase2Context({
      supabase,
      dateISO,
      serviceId,
      requestedLocationId: null,
      requestedStaffId: staffId,
      ignoreLocationProviderRules: true,
    })

    const evaluation = evaluatePhase2Availability(context, { requestedStaffId: staffId })
    const dateSummary = evaluation.dateSummary || {}
    const availableCount = Number(dateSummary.availableCount || 0)
    const workingCount = Number(dateSummary.workingCount || 0)
    const resourceBlockedCount = Number(dateSummary.resourceBlockedCount || 0)
    const dateSummaryReason = availableCount > 0
          ? 'available'
          : resourceBlockedCount > 0
            ? 'resource_full'
            : workingCount > 0
              ? 'fully_booked'
              : 'staff_unavailable'

    if (staffId) {
      const staffSlotMatrix = evaluation.staffSlotMatrix[staffId] || []
      const staffDiagnostics = evaluation.staffDiagnostics?.[staffId] || {}
      const resourceBlockedTimes = Array.isArray(staffDiagnostics.resourceBlockedTimes) ? staffDiagnostics.resourceBlockedTimes : []
      const baseBlockedTimes = Array.isArray(staffDiagnostics.baseBlockedTimes) ? staffDiagnostics.baseBlockedTimes : []
      const availableTimes = evaluation.staffAvailability[staffId] || []
      return NextResponse.json(
        {
          slots: availableTimes,
          slotMatrix: staffSlotMatrix,
          locationId: evaluation.locationId,
          locationSelectionRequired: evaluation.locationSelectionRequired,
          requestedStaffEligible: evaluation.requestedStaffEligible,
          dateSummary,
          dateSummaryReason,
          ...(includeDebug
            ? {
                debug: {
                  candidateCount: staffSlotMatrix.length,
                  availableSlotCount: availableTimes.length,
                  workingSlotCount: availableTimes.length + resourceBlockedTimes.length,
                  baseBlockedCount: baseBlockedTimes.length,
                  resourceBlockedCount: resourceBlockedTimes.length,
                  holidayBlocked: Boolean(staffDiagnostics.holidayBlocked),
                  baseBlockedTimes,
                  resourceBlockedTimes,
                },
              }
            : {}),
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
        {
          slots: evaluation.slots,
          slotMatrix: evaluation.slotMatrix,
          staffAvailability: evaluation.staffAvailability,
          locationId: evaluation.locationId,
          locationSelectionRequired: evaluation.locationSelectionRequired,
          dateSummary: evaluation.dateSummary,
        },
        { status: 200 }
      )
  } catch (error) {
    if (error instanceof Phase2Error) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: error.status })
    }
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

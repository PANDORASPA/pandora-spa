import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../lib/supabase/service'
import { loadPhase2Context, evaluatePhase2Availability, normalizeOptionalNumber, Phase2Error } from '../../../lib/booking/phase2'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const dateISO = url.searchParams.get('date')
    const serviceId = Number(url.searchParams.get('serviceId'))
    const staffId = normalizeOptionalNumber(url.searchParams.get('staffId'))
    const requestedLocationId = normalizeOptionalNumber(url.searchParams.get('locationId'))

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
      requestedLocationId,
      requestedStaffId: staffId,
    })

    const evaluation = evaluatePhase2Availability(context, { requestedStaffId: staffId })
    const dateSummary = evaluation.dateSummary || {}
    const availableCount = Number(dateSummary.availableCount || 0)
    const workingCount = Number(dateSummary.workingCount || 0)
    const resourceBlockedCount = Number(dateSummary.resourceBlockedCount || 0)
    const dateSummaryReason = evaluation.locationSelectionRequired
      ? 'location_required'
      : staffId && !evaluation.requestedStaffEligible
        ? 'provider_mismatch'
        : availableCount > 0
          ? 'available'
          : resourceBlockedCount > 0
            ? 'resource_full'
            : workingCount > 0
              ? 'fully_booked'
              : 'staff_unavailable'

    if (staffId) {
      return NextResponse.json(
        {
          slots: evaluation.staffAvailability[staffId] || [],
          slotMatrix: evaluation.staffSlotMatrix[staffId] || [],
          locationId: evaluation.locationId,
          locationSelectionRequired: evaluation.locationSelectionRequired,
          requestedStaffEligible: evaluation.requestedStaffEligible,
          dateSummary,
          dateSummaryReason,
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

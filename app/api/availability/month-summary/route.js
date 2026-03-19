import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'
import {
  buildMonthSummaries,
  normalizeDateISO,
  parseOptionalNumber,
  parsePositiveInt,
  resolveMonthReferenceISO,
} from '../_summary'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const serviceId = parsePositiveInt(url.searchParams.get('serviceId'), null)
    const staffId = parsePositiveInt(url.searchParams.get('staffId'), null)
    const locationId = parseOptionalNumber(url.searchParams.get('locationId'))
    const referenceDateISO = resolveMonthReferenceISO({
      startDate: normalizeDateISO(url.searchParams.get('startDate')),
      year: url.searchParams.get('year'),
      month: url.searchParams.get('month'),
    })

    if (!serviceId || !staffId) {
      return NextResponse.json({ error: 'Missing serviceId or staffId.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const monthSummary = await buildMonthSummaries({
      supabase,
      referenceDateISO,
      serviceId,
      staffId,
      locationId,
    })

    return NextResponse.json(monthSummary, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

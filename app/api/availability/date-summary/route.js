import { NextResponse } from 'next/server'
import { guardReadRequest } from '../../../../lib/security/request-guards'
import { getServiceClient } from '../../../../lib/supabase/service'
import {
  buildDateSummaries,
  getTodayISO,
  normalizeDateISO,
  parsePositiveInt,
} from '../_summary'

const MAX_DAYS = 21
const DEFAULT_DAYS = 14
const MAX_LOOKAHEAD_DAYS = 180

const isStartDateWithinPublicWindow = (dateISO) => {
  const target = new Date(`${dateISO}T00:00:00.000Z`)
  if (Number.isNaN(target.getTime())) return false
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const max = new Date(today)
  max.setUTCDate(max.getUTCDate() + MAX_LOOKAHEAD_DAYS)
  return target >= today && target <= max
}

export async function GET(request) {
  try {
    const guardError = await guardReadRequest(request, {
      rateLimit: { scope: 'availability.date-summary', limit: 90, windowMs: 60_000 },
    })
    if (guardError) return guardError

    const url = new URL(request.url)
    const serviceId = parsePositiveInt(url.searchParams.get('serviceId'), null)
    const staffId = parsePositiveInt(url.searchParams.get('staffId'), null)
    const startDate = normalizeDateISO(url.searchParams.get('startDate')) || getTodayISO()
    const days = Math.min(parsePositiveInt(url.searchParams.get('days'), DEFAULT_DAYS), MAX_DAYS)
    if (!serviceId || !staffId) {
      return NextResponse.json({ error: 'Missing serviceId or staffId.' }, { status: 400 })
    }
    if (!isStartDateWithinPublicWindow(startDate)) {
      return NextResponse.json({ error: 'Start date is outside the public booking window.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { dates } = await buildDateSummaries({
      supabase,
      startDate,
      days,
      serviceId,
      staffId,
      locationId: null,
      ignoreLocationProviderRules: true,
    })

    return NextResponse.json(
      { dates },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
      },
    )
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

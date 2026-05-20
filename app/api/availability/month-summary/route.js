import { NextResponse } from 'next/server'
import { guardReadRequest } from '../../../../lib/security/request-guards'
import { getServiceClient } from '../../../../lib/supabase/service'
import {
  buildMonthSummaries,
  normalizeDateISO,
  parsePositiveInt,
  resolveMonthReferenceISO,
} from '../_summary'

const MAX_LOOKAHEAD_DAYS = 180

const isReferenceWithinPublicWindow = (dateISO) => {
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
      rateLimit: { scope: 'availability.month-summary', limit: 90, windowMs: 60_000 },
    })
    if (guardError) return guardError

    const url = new URL(request.url)
    const serviceId = parsePositiveInt(url.searchParams.get('serviceId'), null)
    const staffId = parsePositiveInt(url.searchParams.get('staffId'), null)
    const referenceDateISO = resolveMonthReferenceISO({
      startDate: normalizeDateISO(url.searchParams.get('startDate')),
      year: url.searchParams.get('year'),
      month: url.searchParams.get('month'),
    })

    if (!serviceId || !staffId) {
      return NextResponse.json({ error: 'Missing serviceId or staffId.' }, { status: 400 })
    }
    if (!isReferenceWithinPublicWindow(referenceDateISO)) {
      return NextResponse.json({ error: 'Month is outside the public booking window.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const { data: versionRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'availability_cache_version')
      .maybeSingle()

    const monthSummary = await buildMonthSummaries({
      supabase,
      referenceDateISO,
      serviceId,
      staffId,
      locationId: null,
      cacheVersion: String(versionRow?.value || ''),
      ignoreLocationProviderRules: true,
    })

    return NextResponse.json(monthSummary, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

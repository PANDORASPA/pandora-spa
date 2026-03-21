import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'
import {
  buildDateSummaries,
  getTodayISO,
  normalizeDateISO,
  parsePositiveInt,
} from '../_summary'

const MAX_DAYS = 21
const DEFAULT_DAYS = 14

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const serviceId = parsePositiveInt(url.searchParams.get('serviceId'), null)
    const staffId = parsePositiveInt(url.searchParams.get('staffId'), null)
    const startDate = normalizeDateISO(url.searchParams.get('startDate')) || getTodayISO()
    const days = Math.min(parsePositiveInt(url.searchParams.get('days'), DEFAULT_DAYS), MAX_DAYS)
    if (!serviceId || !staffId) {
      return NextResponse.json({ error: 'Missing serviceId or staffId.' }, { status: 400 })
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

    return NextResponse.json({ dates }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

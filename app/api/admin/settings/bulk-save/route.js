import { NextResponse } from 'next/server'
import { loadAdminSettingsContext } from '../_context'

const normalizeEntries = (settings = {}) =>
  Object.entries(settings || {})
    .map(([key, value]) => ({
      key: String(key || '').trim(),
      value: value == null ? '' : String(value),
    }))
    .filter((row) => row.key)

export async function POST(request) {
  try {
    const context = await loadAdminSettingsContext()
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status })

    const body = await request.json().catch(() => ({}))
    const rows = normalizeEntries(body?.settings)
    if (rows.length === 0) return NextResponse.json({ success: true, settings: {} }, { status: 200 })

    const { data, error } = await context.serviceSupabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' })
      .select('key,value')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const settings = (data || []).reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {})

    return NextResponse.json({ success: true, settings }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

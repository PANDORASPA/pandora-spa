import { NextResponse } from 'next/server'
import { buildTicketImportPreview, loadAdminContext } from '../_helpers'

export async function POST(request) {
  try {
    const context = await loadAdminContext()
    if (context.error) {
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    const body = await request.json().catch(() => ({}))
    const csvText = String(body?.csvText || body?.csv || '')
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'CSV content is required.' }, { status: 400 })
    }

    const preview = await buildTicketImportPreview({ supabase: context.supabase, csvText })
    return NextResponse.json(preview, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

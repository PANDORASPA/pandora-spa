import { NextResponse } from 'next/server'
import { buildTicketImportPreview, loadAdminContext } from '../_helpers'
import { guardMutationRequest } from '../../../../../lib/security/request-guards'

export async function POST(request) {
  try {
    const guardError = await guardMutationRequest(request, {
      rateLimit: { scope: 'admin.tickets.import-preview', limit: 12, windowMs: 60_000 },
    })
    if (guardError) return guardError

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

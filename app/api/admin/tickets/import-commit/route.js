import { NextResponse } from 'next/server'
import { tryWriteAdminAuditLog } from '../../../../../lib/admin-audit'
import { buildTicketImportPreview, loadAdminContext } from '../_helpers'
import { guardMutationRequest } from '../../../../../lib/security/request-guards'

export async function POST(request) {
  try {
    const guardError = await guardMutationRequest(request, {
      rateLimit: { scope: 'admin.tickets.import-commit', limit: 8, windowMs: 60_000 },
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
    if (preview.errors?.length) {
      return NextResponse.json({ error: preview.errors.join('; '), preview }, { status: 400 })
    }

    const invalidRows = (preview.rows || []).filter((row) => !row.valid)
    if (invalidRows.length > 0) {
      return NextResponse.json({ error: 'CSV contains invalid rows.', preview }, { status: 400 })
    }

    const results = []
    for (const row of preview.rows || []) {
      const { data: inserted, error: insertError } = await context.supabase
        .from('user_tickets')
        .insert({
          member_user_id: row.member.id,
          ticket_id: row.ticket.id,
          ticket_name: row.ticket.name,
          remaining_count: row.remaining_count,
          expiry_date: row.expiry_date,
        })
        .select('*')
        .single()

      if (insertError) {
        results.push({ rowNumber: row.rowNumber, ok: false, error: insertError.message })
        continue
      }

      const ledgerRes = await context.supabase.from('ticket_redemptions').insert({
        user_ticket_id: inserted.id,
        member_user_id: row.member.id,
        delta: row.remaining_count,
        reason: 'legacy_import',
        note: row.note || `Imported CSV row ${row.rowNumber}`,
        created_by: context.user.id,
      })

      const ledgerMissing = /ticket_redemptions|schema cache|relation|does not exist/i.test(String(ledgerRes.error?.message || ''))
      results.push({
        rowNumber: row.rowNumber,
        ok: !ledgerRes.error || ledgerMissing,
        userTicket: inserted,
        error: ledgerMissing ? null : ledgerRes.error?.message || null,
        warning: ledgerMissing ? 'Imported package balance, but ledger table is not available until the latest migration is applied.' : null,
      })
    }

    const failed = results.filter((result) => !result.ok)
    const summary = {
      totalRows: results.length,
      importedRows: results.filter((result) => result.ok).length,
      failedRows: failed.length,
    }

    await tryWriteAdminAuditLog({
      supabase: context.supabase,
      request,
      actorUserId: context.user?.id,
      action: 'tickets.import_commit',
      targetTable: 'user_tickets',
      targetId: `csv:${Date.now()}`,
      afterData: { summary },
    })

    return NextResponse.json(
      {
        success: failed.length === 0,
        summary,
        results,
      },
      { status: failed.length ? 207 : 200 },
    )
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

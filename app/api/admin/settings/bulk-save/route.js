import { NextResponse } from 'next/server'
import { tryWriteAdminAuditLog } from '../../../../../lib/admin-audit'
import { loadAdminSettingsContext } from '../_context'
import { guardMutationRequest } from '../../../../../lib/security/request-guards'

const SECRET_KEY_PATTERN = /(^|[._-])(secret|service[_-]?role|webhook[_-]?secret|private[_-]?key|api[_-]?key)($|[._-])/i

const normalizeEntries = (settings = {}) =>
  Object.entries(settings || {})
    .map(([key, value]) => ({
      key: String(key || '').trim(),
      value: value == null ? '' : String(value),
    }))
    .filter((row) => row.key)

export async function POST(request) {
  try {
    const guardError = await guardMutationRequest(request, {
      rateLimit: { scope: 'admin.settings.bulk-save', limit: 30, windowMs: 60_000 },
    })
    if (guardError) return guardError

    const context = await loadAdminSettingsContext()
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status })

    const body = await request.json().catch(() => ({}))
    const rows = normalizeEntries(body?.settings)
    if (rows.length === 0) return NextResponse.json({ success: true, settings: {} }, { status: 200 })
    const blockedRows = rows.filter((row) => SECRET_KEY_PATTERN.test(row.key))
    if (blockedRows.length > 0) {
      return NextResponse.json(
        {
          error: 'Secret keys must be configured in Vercel Environment Variables, not saved in admin settings.',
          blockedKeys: blockedRows.map((row) => row.key),
        },
        { status: 400 },
      )
    }

    const { data, error } = await context.serviceSupabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' })
      .select('key,value')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const settings = (data || []).reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {})

    await tryWriteAdminAuditLog({
      supabase: context.serviceSupabase,
      request,
      actorUserId: context.user?.id,
      action: 'settings.bulk_save',
      targetTable: 'settings',
      targetId: rows.map((row) => row.key).join(','),
      afterData: settings,
    })

    return NextResponse.json({ success: true, settings }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

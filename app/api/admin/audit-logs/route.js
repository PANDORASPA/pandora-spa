import { NextResponse } from 'next/server'
import { guardReadRequest } from '../../../../lib/security/request-guards'
import { loadAdminSettingsContext } from '../settings/_context'

export async function GET(request) {
  try {
    const guardError = await guardReadRequest(request, {
      rateLimit: { scope: 'admin.audit-logs.get', limit: 60, windowMs: 60_000 },
    })
    if (guardError) return guardError

    const context = await loadAdminSettingsContext()
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status })

    const { data, error } = await context.serviceSupabase
      .from('admin_audit_logs')
      .select('id,actor_user_id,action,target_table,target_id,ip,user_agent,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, logs: data || [] }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const normalizeProfilePayload = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      id: row?.id,
      email: row?.email || null,
      full_name: row?.full_name || null,
      phone: row?.phone || null,
      is_admin: row?.is_admin === true,
    }))
    .filter((row) => row.id)

export async function POST(request) {
  try {
    const authSupabase = getServerClient()
    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401 })
    }

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = getServiceClient()
    const adminProfileRes = await serviceSupabase
      .from('member_profiles')
      .select('id,is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (adminProfileRes.error) {
      return NextResponse.json({ error: adminProfileRes.error.message }, { status: 500 })
    }

    if (!adminProfileRes.data?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const payload = normalizeProfilePayload(body?.profiles)

    if (payload.length === 0) {
      return NextResponse.json({ success: true, profiles: [] }, { status: 200 })
    }

    const upsertRes = await serviceSupabase
      .from('member_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id,email,full_name,phone,is_admin')

    if (upsertRes.error) {
      return NextResponse.json({ error: upsertRes.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, profiles: upsertRes.data || [] }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

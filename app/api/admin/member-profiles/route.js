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

const loadAdminRequestContext = async () => {
  const authSupabase = getServerClient()
  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser()

  if (userError) {
    return { error: userError.message, status: 401, user: null, serviceSupabase: null }
  }

  if (!user?.id) {
    return { error: 'Unauthorized', status: 401, user: null, serviceSupabase: null }
  }

  const serviceSupabase = getServiceClient()
  const adminProfileRes = await serviceSupabase
    .from('member_profiles')
    .select('id,is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (adminProfileRes.error) {
    return { error: adminProfileRes.error.message, status: 500, user: null, serviceSupabase: null }
  }

  if (!adminProfileRes.data?.is_admin) {
    return { error: 'Forbidden', status: 403, user: null, serviceSupabase: null }
  }

  return { error: null, status: 200, user, serviceSupabase }
}

const enrichProfilesWithAuth = async (serviceSupabase, profiles = []) => {
  const rows = Array.isArray(profiles) ? profiles : []
  const diagnostics = await Promise.all(
    rows.map(async (profile) => {
      try {
        const authResult = await serviceSupabase.auth.admin.getUserById(profile.id)
        const authUser = authResult?.data?.user || null
        return {
          ...profile,
          auth_user_exists: Boolean(authUser?.id),
          auth_email: authUser?.email || null,
        }
      } catch {
        return {
          ...profile,
          auth_user_exists: false,
          auth_email: null,
        }
      }
    }),
  )

  return diagnostics
}

export async function GET() {
  try {
    const context = await loadAdminRequestContext()
    if (context.error) {
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    const profileRes = await context.serviceSupabase
      .from('member_profiles')
      .select('id,email,full_name,phone,is_admin')
      .order('email')

    if (profileRes.error) {
      return NextResponse.json({ error: profileRes.error.message }, { status: 500 })
    }

    const diagnostics = await enrichProfilesWithAuth(context.serviceSupabase, profileRes.data || [])
    return NextResponse.json({ success: true, profiles: diagnostics }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const context = await loadAdminRequestContext()
    if (context.error) {
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    const body = await request.json().catch(() => ({}))
    const payload = normalizeProfilePayload(body?.profiles)

    if (payload.length === 0) {
      return NextResponse.json({ success: true, profiles: [] }, { status: 200 })
    }

    const upsertRes = await context.serviceSupabase
      .from('member_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id,email,full_name,phone,is_admin')

    if (upsertRes.error) {
      return NextResponse.json({ error: upsertRes.error.message }, { status: 500 })
    }

    const diagnostics = await enrichProfilesWithAuth(context.serviceSupabase, upsertRes.data || [])
    return NextResponse.json({ success: true, profiles: diagnostics }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

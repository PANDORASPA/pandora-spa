import { NextResponse } from 'next/server'
import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const normalizeProfilePayload = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      id: String(row?.id || '').trim(),
      email: row?.email ? String(row.email).trim().toLowerCase() : null,
      full_name: row?.full_name ? String(row.full_name).trim() : null,
      phone: row?.phone ? String(row.phone).trim() : null,
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
  const adminProfileRes = await serviceSupabase.from('member_profiles').select('id,is_admin').eq('id', user.id).maybeSingle()

  if (adminProfileRes.error) {
    return { error: adminProfileRes.error.message, status: 500, user: null, serviceSupabase: null }
  }

  if (!adminProfileRes.data?.is_admin) {
    return { error: 'Forbidden', status: 403, user: null, serviceSupabase: null }
  }

  return { error: null, status: 200, user, serviceSupabase }
}

const buildAccountDiagnostic = ({ profile, authUser }) => {
  const authEmail = authUser?.email || null
  const profileEmail = profile?.email || null
  const hasProfileCore = Boolean(profile?.full_name && profile?.phone && (profileEmail || authEmail))
  const authUserExists = Boolean(authUser?.id)
  const accountStatus = !authUserExists ? 'profile_only' : hasProfileCore ? 'ready' : 'profile_incomplete'

  return {
    ...profile,
    auth_user_exists: authUserExists,
    auth_email: authEmail,
    account_status: accountStatus,
    can_access_admin: authUserExists && hasProfileCore && profile?.is_admin === true,
  }
}

const enrichProfilesWithAuth = async (serviceSupabase, profiles = []) => {
  const rows = Array.isArray(profiles) ? profiles : []

  return Promise.all(
    rows.map(async (profile) => {
      try {
        const authResult = await serviceSupabase.auth.admin.getUserById(profile.id)
        const authUser = authResult?.data?.user || null
        return buildAccountDiagnostic({ profile, authUser })
      } catch {
        return buildAccountDiagnostic({ profile, authUser: null })
      }
    }),
  )
}

const validateAdminUpsertPayload = async (serviceSupabase, payload = []) => {
  const diagnostics = await Promise.all(
    payload.map(async (profile) => {
      try {
        const authResult = await serviceSupabase.auth.admin.getUserById(profile.id)
        const authUser = authResult?.data?.user || null
        return buildAccountDiagnostic({ profile, authUser })
      } catch {
        return buildAccountDiagnostic({ profile, authUser: null })
      }
    }),
  )

  const invalidAdmins = diagnostics.filter(
    (profile) => profile?.is_admin === true && (!profile?.auth_user_exists || profile?.account_status !== 'ready'),
  )

  if (invalidAdmins.length > 0) {
    const labels = invalidAdmins
      .map((profile) => profile?.email || profile?.auth_email || profile?.full_name || profile?.id)
      .filter(Boolean)
    throw new Error(`以下帳號未完成註冊或沒有對應登入帳號，不能開通管理員：${labels.join('、')}`)
  }

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

    await validateAdminUpsertPayload(context.serviceSupabase, payload)

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


import { getServerClient } from '../../../../lib/supabase/server'
import { getServiceClient } from '../../../../lib/supabase/service'

export async function loadAdminSettingsContext() {
  const authSupabase = getServerClient()
  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser()

  if (userError) return { error: userError.message, status: 401 }
  if (!user?.id) return { error: 'Unauthorized', status: 401 }

  const serviceSupabase = getServiceClient()
  const adminProfileRes = await serviceSupabase.from('member_profiles').select('id,is_admin').eq('id', user.id).maybeSingle()

  if (adminProfileRes.error) return { error: adminProfileRes.error.message, status: 500 }
  if (!adminProfileRes.data?.is_admin) return { error: 'Forbidden', status: 403 }

  return { error: null, status: 200, user, serviceSupabase }
}

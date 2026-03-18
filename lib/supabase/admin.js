import { getServerClient } from './server'

export async function getAdminState() {
  const supabase = getServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { user: null, isAdmin: false, profile: null }
  }

  const { data: profile } = await supabase
    .from('member_profiles')
    .select('id,email,full_name,phone,is_admin')
    .eq('id', user.id)
    .maybeSingle()

  return {
    user,
    profile: profile || null,
    isAdmin: Boolean(profile?.is_admin),
  }
}

import { NextResponse } from 'next/server'
import { getServerClient } from '../../../lib/supabase/server'
import { getServiceClient } from '../../../lib/supabase/service'

const getSafeNextPath = (nextValue) => {
  if (!nextValue || typeof nextValue !== 'string') return '/account'
  return nextValue.startsWith('/') ? nextValue : '/account'
}

const syncMemberProfile = async (user) => {
  if (!user?.id) return { ok: false }

  const serviceSupabase = getServiceClient()
  const metadata = user.user_metadata || {}
  const fullName = String(metadata.full_name || '').trim()
  const phone = String(metadata.phone || '').trim()

  const { error } = await serviceSupabase.from('member_profiles').upsert(
    {
      id: user.id,
      email: user.email || null,
      full_name: fullName || null,
      phone: phone || null,
    },
    { onConflict: 'id' },
  )

  if (error) {
    return { ok: false, error }
  }

  return { ok: true }
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'))
  const redirectUrl = new URL(nextPath, requestUrl.origin)

  try {
    const supabase = getServerClient()
    const code = requestUrl.searchParams.get('code')
    const tokenHash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectTo', nextPath)
        redirectUrl.searchParams.set('message', 'confirm_failed')
        return NextResponse.redirect(redirectUrl)
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (error) {
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectTo', nextPath)
        redirectUrl.searchParams.set('message', 'confirm_failed')
        return NextResponse.redirect(redirectUrl)
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', nextPath)
      redirectUrl.searchParams.set('message', 'confirm_failed')
      return NextResponse.redirect(redirectUrl)
    }

    const profileSync = await syncMemberProfile(user)
    if (!profileSync.ok) {
      redirectUrl.pathname = '/account'
      redirectUrl.searchParams.set('message', 'profile_incomplete')
      return NextResponse.redirect(redirectUrl)
    }
  } catch {
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', nextPath)
    redirectUrl.searchParams.set('message', 'confirm_failed')
  }

  return NextResponse.redirect(redirectUrl)
}

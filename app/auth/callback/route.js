import { NextResponse } from 'next/server'
import { getServerClient } from '../../../lib/supabase/server'

const getSafeNextPath = (nextValue) => {
  if (!nextValue || typeof nextValue !== 'string') return '/account'
  return nextValue.startsWith('/') ? nextValue : '/account'
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
      }
      return NextResponse.redirect(redirectUrl)
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (error) {
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirectTo', nextPath)
        redirectUrl.searchParams.set('message', 'confirm_failed')
      }
      return NextResponse.redirect(redirectUrl)
    }
  } catch {
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', nextPath)
    redirectUrl.searchParams.set('message', 'confirm_failed')
  }

  return NextResponse.redirect(redirectUrl)
}

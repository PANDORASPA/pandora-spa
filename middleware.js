import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const isAdminRoute = (pathname) => pathname === '/admin' || pathname.startsWith('/admin/')
const isMemberOnlyRoute = (pathname) =>
  pathname === '/account' ||
  pathname.startsWith('/account/') ||
  pathname === '/booking'

export async function middleware(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let response = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const fullPath = pathname + request.nextUrl.search

  if (pathname === '/admin/login') {
    if (!user) return response

    const { data: profile } = await supabase
      .from('member_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }

    return response
  }

  if (isAdminRoute(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirectTo', fullPath)
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('member_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/account'
      url.searchParams.set('denied', 'admin')
      return NextResponse.redirect(url)
    }

    return response
  }

  if (isMemberOnlyRoute(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', fullPath)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

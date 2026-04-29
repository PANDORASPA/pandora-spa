'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    let supabase
    try {
      supabase = getBrowserClient()
    } catch {
      return
    }

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setAuthUser(user || null)
      if (!user) {
        setDisplayName('')
        return
      }

      const { data: profile } = await supabase.from('member_profiles').select('full_name').eq('id', user.id).maybeSingle()
      setDisplayName(profile?.full_name || user.email || '')
    }

    loadUser()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setAuthUser(user)
      setDisplayName(user?.email || '')
      if (user) {
        supabase
          .from('member_profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setDisplayName(profile?.full_name || user.email || '')
          })
      }
    })

    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const links = [
    { href: '/', label: '首頁' },
    { href: '/services', label: '頭皮護理' },
    { href: '/tickets', label: '套票' },
    { href: '/booking', label: '預約' },
    { href: '/products', label: '護理產品' },
    { href: '/articles', label: '護理文章' },
    { href: '/faq', label: 'FAQ' },
  ]

  const closeMenu = () => setMobileMenuOpen(false)
  const isActive = (href) => pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`))

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link href="/" className="logo" onClick={closeMenu}>
            PANDORA HEAD SPA
            <span>Self-service scalp care</span>
          </Link>

          <div className="nav-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''}>
                {link.label}
              </Link>
            ))}
            {authUser ? (
              <Link href="/account" className="nav-login">
                {displayName || '會員中心'}
              </Link>
            ) : (
              <Link href={`/login?redirectTo=${encodeURIComponent(pathname || '/')}`} className="nav-login">
                登入
              </Link>
            )}
          </div>

          <button className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen((current) => !current)} aria-label="開啟選單">
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {mobileMenuOpen ? <div className="mobile-menu-overlay active" onClick={closeMenu} aria-hidden="true" /> : null}

      {mobileMenuOpen ? (
        <div className="mobile-menu active">
          <div className="mobile-menu-header">
            <span>PANDORA HEAD SPA</span>
            <button className="mobile-menu-close" onClick={closeMenu} aria-label="關閉選單">
              ×
            </button>
          </div>

          <div className="mobile-menu-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? 'active' : ''} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}

            <div className="mobile-menu-divider" />

            {authUser ? (
              <Link href="/account" onClick={closeMenu}>
                會員中心{displayName ? `：${displayName}` : ''}
              </Link>
            ) : (
              <Link href={`/login?redirectTo=${encodeURIComponent(pathname || '/')}`} onClick={closeMenu}>
                會員登入
              </Link>
            )}

            <Link href="/admin" onClick={closeMenu}>
              管理後台
            </Link>
          </div>
        </div>
      ) : null}
    </>
  )
}

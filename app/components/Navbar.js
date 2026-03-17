'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let supabase
    try {
      supabase = getBrowserClient()
    } catch (e) {
      return
    }

    const load = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user || null
      setAuthUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('member_profiles')
          .select('full_name, is_admin')
          .eq('id', user.id)
          .single()
        setDisplayName(profile?.full_name || user.email || '')
        setIsAdmin(!!profile?.is_admin)
      } else {
        setDisplayName('')
        setIsAdmin(false)
      }
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setAuthUser(user)
      setDisplayName(user?.email || '')
      if (user) {
        supabase
          .from('member_profiles')
          .select('full_name, is_admin')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            setDisplayName(profile?.full_name || user.email || '')
            setIsAdmin(!!profile?.is_admin)
          })
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const navLinks = [
    { href: '/', label: '棣栭爜' },
    { href: '/services', label: '鏈嶅嫏鍍圭洰' },
    { href: '/booking', label: '闋愮磩鏈嶅嫏' },
    { href: '/articles', label: '楂瀷灏堟瑒' },
    { href: '/faq', label: '甯歌鍟忛' },
  ]

  const closeMenu = () => setMobileMenuOpen(false)
  const adminHref = authUser ? '/admin' : '/login?redirectTo=%2Fadmin'

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link href="/" className="logo" onClick={closeMenu}>
            VIVA HAIR
          </Link>

          <div className="nav-links">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
                {link.label}
              </Link>
            ))}
            <Link href={adminHref} className="nav-admin">
              {isAdmin ? 'Admin' : 'Admin Login'}
            </Link>
            {authUser ? (
              <Link href="/account" className="nav-login" style={{ background: '#f3f4f6', color: '#333', border: '1px solid #e5e5e5' }}>
                馃懁 {displayName || '鏈冨摗涓績'}
              </Link>
            ) : (
              <Link href={`/login?redirectTo=${encodeURIComponent(pathname || '/')}`} className="nav-login">
                鐧诲叆
              </Link>
            )}
          </div>

          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="閬稿柈"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={closeMenu} />

      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <span style={{ fontWeight: 700, color: '#A68B6A', fontSize: '18px' }}>VIVA HAIR</span>
          <button className="mobile-menu-close" onClick={closeMenu}>鉁?/button>
        </div>

        <div className="mobile-menu-links">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}

          <div style={{ height: '1px', background: '#eee', margin: '12px 0' }} />

          {authUser ? (
            <Link href="/account" onClick={closeMenu}>
              馃懁 鏈冨摗涓績 ({displayName || '鏈冨摗'})
            </Link>
          ) : (
            <Link href={`/login?redirectTo=${encodeURIComponent(pathname || '/')}`} onClick={closeMenu}>
              馃懁 鏈冨摗鐧诲叆
            </Link>
          )}

          <Link href={adminHref} onClick={closeMenu}>
            鈿欙笍 {isAdmin ? 'Admin' : 'Admin Login'}
          </Link>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #eee', marginTop: 'auto' }}>
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            涔濋緧澶瓙閫氳彍琛?7A 1妯?
          </p>
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '4px' }}>
            漏 2026 VIVA HAIR
          </p>
        </div>
      </div>
    </>
  )
}

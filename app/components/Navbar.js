'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState(null)

  useEffect(() => {
    let supabase
    try {
      supabase = getBrowserClient()
    } catch (error) {
      return
    }

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setAuthUser(user || null)
    }

    syncUser()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
    })

    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [])

  const navLinks = [
    { href: '/', label: '首頁' },
    { href: '/services', label: '服務價目' },
    { href: '/booking', label: '預約服務' },
    { href: '/faq', label: '常見問題' },
  ]

  const memberHref = authUser ? '/account' : `/login?redirectTo=${encodeURIComponent('/account')}`
  const memberLabel = authUser ? '我的預約' : '會員登入'

  const closeMenu = () => setMobileMenuOpen(false)

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
            <Link href={memberHref} className="nav-login">
              {memberLabel}
            </Link>
          </div>

          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Menu"
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
          <button className="mobile-menu-close" onClick={closeMenu} aria-label="Close menu">
            ×
          </button>
        </div>

        <div className="mobile-menu-links">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}

          <div style={{ height: '1px', background: '#eee', margin: '12px 0' }} />

          <Link href={memberHref} onClick={closeMenu}>
            {memberLabel}
          </Link>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #eee', marginTop: 'auto' }}>
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>VIVA HAIR</p>
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '4px' }}>
            © 2026 VIVA HAIR
          </p>
        </div>
      </div>
    </>
  )
}

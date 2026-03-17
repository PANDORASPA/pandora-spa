'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const supabase = getBrowserClient()

    const load = async () => {
      const { data } = await supabase.auth.getUser()
      setAuthUser(data?.user || null)
      if (data?.user) {
        const { data: profile } = await supabase.from('member_profiles').select('full_name').eq('id', data.user.id).single()
        setDisplayName(profile?.full_name || data.user.email || '')
      } else {
        setDisplayName('')
      }
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setAuthUser(user)
      setDisplayName(user?.email || '')
      if (user) {
        supabase.from('member_profiles').select('full_name').eq('id', user.id).single().then(({ data: profile }) => {
          setDisplayName(profile?.full_name || user.email || '')
        })
      }
    })

    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const navLinks = [
    { href: '/', label: '首頁' },
    { href: '/services', label: '服務價目' },
    { href: '/booking', label: '預約服務' },
    { href: '/articles', label: '髮型專欄' },
    { href: '/faq', label: '常見問題' },
  ]

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link href="/" className="logo" onClick={closeMenu}>
            VIVA HAIR
          </Link>
          
          {/* Desktop Navigation */}
          <div className="nav-links">
            {navLinks.map(link => (
              <Link 
                key={link.href} 
                href={link.href}
                className={pathname === link.href ? 'active' : ''}
              >
                {link.label}
              </Link>
            ))}
            {authUser ? (
              <Link href="/account" className="nav-login" style={{ background: '#f3f4f6', color: '#333', border: '1px solid #e5e5e5' }}>
                👤 {displayName || '會員中心'}
              </Link>
            ) : (
              <Link href={`/login?redirectTo=${encodeURIComponent(pathname || '/')}`} className="nav-login">登入</Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="選單"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <span style={{ fontWeight: 700, color: '#A68B6A', fontSize: '18px' }}>VIVA HAIR</span>
          <button className="mobile-menu-close" onClick={closeMenu}>✕</button>
        </div>
        
        <div className="mobile-menu-links">
          {navLinks.map(link => (
            <Link 
              key={link.href} 
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          
          <div style={{ height: '1px', background: '#eee', margin: '12px 0' }} />
          
          {authUser ? (
            <Link href="/account" onClick={closeMenu}>
              👤 會員中心 ({displayName || '會員'})
            </Link>
          ) : (
            <Link href={`/login?redirectTo=${encodeURIComponent(pathname || '/')}`} onClick={closeMenu}>
              👤 會員登入
            </Link>
          )}
          
          <Link href="/admin" onClick={closeMenu}>
            ⚙️ 管理後台
          </Link>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #eee', marginTop: 'auto' }}>
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            九龍太子通菜街17A 1樓
          </p>
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '4px' }}>
            © 2026 VIVA HAIR
          </p>
        </div>
      </div>
    </>
  )
}

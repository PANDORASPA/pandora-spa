'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    // Check for logged in user on mount
    const savedUser = localStorage.getItem('viva_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {}
    }

    // Listen for storage events (login/logout from other tabs/pages)
    const handleStorageChange = () => {
      const u = localStorage.getItem('viva_user')
      setUser(u ? JSON.parse(u) : null)
    }
    
    // Custom event for same-page updates
    const handleLocalLogin = () => handleStorageChange()
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('viva_login_update', handleLocalLogin)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('viva_login_update', handleLocalLogin)
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
            {user ? (
              <Link href="/profile" className="nav-login" style={{ background: '#f3f4f6', color: '#333', border: '1px solid #e5e5e5' }}>
                👤 {user.name}
              </Link>
            ) : (
              <Link href="/booking" className="nav-login">登入</Link>
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
          
          {user ? (
            <Link href="/profile" onClick={closeMenu}>
              👤 會員中心 ({user.name})
            </Link>
          ) : (
            <Link href="/booking" onClick={closeMenu}>
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

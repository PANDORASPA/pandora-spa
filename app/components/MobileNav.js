'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileNav() {
  const pathname = usePathname()
  
  // Don't show on admin page
  if (pathname === '/admin') return null

  const navItems = [
    { href: '/', icon: '🏠', label: '首頁' },
    { href: '/booking', icon: '📅', label: '預約' },
    { href: '/products', icon: '🛍️', label: '產品' },
    { href: '/login', icon: '👤', label: '我的' },
  ]

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => (
        <Link 
          key={item.href} 
          href={item.href}
          className={pathname === item.href ? 'active' : ''}
        >
          <span className="mobile-nav-icon">{item.icon}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

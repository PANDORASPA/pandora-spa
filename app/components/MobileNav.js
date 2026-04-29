'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileNav() {
  const pathname = usePathname()

  if (pathname === '/admin') return null

  const navItems = [
    { href: '/', icon: '⌂', label: '首頁' },
    { href: '/booking', icon: '◷', label: '預約' },
    { href: '/tickets', icon: '◇', label: '套票' },
    { href: '/account', icon: '◎', label: '我的' },
  ]

  const isActive = (href) => pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`))

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
          <span className="mobile-nav-icon">{item.icon}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

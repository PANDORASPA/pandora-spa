import './globals.css'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'VIVA HAIR - 髮型屋預約系統',
  description: '九龍太子通菜街17A 髮型屋預約系統',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-HK">
      <body>
        <Toaster />
        <Navbar />
        <main>{children}</main>
        <footer className="footer">
          <p>© 2026 VIVA HAIR. All Rights Reserved.</p>
          <p>九龍太子通菜街17A 1樓</p>
        </footer>
        <MobileNav />
      </body>
    </html>
  )
}

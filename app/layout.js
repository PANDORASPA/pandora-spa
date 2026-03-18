import './globals.css'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'VIVA HAIR',
  description: 'VIVA HAIR 線上預約與會員管理系統',
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
          <p>店舖資料可於後台設定頁更新。</p>
        </footer>
        <MobileNav />
      </body>
    </html>
  )
}

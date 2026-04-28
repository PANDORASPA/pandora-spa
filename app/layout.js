import './globals.css'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import RouteBodyClass from './components/RouteBodyClass'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'VIVA HAIR',
  description: 'VIVA HAIR 線上預約、會員中心與髮型服務管理平台。',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-HK">
      <body>
        <RouteBodyClass />
        <Toaster />
        <Navbar />
        <main>{children}</main>
        <footer className="footer">
          <p>© 2026 VIVA HAIR. All Rights Reserved.</p>
          <p>店舖資料、服務內容與預約安排可由後台更新。</p>
        </footer>
        <MobileNav />
      </body>
    </html>
  )
}

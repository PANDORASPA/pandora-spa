import './globals.css'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import RouteBodyClass from './components/RouteBodyClass'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'PANDORA HEAD SPA',
  description: 'PANDORA HEAD SPA 全自助頭皮護理中心，提供頭皮檢測、深層潔淨、放鬆養生、會員套票與網上預約。',
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
          <p>© 2026 PANDORA HEAD SPA. All Rights Reserved.</p>
          <p>店舖資料、服務內容、套票和預約安排可由後台即時更新。</p>
        </footer>
        <MobileNav />
      </body>
    </html>
  )
}

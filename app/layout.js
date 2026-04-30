import './globals.css'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import RouteBodyClass from './components/RouteBodyClass'
import { Toaster } from 'react-hot-toast'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pandoraheadspa.com'
const siteDescription =
  'PANDORA HEAD SPA 全自助頭皮護理中心，提供頭皮檢測、深層潔淨、放鬆養生、會員套票、Stripe 付款與網上預約。'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PANDORA HEAD SPA | 全自助頭皮護理中心',
    template: '%s | PANDORA HEAD SPA',
  },
  description: siteDescription,
  keywords: ['PANDORA HEAD SPA', '頭皮護理', 'Head Spa', '頭皮檢測', '頭皮深層潔淨', '自助頭皮護理', '套票預約'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_HK',
    url: siteUrl,
    siteName: 'PANDORA HEAD SPA',
    title: 'PANDORA HEAD SPA 全自助頭皮護理中心',
    description: siteDescription,
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'PANDORA HEAD SPA 全自助頭皮護理中心',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PANDORA HEAD SPA 全自助頭皮護理中心',
    description: siteDescription,
    images: ['/og-image.svg'],
  },
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
          <p>店舖資料、服務內容、套票與預約安排可由後台即時更新。</p>
        </footer>
        <MobileNav />
      </body>
    </html>
  )
}

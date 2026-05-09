'use client'

import { useEffect, useState } from 'react'

export default function Footer() {
  const [settings, setSettings] = useState({})

  useEffect(() => {
    fetch('/api/public/settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setSettings(payload?.settings || {}))
      .catch(() => setSettings({}))
  }, [])

  const phone = settings.whatsapp || settings.phone

  return (
    <footer className="footer">
      <p>© 2026 {settings.shop_name || 'PANDORA HEAD SPA'}. All Rights Reserved.</p>
      <p>
        {settings.address ? `${settings.address} · ` : ''}
        {phone ? `WhatsApp / 電話：${phone} · ` : ''}
        {settings.business_hours ? `營業時間：${settings.business_hours}` : '店舖資料、服務內容、套票與預約安排可由後台即時更新。'}
      </p>
      <p>
        {settings.instagram_url ? <a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a> : null}
        {settings.facebook_url ? <a href={settings.facebook_url} target="_blank" rel="noreferrer">Facebook</a> : null}
        {settings.google_map_url ? <a href={settings.google_map_url} target="_blank" rel="noreferrer">Google Map</a> : null}
      </p>
    </footer>
  )
}

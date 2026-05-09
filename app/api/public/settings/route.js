import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const DEFAULT_SETTINGS = {
  shop_name: 'PANDORA HEAD SPA',
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pandoraheadspa.com',
  seo_title: 'PANDORA HEAD SPA｜全自助頭皮護理中心',
  seo_description: 'PANDORA HEAD SPA 全自助頭皮護理中心，提供頭皮檢測、深層潔淨、頭皮養護、網上預約及會員套票服務。',
  seo_keywords: 'PANDORA HEAD SPA,頭皮護理,Head Spa,頭皮檢測,深層潔淨,會員套票',
  address: '',
  phone: '',
  whatsapp: '',
  instagram_url: '',
  facebook_url: '',
  google_map_url: '',
  stripe_enabled: 'true',
  manual_payment_enabled: 'true',
  fps_enabled: 'false',
  pay_at_shop_enabled: 'false',
  checkout_notice: '完成付款後，套票會自動加入會員帳戶；如選擇人工付款，需由店員確認後才會發放。',
  fulfillment_note: '套票及預約服務無需配送，到店使用。',
  member_registration_enabled: 'true',
  member_label: '會員',
  ticket_visibility: 'show_active_and_pending',
  reward_points_enabled: 'false',
  business_hours: '11:00 - 20:00',
  days_off: [],
  availability_cache_version: '',
}

const PUBLIC_SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)

const parseDaysOff = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)

  const text = String(value).trim()
  if (!text) return []

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : []
    } catch {
      return []
    }
  }

  return text.split(',').map((item) => item.trim()).filter(Boolean)
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('settings')
      .select('key,value')
      .in('key', PUBLIC_SETTING_KEYS)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const settings = { ...DEFAULT_SETTINGS }
    for (const row of data || []) {
      if (row.key === 'days_off') {
        settings.days_off = parseDaysOff(row.value)
      } else {
        settings[row.key] = row.value ?? settings[row.key]
      }
    }

    return NextResponse.json({ settings }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

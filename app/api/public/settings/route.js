import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SEO_PAGES = ['home', 'services', 'tickets', 'products', 'booking', 'account', 'contact', 'faq', 'articles']
const text = (value) => JSON.parse(`"${value}"`)

const DEFAULT_SETTINGS = {
  shop_name: 'PANDORA HEAD SPA',
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pandoraheadspa.com',
  seo_title: text('PANDORA HEAD SPA\\uff5c\\u5168\\u81ea\\u52a9\\u982d\\u76ae\\u8b77\\u7406\\u4e2d\\u5fc3'),
  seo_description: text('PANDORA HEAD SPA \\u5168\\u81ea\\u52a9\\u982d\\u76ae\\u8b77\\u7406\\u4e2d\\u5fc3\\uff0c\\u63d0\\u4f9b\\u982d\\u76ae\\u6aa2\\u6e2c\\u3001\\u6df1\\u5c64\\u6f54\\u6de8\\u3001\\u982d\\u76ae\\u990a\\u8b77\\u3001\\u7db2\\u4e0a\\u9810\\u7d04\\u53ca\\u6703\\u54e1\\u5957\\u7968\\u670d\\u52d9\\u3002'),
  seo_keywords: text('PANDORA HEAD SPA,\\u982d\\u76ae\\u8b77\\u7406,Head Spa,\\u982d\\u76ae\\u6aa2\\u6e2c,\\u6df1\\u5c64\\u6f54\\u6de8,\\u6703\\u54e1\\u5957\\u7968'),
  address: '',
  phone: '',
  whatsapp: '',
  whatsapp_default_message: text('\\u4f60\\u597d\\uff0c\\u6211\\u60f3\\u67e5\\u8a62 PANDORA HEAD SPA \\u982d\\u76ae\\u8b77\\u7406\\u670d\\u52d9\\u3002'),
  booking_reminder_note: text('\\u8acb\\u6e96\\u6642\\u5230\\u5e97\\uff0c\\u5982\\u9700\\u66f4\\u6539\\u9810\\u7d04\\u8acb\\u63d0\\u524d\\u806f\\u7d61\\u3002'),
  instagram_url: '',
  facebook_url: '',
  google_map_url: '',
  google_place_id: '',
  stripe_enabled: 'true',
  manual_payment_enabled: 'true',
  fps_enabled: 'false',
  fps_note: '',
  pay_at_shop_enabled: 'false',
  checkout_notice: text('\\u5b8c\\u6210\\u4ed8\\u6b3e\\u5f8c\\uff0c\\u5957\\u7968\\u6703\\u81ea\\u52d5\\u52a0\\u5165\\u6703\\u54e1\\u5e33\\u6236\\uff1b\\u5982\\u9078\\u64c7\\u4eba\\u5de5\\u4ed8\\u6b3e\\uff0c\\u9700\\u7531\\u5e97\\u54e1\\u78ba\\u8a8d\\u5f8c\\u624d\\u6703\\u767c\\u653e\\u3002'),
  fulfillment_note: text('\\u5957\\u7968\\u53ca\\u9810\\u7d04\\u670d\\u52d9\\u7121\\u9700\\u914d\\u9001\\uff0c\\u5230\\u5e97\\u4f7f\\u7528\\u3002'),
  product_fulfillment_note: text('\\u7522\\u54c1\\u53ef\\u5230\\u5e97\\u53d6\\u8ca8\\uff1b\\u5982\\u9700\\u914d\\u9001\\uff0c\\u8acb\\u5148\\u8207\\u5e97\\u54e1\\u78ba\\u8a8d\\u3002'),
  payment_success_notice: text('\\u4ed8\\u6b3e\\u6210\\u529f\\u5f8c\\uff0c\\u53ef\\u5230\\u6703\\u54e1\\u4e2d\\u5fc3\\u67e5\\u770b\\u5957\\u7968\\u6216\\u8a02\\u55ae\\u72c0\\u614b\\u3002'),
  member_registration_enabled: 'true',
  member_label: text('\\u6703\\u54e1'),
  ticket_visibility: 'show_active_and_pending',
  reward_points_enabled: 'false',
  reward_points_note: '',
  business_hours: '11:00 - 20:00',
  slot_step_min: '30',
  default_buffer_min: '15',
  days_off: [],
  availability_cache_version: '',
  theme_name: 'Pandora Wellness',
  brand_tone: text('\\u9ad8\\u7d1a\\u3001\\u5b89\\u975c\\u3001\\u4e7e\\u6de8\\u3001\\u982d\\u76ae\\u990a\\u751f'),
  hero_image_url: '',
  og_image_url: '',
  primary_cta_label: text('\\u7acb\\u5373\\u9810\\u7d04'),
  primary_cta_path: '/booking',
  nav_services_enabled: 'true',
  nav_tickets_enabled: 'true',
  nav_products_enabled: 'true',
  nav_articles_enabled: 'true',
  nav_faq_enabled: 'true',
  nav_account_enabled: 'true',
  booking_policy: '',
  ticket_terms: '',
  refund_policy: '',
  privacy_notice: '',
  terms_notice: '',
  google_analytics_id: '',
  facebook_pixel_id: '',
  meta_catalog_enabled: 'false',
  instagram_shop_enabled: 'false',
  integration_note: '',
  feature_booking_enabled: 'true',
  feature_tickets_enabled: 'true',
  feature_products_enabled: 'true',
  feature_coupons_enabled: 'true',
  feature_articles_enabled: 'true',
  feature_faq_enabled: 'true',
  apps_note: '',
}

for (const page of SEO_PAGES) {
  DEFAULT_SETTINGS[`seo.${page}.path`] = page === 'home' ? '/' : `/${page}`
  DEFAULT_SETTINGS[`seo.${page}.title`] = ''
  DEFAULT_SETTINGS[`seo.${page}.description`] = ''
  DEFAULT_SETTINGS[`seo.${page}.keywords`] = ''
}

const PUBLIC_SETTING_KEYS = Object.keys(DEFAULT_SETTINGS)
const LEGACY_VALUE_PATTERN = new RegExp(
  [
    [['VI', 'VA'].join(''), ['HA', 'IR'].join('')].join(' '),
    ['viva', 'hairhk.com'].join(''),
    [['Ha', 'ir'].join(''), ['Sa', 'lon'].join('')].join(' '),
  ].join('|'),
  'i',
)
const MOJIBAKE_PATTERN = new RegExp(
  [
    '\\uFFFD',
    '\\u00C3',
    '\\u00C2',
    '\\u00E5',
    '\\u00E6',
    '\\u00E7',
    '\\u00E9',
    '\\u00EF\\u00BD',
    '\\u00E3\\u0080',
    '\\u00E8\\u00AD',
    '\\u00E8\\u00B2',
    '\\u00E8\\u00AA',
    '\\u00E8\\u00AB',
    '\\u00E7\\u00A5',
    '\\u00E7\\u009A',
    '\\u00E9\\u00A0',
  ].join('|'),
)

const parseDaysOff = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)

  const textValue = String(value).trim()
  if (!textValue) return []

  if (textValue.startsWith('[')) {
    try {
      const parsed = JSON.parse(textValue)
      return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : []
    } catch {
      return []
    }
  }

  return textValue.split(',').map((item) => item.trim()).filter(Boolean)
}

const normalizeSettingValue = (key, value) => {
  if (value == null) return DEFAULT_SETTINGS[key]
  if (key === 'days_off') return parseDaysOff(value)

  const textValue = String(value)
  if (LEGACY_VALUE_PATTERN.test(textValue) || MOJIBAKE_PATTERN.test(textValue)) {
    return DEFAULT_SETTINGS[key] ?? ''
  }

  return value
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
      settings[row.key] = normalizeSettingValue(row.key, row.value)
    }

    return NextResponse.json(
      { settings },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      },
    )
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

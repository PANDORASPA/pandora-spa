import { NextResponse } from 'next/server'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { loadAdminSettingsContext } from '../_context'

const IMPORTANT_SETTING_KEYS = [
  'shop_name',
  'site_url',
  'seo_title',
  'seo_description',
  'address',
  'phone',
  'whatsapp',
  'google_map_url',
  'business_hours',
]

const SCAN_PATTERNS = [
  { key: 'oldBrand', label: '舊品牌字眼', pattern: new RegExp(`${'VI'}${'VA'}\\s+${'HA'}${'IR'}`, 'i') },
  { key: 'oldSalon', label: '舊沙龍英文語境', pattern: new RegExp(`${'Hair'} ${'Salon'}`, 'i') },
  { key: 'oldChineseSalon', label: '舊剪染造型語境', pattern: new RegExp(`${'剪'}${'髮'}|${'美'}${'髮'}`) },
  { key: 'mojibake', label: '亂碼特徵', pattern: new RegExp(['锛', '闋', '璀', '鐨', '瑷', '杓', '濂', '鍦', '鏈', '楂', '甯', '鐝', '搴', '漏'].join('|')) },
  { key: 'sampleWords', label: '示範 / 測試字眼', pattern: new RegExp(`\\b${'demo'}\\b|\\b${'test'}\\b|${'lorem'}`, 'i') },
]

const walkFiles = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git' || entry === '.playwright-cli') continue
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) walkFiles(path, files)
    else if (/\.(js|jsx|md|sql)$/.test(entry) && !path.includes(`${join('settings', 'audit')}`)) files.push(path)
  }
  return files
}

const scanContent = () => {
  const roots = ['app', 'lib', 'README.md', 'LAUNCH_CHECKLIST.md', 'PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md']
  const cwd = process.cwd()
  const files = roots.flatMap((root) => {
    const path = join(cwd, root)
    try {
      const stat = statSync(path)
      return stat.isDirectory() ? walkFiles(path) : [path]
    } catch {
      return []
    }
  })

  return SCAN_PATTERNS.map((rule) => {
    const matches = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (rule.pattern.test(text)) matches.push(file.replace(cwd, '').replace(/^[\\/]/, ''))
      if (matches.length >= 8) break
    }
    return {
      id: `content_${rule.key}`,
      label: rule.label,
      status: matches.length ? 'warning' : 'pass',
      detail: matches.length ? matches.join(', ') : '未發現',
    }
  })
}

export async function GET() {
  try {
    const context = await loadAdminSettingsContext()
    if (context.error) return NextResponse.json({ error: context.error }, { status: context.status })

    const { data, error } = await context.serviceSupabase.from('settings').select('key,value')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const settings = (data || []).reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {})

    const settingChecks = IMPORTANT_SETTING_KEYS.map((key) => ({
      id: `setting_${key}`,
      label: key,
      status: settings[key] ? 'pass' : 'warning',
      detail: settings[key] ? '已填寫' : '待補資料',
    }))

    const paymentChecks = [
      {
        id: 'payment_stripe',
        label: 'Stripe 線上付款',
        status: settings.stripe_enabled === 'true' ? 'pass' : 'warning',
        detail: settings.stripe_enabled === 'true' ? '已啟用' : '未啟用或待確認',
      },
      {
        id: 'payment_manual',
        label: '人工確認付款',
        status: settings.manual_payment_enabled !== 'false' ? 'pass' : 'warning',
        detail: settings.manual_payment_enabled !== 'false' ? '已保留後備付款' : '已停用',
      },
    ]

    const contentChecks = scanContent()
    const checks = [...settingChecks, ...paymentChecks, ...contentChecks]
    const summary = {
      pass: checks.filter((item) => item.status === 'pass').length,
      warning: checks.filter((item) => item.status === 'warning').length,
      fail: checks.filter((item) => item.status === 'fail').length,
    }

    return NextResponse.json({ success: true, summary, checks }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

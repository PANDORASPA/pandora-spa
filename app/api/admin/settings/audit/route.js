import { NextResponse } from 'next/server'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { loadAdminSettingsContext } from '../_context'

const text = (value) => JSON.parse(`"${value}"`)

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

const MOJIBAKE_TOKENS = [
  '\\u951b',
  '\\u95cb',
  '\\u7480',
  '\\u9428',
  '\\u7477',
  '\\u6753',
  '\\u6fc2',
  '\\u9366',
  '\\u93c8',
  '\\u6942',
  '\\u752f',
  '\\u941d',
  '\\u6434',
  '\\u6f0f',
].map(text)

const SCAN_PATTERNS = [
  { key: 'oldBrand', label: text('\\u820a\\u54c1\\u724c\\u5b57\\u773c'), pattern: new RegExp(`${'VI'}${'VA'}\\s+${'HA'}${'IR'}`, 'i') },
  { key: 'oldSalon', label: text('\\u820a salon \\u82f1\\u6587\\u8a9e\\u5883'), pattern: new RegExp(`${'Hair'} ${'Salon'}`, 'i') },
  { key: 'oldChineseSalon', label: text('\\u820a\\u526a\\u9aee\\u9020\\u578b\\u8a9e\\u5883'), pattern: new RegExp(`${text('\\u526a')}${text('\\u9aee')}|${text('\\u7f8e')}${text('\\u9aee')}`) },
  { key: 'mojibake', label: text('\\u4e82\\u78bc\\u7279\\u5fb5'), pattern: new RegExp(MOJIBAKE_TOKENS.join('|')) },
  { key: 'sampleWords', label: text('\\u793a\\u7bc4 / \\u6e2c\\u8a66\\u5b57\\u773c'), pattern: new RegExp(`\\b${'demo'}\\b|\\b${'test'}\\b|${'lorem'}`, 'i') },
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
      const fileText = readFileSync(file, 'utf8')
      if (rule.pattern.test(fileText)) matches.push(file.replace(cwd, '').replace(/^[\\/]/, ''))
      if (matches.length >= 8) break
    }
    return {
      id: `content_${rule.key}`,
      label: rule.label,
      status: matches.length ? 'warning' : 'pass',
      detail: matches.length ? matches.join(', ') : text('\\u672a\\u767c\\u73fe'),
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
      detail: settings[key] ? text('\\u5df2\\u586b\\u5beb') : text('\\u5f85\\u88dc\\u8cc7\\u6599'),
    }))

    const paymentChecks = [
      {
        id: 'payment_stripe',
        label: 'Stripe',
        status: settings.stripe_enabled !== 'true' ? 'warning' : process.env.STRIPE_SECRET_KEY ? 'pass' : 'warning',
        detail:
          settings.stripe_enabled !== 'true'
            ? text('\\u672a\\u555f\\u7528\\u6216\\u5f85\\u78ba\\u8a8d')
            : process.env.STRIPE_SECRET_KEY
              ? text('\\u5df2\\u555f\\u7528\\uff0cCheckout secret \\u5df2\\u5b58\\u5728 Vercel/server env')
              : text('Stripe \\u5df2\\u5728\\u5f8c\\u53f0\\u555f\\u7528\\uff0c\\u4f46 Vercel/server env \\u672a\\u8a2d STRIPE_SECRET_KEY\\uff0c\\u524d\\u53f0\\u6703\\u6539\\u7528\\u4eba\\u5de5\\u4ed8\\u6b3e'),
      },
      {
        id: 'payment_stripe_webhook',
        label: 'Stripe Webhook',
        status: process.env.STRIPE_WEBHOOK_SECRET ? 'pass' : 'warning',
        detail: process.env.STRIPE_WEBHOOK_SECRET
          ? text('Webhook secret \\u5df2\\u5b58\\u5728 server env')
          : text('\\u5f85\\u5728 Vercel \\u8a2d\\u5b9a STRIPE_WEBHOOK_SECRET\\uff0cendpoint: https://pandora-spa.vercel.app/api/stripe/webhook'),
      },
      {
        id: 'payment_manual',
        label: text('\\u4eba\\u5de5\\u78ba\\u8a8d\\u4ed8\\u6b3e'),
        status: settings.manual_payment_enabled !== 'false' ? 'pass' : 'warning',
        detail: settings.manual_payment_enabled !== 'false' ? text('\\u5df2\\u4fdd\\u7559\\u5f8c\\u5099\\u4ed8\\u6b3e') : text('\\u5df2\\u505c\\u7528'),
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

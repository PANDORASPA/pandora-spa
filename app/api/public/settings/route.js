import { NextResponse } from 'next/server'
import { getServiceClient } from '../../../../lib/supabase/service'

const DEFAULT_SETTINGS = {
  phone: '',
  business_hours: '11:00 - 20:00',
  days_off: [],
  availability_cache_version: '',
}

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
      .in('key', ['phone', 'business_hours', 'days_off', 'availability_cache_version'])

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

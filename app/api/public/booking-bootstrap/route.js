import { NextResponse } from 'next/server'
import { parseList } from '../../../../lib/time'
import { getServiceClient } from '../../../../lib/supabase/service'

const DEFAULT_SETTINGS = {
  phone: '',
  business_hours: '11:00 - 20:00',
  days_off: [],
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

const serializeStaff = (staff) => ({
  id: staff.id,
  name: staff.name,
  role: staff.role,
  bio: staff.bio || '',
  photo_url: staff.photo_url || '',
  services: parseList(staff.services).map((item) => Number(item)).filter(Number.isFinite),
})

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const rawStaffId = url.searchParams.get('staffId')
    const staffId = rawStaffId ? Number(rawStaffId) : null
    const supabase = getServiceClient()

    const [staffRes, servicesRes, settingsRes] = await Promise.all([
      supabase.from('staff').select('id,name,role,bio,photo_url,services').eq('enabled', true).order('name'),
      supabase.from('services').select('id,name,price,time,description,sort_order,enabled').eq('enabled', true).order('sort_order'),
      supabase.from('settings').select('key,value').in('key', ['phone', 'business_hours', 'days_off']),
    ])

    if (staffRes.error) return NextResponse.json({ error: staffRes.error.message }, { status: 500 })
    if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 })
    if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })

    const settings = { ...DEFAULT_SETTINGS }
    for (const row of settingsRes.data || []) {
      if (row.key === 'days_off') {
        settings.days_off = parseDaysOff(row.value)
      } else {
        settings[row.key] = row.value ?? settings[row.key]
      }
    }

    const staff = (staffRes.data || []).map(serializeStaff)
    if (!Number.isFinite(staffId)) {
      return NextResponse.json({ settings, staff }, { status: 200 })
    }

    const selectedStaff = staff.find((item) => Number(item.id) === staffId)
    if (!selectedStaff) {
      return NextResponse.json({ error: 'Staff not found.' }, { status: 404 })
    }

    const services = (servicesRes.data || []).filter((service) => {
      if (!Array.isArray(selectedStaff.services) || selectedStaff.services.length === 0) return true
      return selectedStaff.services.includes(Number(service.id))
    })

    return NextResponse.json({ settings, staff: selectedStaff, services }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

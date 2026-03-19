'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import ServicesTab from '../components/admin/ServicesTab'
import CustomersTab from '../components/admin/CustomersTab'
import SettingsTab from '../components/admin/SettingsTab'
import CouponsTab from '../components/admin/CouponsTab'
import InventoryTab from '../components/admin/InventoryTab'
import OrdersTab from '../components/admin/OrdersTab'
import AnalyticsTab from '../components/admin/AnalyticsTab'
import DashboardTab from '../components/admin/DashboardTab'
import ArticlesTab from '../components/admin/ArticlesTab'
import FaqsTab from '../components/admin/FaqsTab'
import StaffTab from '../components/admin/StaffTab'
import BookingsTab from '../components/admin/BookingsTab'
import LocationsTab from '../components/admin/LocationsTab'
import HolidaysTab from '../components/admin/HolidaysTab'
import ResourcesTab from '../components/admin/ResourcesTab'
import TransactionsTab from '../components/admin/TransactionsTab'
import { analyzeScheduleRows } from '../../lib/booking/admin-schedule'

const tabGroups = [
  { name: '概覽', tabs: [{ id: 'dashboard', name: '總覽' }, { id: 'analytics', name: '分析' }] },
  { name: '預約', tabs: [{ id: 'bookings', name: '預約' }, { id: 'staff', name: '排程' }, { id: 'holidays', name: '假期' }, { id: 'locations', name: '地點' }, { id: 'resources', name: '資源設備' }] },
  { name: '營運', tabs: [{ id: 'orders', name: '訂單' }, { id: 'transactions', name: '交易紀錄' }, { id: 'inventory', name: '庫存' }, { id: 'coupons', name: '優惠碼' }] },
  { name: '服務', tabs: [{ id: 'services', name: '服務' }] },
  { name: '顧客', tabs: [{ id: 'customers', name: '顧客' }] },
  { name: '內容', tabs: [{ id: 'articles', name: '文章' }, { id: 'faqs', name: '常見問題' }] },
  { name: '系統', tabs: [{ id: 'settings', name: '設定' }] },
]

const tabMeta = {
  dashboard: {
    title: '營運總覽',
    eyebrow: '營運儀表板',
    description: '在同一個畫面掌握今日預約、營業額、會員活動，以及營運所需的快速入口。',
  },
  analytics: {
    title: '營運分析',
    eyebrow: '表現洞察',
    description: '查看營業額走勢、預約結構、服務供應者表現，以及評價訊號。',
  },
  bookings: {
    title: '預約',
    eyebrow: '預約紀錄',
    description: '追蹤服務預約、服務供應者安排、時段驗證、付款狀態，以及整體預約狀態。',
  },
  orders: {
    title: '訂單',
    eyebrow: '營運銷售',
    description: '管理商品與套票訂單，並一致查看配送、付款與履行狀態。',
  },
  staff: {
    title: '服務供應者',
    eyebrow: '排程中心',
    description: '管理服務供應者資料、每週時間表、指定日期安排、休息時段、休假與封鎖時段。',
  },
  services: {
    title: '服務',
    eyebrow: '服務設定',
    description: '設定服務目錄、時長、價格，以及會影響可預約時段的規則輸入。',
  },
  inventory: {
    title: '庫存',
    eyebrow: '商品、套票與票券',
    description: '以分階段編輯方式維護可銷售的商品、套票與票券項目。',
  },
  locations: {
    title: '地點',
    eyebrow: '營運範圍',
    description: '管理分店與分店層級的可預約範圍，支援之後的多地點預約規則。',
  },
  holidays: {
    title: '假期',
    eyebrow: '休息日與休假',
    description: '設定分店休息、服務供應者休假，以及會影響可預約時段的封鎖日期。',
  },
  resources: {
    title: '資源設備',
    eyebrow: '容量控制',
    description: '管理房間、座位、儀器與其他可預約資源，並納入防撞驗證。',
  },
  transactions: {
    title: '交易紀錄',
    eyebrow: '付款帳目',
    description: '查看付款參考編號、關聯紀錄，以及供營運追查的帳目視圖。',
  },
  coupons: {
    title: '優惠碼',
    eyebrow: '推廣活動',
    description: '維護折扣碼與推廣設定，同時保留對預約影響的可見性。',
  },
  articles: {
    title: '文章',
    eyebrow: '內容管理',
    description: '編輯用於前台與會員體驗的教學及推廣內容。',
  },
  faqs: {
    title: '常見問題',
    eyebrow: '內容管理',
    description: '維持常見問題內容更新，讓預約、服務與會員流程更清晰。',
  },
  customers: {
    title: '顧客',
    eyebrow: '會員營運',
    description: '在同一頁查看會員資料、預約紀錄、聯絡方式與營運備註。',
  },
  settings: {
    title: '設定',
    eyebrow: '系統控制',
    description: '設定全店營業時間、公休日與會影響預約規則的預設值。',
  },
}

const pad2 = (value) => String(value).padStart(2, '0')

const getLocalISODate = (date = new Date()) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const normalizeDateValue = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const parts = text.split(/[\/.-]/).map((part) => part.trim())
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (a.length === 4) return `${a.padStart(4, '0')}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    return `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
  }

  return text
}

const normalizeTimeValue = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  return text.length >= 5 ? text.substring(0, 5) : text
}

const getBookingDateKey = (booking) => normalizeDateValue(booking?.appointment_date || booking?.date)
const getBookingTimeKey = (booking) => normalizeTimeValue(booking?.start_time || booking?.time)
const getBookingCustomerName = (booking) => booking?.customer_name || booking?.name || ''
const getBookingCustomerPhone = (booking) => booking?.customer_phone || booking?.phone || ''
const getBookingServiceName = (booking) => booking?.service_name || booking?.service || ''
const getBookingServiceId = (booking, serviceRows = []) => {
  const directId = Number(booking?.service_id)
  if (Number.isFinite(directId) && directId > 0) return directId

  const serviceName = String(getBookingServiceName(booking)).trim().toLowerCase()
  if (!serviceName) return null

  const matched = (serviceRows || []).find((service) => String(service?.name || '').trim().toLowerCase() === serviceName)
  const matchedId = Number(matched?.id)
  return Number.isFinite(matchedId) && matchedId > 0 ? matchedId : null
}

const parseBusinessHours = (value) => {
  const text = String(value || '11:00 - 20:00')
  const parts = text.split('-').map((part) => part.trim())
  return {
    start: parts[0] || '11:00',
    end: parts[1] || '20:00',
  }
}

const formatScheduleIssues = (issues = []) => {
  return issues
    .map((issue) => issue?.message || 'Invalid schedule data')
    .filter(Boolean)
    .join('; ')
}

const safeTableResult = async (promise) => {
  const result = await promise
  if (!result?.error) return { available: true, data: result.data || [] }

  const message = String(result.error.message || '')
  if (
    message.includes('does not exist') ||
    message.includes('Could not find the table') ||
    message.includes('schema cache') ||
    message.includes('relation')
  ) {
    return { available: false, data: [] }
  }

  throw result.error
}

export default function Admin() {
  const router = useRouter()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bookings, setBookings] = useState([])
  const [orders, setOrders] = useState([])
  const [services, setServices] = useState([])
  const [servicePackages, setServicePackages] = useState([])
  const [products, setProducts] = useState([])
  const [tickets, setTickets] = useState([])
  const [userTickets, setUserTickets] = useState([])
  const [staff, setStaff] = useState([])
  const [coupons, setCoupons] = useState([])
  const [users, setUsers] = useState([])
  const [articles, setArticles] = useState([])
  const [faqs, setFaqs] = useState([])
  const [staffShifts, setStaffShifts] = useState([])
  const [staffBreaks, setStaffBreaks] = useState([])
  const [staffTimeOff, setStaffTimeOff] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [reviews, setReviews] = useState([])
  const [locations, setLocations] = useState([])
  const [providerGroups, setProviderGroups] = useState([])
  const [holidays, setHolidays] = useState([])
  const [resources, setResources] = useState([])
  const [transactions, setTransactions] = useState([])
  const [bookingResourceAllocations, setBookingResourceAllocations] = useState([])
  const [serviceLocations, setServiceLocations] = useState([])
  const [serviceProviderGroups, setServiceProviderGroups] = useState([])
  const [serviceResources, setServiceResources] = useState([])
  const [settings, setSettings] = useState({})
  const [availableTables, setAvailableTables] = useState({
      locations: false,
      providerGroups: false,
      holidays: false,
      resources: false,
      transactions: false,
      bookingResourceAllocations: false,
      serviceLocations: false,
      serviceProviderGroups: false,
      serviceResources: false,
    })

  const normalizeStaffRow = (row) => ({
    ...row,
    daysOff: Array.isArray(row?.daysOff)
      ? row.daysOff
      : Array.isArray(row?.daysoff)
        ? row.daysoff
        : [],
  })

  const normalizeScheduleRow = (row) => ({
    ...row,
    date: row?.date ? String(row.date).substring(0, 10) : '',
    start_time: row?.start_time ? String(row.start_time).substring(0, 5) : '',
    end_time: row?.end_time ? String(row.end_time).substring(0, 5) : '',
  })

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/admin/login?redirectTo=/admin')
          return
        }

        const { data: profile } = await supabase
          .from('member_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile?.is_admin) {
          await supabase.auth.signOut()
          router.replace('/admin/login?redirectTo=/admin')
          return
        }

        setIsAuthenticated(true)
        await fetchData()
      } finally {
        setAuthChecked(true)
      }
    }

    checkAdmin()
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    const [b, o, s, sp, p, t, ut, c, cust, st, setRows, art, f, sh, br, to, bs, r, loc, providerGroupRows, hol, res, tx, bookingResourceAllocationRows, serviceLocationRows, serviceProviderGroupRows, serviceResourceRows] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('service_packages').select('*'),
      supabase.from('products').select('*'),
      supabase.from('tickets').select('*'),
      safeTableResult(supabase.from('user_tickets').select('*').order('created_at', { ascending: false })),
      supabase.from('coupons').select('*'),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('*').order('id'),
      supabase.from('settings').select('*'),
      supabase.from('articles').select('*').order('sort_order'),
      supabase.from('faqs').select('*').order('sort_order'),
      supabase.from('staff_shifts').select('*'),
      supabase.from('staff_breaks').select('*').order('staff_id').order('day_of_week'),
      supabase.from('staff_time_off').select('*').order('date'),
      supabase.from('blocked_slots').select('*').order('date'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      safeTableResult(supabase.from('locations').select('*').order('sort_order').order('name')),
      safeTableResult(supabase.from('provider_groups').select('*').order('sort_order').order('name')),
      safeTableResult(supabase.from('holidays').select('*').order('holiday_date')),
      safeTableResult(supabase.from('resources').select('*').order('sort_order').order('name')),
      safeTableResult(supabase.from('transactions').select('*').order('created_at', { ascending: false })),
      safeTableResult(supabase.from('booking_resource_allocations').select('*').order('booking_id').order('resource_id')),
      safeTableResult(supabase.from('service_locations').select('*').order('service_id').order('location_id')),
      safeTableResult(supabase.from('service_provider_groups').select('*').order('service_id').order('provider_group_id')),
      safeTableResult(supabase.from('service_resources').select('*').order('service_id').order('resource_id')),
    ])

    if (b.data) setBookings(b.data)
    if (o.data) setOrders(o.data)
    if (s.data) setServices(s.data)
    if (sp.data) setServicePackages(sp.data)
    if (p.data) setProducts(p.data)
    if (t.data) setTickets(t.data)
    setUserTickets(ut.data || [])
    if (c.data) setCoupons(c.data)
    if (cust.data) setUsers(cust.data)
    if (st.data) setStaff(st.data.map(normalizeStaffRow))
    if (art.data) setArticles(art.data)
    if (f.data) setFaqs(f.data)
    if (sh.data) setStaffShifts(sh.data.map(normalizeScheduleRow))
    if (br.data) setStaffBreaks(br.data)
    if (to.data) setStaffTimeOff(to.data.map(normalizeScheduleRow))
    if (bs.data) setBlockedSlots(bs.data.map(normalizeScheduleRow))
    if (r.data) setReviews(r.data)
    setLocations(loc.data || [])
    setProviderGroups(providerGroupRows.data || [])
    setHolidays(hol.data || [])
    setResources(res.data || [])
    setTransactions(tx.data || [])
    setBookingResourceAllocations(bookingResourceAllocationRows.data || [])
    setServiceLocations(serviceLocationRows.data || [])
    setServiceProviderGroups(serviceProviderGroupRows.data || [])
    setServiceResources(serviceResourceRows.data || [])
    setAvailableTables({
      locations: Boolean(loc.available),
      providerGroups: Boolean(providerGroupRows.available),
      holidays: Boolean(hol.available),
      resources: Boolean(res.available),
      transactions: Boolean(tx.available),
      bookingResourceAllocations: Boolean(bookingResourceAllocationRows.available),
      serviceLocations: Boolean(serviceLocationRows.available),
      serviceProviderGroups: Boolean(serviceProviderGroupRows.available),
      serviceResources: Boolean(serviceResourceRows.available),
    })
    if (setRows.data) {
      const nextSettings = setRows.data.reduce((acc, item) => {
        acc[item.key] = item.value
        return acc
      }, {})
      setSettings(nextSettings)
    }

    setLoading(false)
  }

  const stripTransientFields = (row) => {
    const payload = { ...row }
    delete payload.__isNew
    delete payload.__deleted
    return payload
  }

  const normalizeNullableNumber = (value) => {
    if (value === '' || value == null) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const saveCollection = async (table, rows = [], deletedIds = []) => {
    for (const row of rows) {
      if (row?.__deleted) continue
      const payload = stripTransientFields(row)
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      const { error } = await supabase.from(table).upsert(payload)
      if (error) throw error
    }

    if (deletedIds.length > 0) {
      const { error } = await supabase.from(table).delete().in('id', deletedIds)
      if (error) throw error
    }
  }

  const saveShifts = async (payloadOrRows, options = {}) => {
    const silentSuccess = Boolean(options?.silentSuccess)
    try {
      const shifts = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      const existingIds = (staffShifts || []).map((s) => Number(s.id)).filter((n) => Number.isFinite(n))
      let nextId = (existingIds.length ? Math.max(...existingIds) : 0) + 1
      const businessHours = parseBusinessHours(settings?.business_hours)

      const payload = (shifts || []).map((shift) => {
        const row = { ...shift }
        const staffRow = staff.find((item) => item.id === row.staff_id)
        const dayKey = row.date ? String(new Date(`${row.date}T00:00:00Z`).getUTCDay()) : null
        const baselineStart = dayKey ? String(staffRow?.schedule?.[dayKey]?.start || businessHours.start).substring(0, 5) : businessHours.start
        const baselineEnd = dayKey ? String(staffRow?.schedule?.[dayKey]?.end || businessHours.end).substring(0, 5) : businessHours.end
        row.date = row.date ? String(row.date).substring(0, 10) : row.date
        if (!Number.isInteger(Number(row.id)) || Number(row.id) <= 0 || Number(row.id) > 2147483647) {
          delete row.id
        }
        if (!row.id) {
          row.id = nextId
          nextId += 1
        }
        row.is_off = Boolean(row.is_off)
        row.start_time = row.is_off ? null : String(row.start_time || baselineStart).substring(0, 5)
        row.end_time = row.is_off ? null : String(row.end_time || baselineEnd).substring(0, 5)
        return row
      }).filter((row) => row.date && row.staff_id)

      const { issues } = analyzeScheduleRows({ table: 'staff_shifts', rows: payload, bookings })
      if (issues.length > 0) {
        throw new Error(formatScheduleIssues(issues))
      }

      setSaving(true)
      const { error } = await supabase.from('staff_shifts').upsert(payload, { onConflict: 'staff_id, date' })
      if (error) throw error
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase.from('staff_shifts').delete().in('id', deletedIds)
        if (deleteError) throw deleteError
      }

      const { data } = await supabase.from('staff_shifts').select('*')
      if (data) setStaffShifts(data)
      if (!silentSuccess) toast.success('儲存成功')
    } catch (error) {
      toast.error('班次儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveScheduleTable = async ({ table, rows = [], deletedIds = [], onConflict }, options = {}) => {
    const silentSuccess = Boolean(options?.silentSuccess)
    try {
      const normalizedRows = (rows || [])
        .filter((row) => !row?.__deleted)
        .map((row) => {
          const payload = stripTransientFields({ ...row })
          if (payload.staff_id != null && payload.staff_id !== '') payload.staff_id = Number(payload.staff_id)
          if (payload.date) payload.date = String(payload.date).substring(0, 10)
          if (payload.start_time) payload.start_time = String(payload.start_time).substring(0, 5)
          else if (payload.start_time === '') payload.start_time = null
          if (payload.end_time) payload.end_time = String(payload.end_time).substring(0, 5)
          else if (payload.end_time === '') payload.end_time = null
          if (payload.day_of_week != null && payload.day_of_week !== '') payload.day_of_week = Number(payload.day_of_week)
          if (payload.is_off != null) payload.is_off = Boolean(payload.is_off)
          if (payload.is_all_day == null) delete payload.is_all_day
          else payload.is_all_day = Boolean(payload.is_all_day)
          if (payload.enabled != null) payload.enabled = Boolean(payload.enabled)
          if (payload.label != null) payload.label = String(payload.label).trim()
          if (payload.reason != null) payload.reason = String(payload.reason).trim()
          if (payload.source != null) payload.source = String(payload.source).trim() || 'manual'
          if (!Number.isInteger(Number(payload.id)) || Number(payload.id) <= 0 || Number(payload.id) > 2147483647) {
            delete payload.id
          } else {
            payload.id = Number(payload.id)
          }
          return payload
        })

      const { issues } = analyzeScheduleRows({ table, rows: normalizedRows, bookings })
      if (issues.length > 0) {
        throw new Error(formatScheduleIssues(issues))
      }

      setSaving(true)
      if (normalizedRows.length > 0) {
        const query = onConflict
          ? supabase.from(table).upsert(normalizedRows, { onConflict })
          : supabase.from(table).upsert(normalizedRows)
        const { error } = await query
        if (error) throw error
      }

      if (deletedIds.length > 0) {
        const { error } = await supabase.from(table).delete().in('id', deletedIds)
        if (error) throw error
      }

      await fetchData()
      if (!silentSuccess) toast.success('儲存成功')
    } catch (error) {
      toast.error(`${table} 儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const saveStaffBreaks = async (payloadOrRows, options = {}) => {
    const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
    const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
    await saveScheduleTable({ table: 'staff_breaks', rows, deletedIds }, options)
  }

  const saveStaffTimeOff = async (payloadOrRows, options = {}) => {
    const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
    const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
    await saveScheduleTable({ table: 'staff_time_off', rows, deletedIds }, options)
  }

  const saveBlockedSlots = async (payloadOrRows, options = {}) => {
    const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
    const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
    await saveScheduleTable({ table: 'blocked_slots', rows, deletedIds }, options)
  }

  const saveLocations = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      const normalizedRows = rows.map((row) => ({
        ...row,
        sort_order: Number(row.sort_order || 0),
        enabled: row.enabled !== false,
      }))
      await saveCollection('locations', normalizedRows, deletedIds)
      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('地點儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveHolidays = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      const normalizedRows = rows
        .filter((row) => row.holiday_date)
        .map((row) => ({
          ...row,
          holiday_date: String(row.holiday_date).substring(0, 10),
          end_date: row.end_date ? String(row.end_date).substring(0, 10) : null,
          location_id: row.location_id === '' ? null : row.location_id,
          provider_group_id: row.provider_group_id === '' ? null : row.provider_group_id,
          staff_id: row.staff_id === '' ? null : row.staff_id,
          is_closed: row.is_closed !== false,
        }))
      await saveCollection('holidays', normalizedRows, deletedIds)
      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('假期儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveResources = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      const normalizedRows = rows.map((row) => ({
        ...row,
        location_id: row.location_id === '' ? null : row.location_id,
        capacity: Number(row.capacity || 1),
        sort_order: Number(row.sort_order || 0),
        enabled: row.enabled !== false,
      }))
      await saveCollection('resources', normalizedRows, deletedIds)
      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('資源設備儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveStaff = async (targetStaffId = null, options = {}) => {
    const silentSuccess = Boolean(options?.silentSuccess)
    setSaving(true)
    try {
      const businessHours = parseBusinessHours(settings?.business_hours)
      const rowsToSave = targetStaffId == null ? staff : staff.filter((item) => item.id === targetStaffId)
      for (const item of rowsToSave) {
        const normalizedSchedule = Object.entries(item.schedule || {}).reduce((acc, [dayKey, value]) => {
          const start = String(value?.start || '').substring(0, 5)
          const end = String(value?.end || '').substring(0, 5)
          if (!start && !end) return acc
          acc[dayKey] = {
            start: start || businessHours.start,
            end: end || businessHours.end,
          }
          return acc
        }, {})
        const payload = {
          id: item.id,
          name: item.name || '新服務供應者',
          role: item.role || '髮型師',
          phone: item.phone || '',
          photo_url: item.photo_url || '',
          bio: item.bio || '',
          enabled: item.enabled !== false,
          schedule: normalizedSchedule,
          services: Array.isArray(item.services) ? item.services : [],
          daysoff: Array.isArray(item.daysOff) ? item.daysOff : [],
          location_id: normalizeNullableNumber(item.location_id),
          provider_group_id: normalizeNullableNumber(item.provider_group_id),
        }
        if (!Number.isInteger(Number(payload.id)) || Number(payload.id) <= 0 || Number(payload.id) > 2147483647) {
          delete payload.id
        } else {
          payload.id = Number(payload.id)
        }
        const { error } = await supabase.from('staff').upsert(payload)
        if (error) throw error
      }
      await fetchData()
      if (!silentSuccess) toast.success('儲存成功')
    } catch (error) {
      toast.error('服務供應者儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveServices = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.services || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      const serviceLocationsPayload = Array.isArray(payloadOrRows?.serviceLocations) ? payloadOrRows.serviceLocations : []
      const serviceProviderGroupsPayload = Array.isArray(payloadOrRows?.serviceProviderGroups) ? payloadOrRows.serviceProviderGroups : []
      const serviceResourcesPayload = Array.isArray(payloadOrRows?.serviceResources) ? payloadOrRows.serviceResources : []
      const deletedServiceLocationIds = Array.isArray(payloadOrRows?.deletedServiceLocationIds) ? payloadOrRows.deletedServiceLocationIds : []
      const deletedServiceProviderGroupIds = Array.isArray(payloadOrRows?.deletedServiceProviderGroupIds) ? payloadOrRows.deletedServiceProviderGroupIds : []
      const deletedServiceResourceIds = Array.isArray(payloadOrRows?.deletedServiceResourceIds) ? payloadOrRows.deletedServiceResourceIds : []

      const serviceIdMap = new Map()
      const activeRows = rows.filter((row) => !row?.__deleted)

      for (const row of activeRows) {
        const payload = stripTransientFields(row)
        const originalId = payload.id

        payload.price = Number(payload.price || 0)
        payload.time = Number(payload.time || 60)
        payload.buffer_min = Number(payload.buffer_min || 0)
        payload.sort_order = Number(payload.sort_order || 0)
        payload.default_location_id = normalizeNullableNumber(payload.default_location_id)
        payload.default_provider_group_id = normalizeNullableNumber(payload.default_provider_group_id)
        payload.slot_step_min = normalizeNullableNumber(payload.slot_step_min)
        payload.min_booking_qty = Math.max(1, Number(payload.min_booking_qty || 1))
        payload.max_booking_qty = Math.max(payload.min_booking_qty, Number(payload.max_booking_qty || payload.min_booking_qty || 1))
        payload.booking_mode = String(payload.booking_mode || 'staff')
        payload.enabled = payload.enabled !== false

        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id

        const { data, error } = await supabase.from('services').upsert(payload).select('id').single()
        if (error) throw error
        serviceIdMap.set(String(originalId), data.id)
      }

      const persistRelations = async ({ table, rows: relationRows, deletedIds: relationDeletedIds, mapper }) => {
        const normalizedRows = (relationRows || [])
          .filter((row) => !row?.__deleted)
          .map((row) => mapper({ ...stripTransientFields(row), service_id: serviceIdMap.get(String(row.service_id)) || normalizeNullableNumber(row.service_id) }))
          .filter((row) => row.service_id && Object.entries(row).every(([key, value]) => !key.endsWith('_id') || key === 'service_id' || value != null))

        if (normalizedRows.length > 0) {
          const { error } = await supabase.from(table).upsert(normalizedRows)
          if (error) throw error
        }

        if (relationDeletedIds.length > 0) {
          const { error } = await supabase.from(table).delete().in('id', relationDeletedIds)
          if (error) throw error
        }
      }

      await persistRelations({
        table: 'service_locations',
        rows: serviceLocationsPayload,
        deletedIds: deletedServiceLocationIds,
        mapper: (row) => ({
          id: typeof row.id === 'number' && row.id < 2147483647 ? row.id : undefined,
          service_id: row.service_id,
          location_id: normalizeNullableNumber(row.location_id),
          extra_price: Number(row.extra_price || 0),
          enabled: row.enabled !== false,
        }),
      })

      await persistRelations({
        table: 'service_provider_groups',
        rows: serviceProviderGroupsPayload,
        deletedIds: deletedServiceProviderGroupIds,
        mapper: (row) => ({
          id: typeof row.id === 'number' && row.id < 2147483647 ? row.id : undefined,
          service_id: row.service_id,
          provider_group_id: normalizeNullableNumber(row.provider_group_id),
          assignment_mode: String(row.assignment_mode || 'any'),
        }),
      })

      await persistRelations({
        table: 'service_resources',
        rows: serviceResourcesPayload,
        deletedIds: deletedServiceResourceIds,
        mapper: (row) => ({
          id: typeof row.id === 'number' && row.id < 2147483647 ? row.id : undefined,
          service_id: row.service_id,
          resource_id: normalizeNullableNumber(row.resource_id),
          quantity: Math.max(1, Number(row.quantity || 1)),
          required: row.required !== false,
        }),
      })

      if (deletedIds.length > 0) {
        const { error } = await supabase.from('services').delete().in('id', deletedIds)
        if (error) throw error
      }

      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('服務儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveInventory = async ({ kind, items = [], deletedIds = [] }) => {
    const table = { products: 'products', packages: 'service_packages', tickets: 'tickets' }[kind]
    if (!table) throw new Error('未知庫存類型')

    setSaving(true)
    try {
      await saveCollection(table, items, deletedIds)
      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('庫存儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveTransactions = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.transactions || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      const normalizedRows = rows.map((row) => ({
        ...row,
        amount: Number(row.amount || 0),
        occurred_at: row.occurred_at ? String(row.occurred_at) : new Date().toISOString(),
        status: String(row.status || 'pending'),
        kind: String(row.kind || 'sale'),
        currency: String(row.currency || 'HKD'),
        booking_id: row.booking_id === '' ? null : normalizeNullableNumber(row.booking_id),
        order_id: row.order_id === '' ? null : normalizeNullableNumber(row.order_id),
        customer_id: row.customer_id === '' ? null : normalizeNullableNumber(row.customer_id),
        member_user_id: row.member_user_id || null,
      }))
      await saveCollection('transactions', normalizedRows, deletedIds)
      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('交易紀錄儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveCoupons = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.coupons || []
      await saveCollection('coupons', rows)
      await fetchData()
      toast.success('儲存成功')
    } catch (error) {
      toast.error('優惠碼儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (newSettings) => {
    setSaving(true)
    try {
      const updates = Object.keys(newSettings).map((key) => supabase.from('settings').upsert({ key, value: newSettings[key] }))
      await Promise.all(updates)
      setSettings(newSettings)
      toast.success('儲存成功')
    } catch (error) {
      toast.error('設定儲存失敗：' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)))
    toast.success('儲存成功')
  }

  const updateBookingStaff = async (id, staffId) => {
    const nextStaffId = staffId === '' || staffId == null ? null : Number(staffId)
    const targetBooking = bookings.find((booking) => booking.id === id)

    if (nextStaffId == null) {
      await supabase
        .from('bookings')
        .update({
          staff_id: null,
          staff_name: null,
        })
        .eq('id', id)

      setBookings((current) =>
        current.map((booking) => (booking.id === id ? { ...booking, staff_id: null, staff_name: null } : booking))
      )
      toast.success('儲存成功')
      return true
    }

    const bookingDate = getBookingDateKey(targetBooking)
    const bookingTime = getBookingTimeKey(targetBooking)
    const serviceId = getBookingServiceId(targetBooking, services)
    const currentStaffId = targetBooking?.staff_id == null ? null : Number(targetBooking.staff_id)

    if (currentStaffId != null && currentStaffId === nextStaffId) {
      return true
    }

    if (!bookingDate || !bookingTime || !serviceId) {
      toast.error('未能驗證這筆預約的可用時段')
      return false
    }

    const params = new URLSearchParams({
      date: bookingDate,
      serviceId: String(serviceId),
      staffId: String(nextStaffId),
    })

    try {
      const response = await fetch(`/api/availability?${params.toString()}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || '可用時段檢查失敗')
      }

      const availableSlots = Array.isArray(payload?.slots) ? payload.slots : []
      if (!availableSlots.includes(bookingTime)) {
        toast.error('所選服務供應者未能提供這個時段')
        return false
      }

      const matchedStaff = staff.find((item) => item.id.toString() === String(nextStaffId))
      await supabase
        .from('bookings')
        .update({
          staff_id: nextStaffId,
          staff_name: matchedStaff ? matchedStaff.name : null,
        })
        .eq('id', id)

      setBookings((current) =>
        current.map((booking) =>
          booking.id === id
            ? { ...booking, staff_id: nextStaffId, staff_name: matchedStaff ? matchedStaff.name : null }
            : booking
        )
      )
      toast.success('儲存成功')
      return true
    } catch (error) {
      toast.error('可用時段檢查失敗：' + (error?.message || '未知錯誤'))
      return false
    }
  }

  const addStaff = () => {
    const newId = Math.max(...staff.map((item) => item.id), 0) + 1
    setStaff([
      ...staff,
      {
        id: newId,
        name: '新服務供應者',
        role: '髮型師',
        phone: '',
        enabled: true,
        schedule: {},
        services: [],
        daysOff: [],
        daysoff: [],
        photo_url: '',
        bio: '',
      },
    ])
  }

  const deleteStaff = async (id) => {
    if (!confirm('確定要刪除此服務供應者？')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff((current) => current.filter((item) => item.id !== id))
  }

  const updateStaffField = (id, field, value) => {
    setStaff((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const toggleStaffService = (staffId, serviceId) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const servicesList = item.services || []
        const hasService = servicesList.includes(serviceId)
        return {
          ...item,
          services: hasService ? servicesList.filter((id) => id !== serviceId) : [...servicesList, serviceId],
        }
      })
    )
  }

  const toggleDailyOff = (staffId, dayKey) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const daysOff = item.daysOff || []
        const hasDay = daysOff.includes(dayKey)
        return {
          ...item,
          daysOff: hasDay ? daysOff.filter((day) => day !== dayKey) : [...daysOff, dayKey],
        }
      })
    )
  }

  const updateStaffSchedule = (staffId, day, field, value) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const schedule = item.schedule || {}
        return { ...item, schedule: { ...schedule, [day]: { ...schedule[day], [field]: value } } }
      })
    )
  }

  const updateCustomer = async (id, updates) => {
    await supabase.from('customers').update(updates).eq('id', id)
    setUsers((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    toast.success('儲存成功')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    router.push('/admin/login')
  }

  const todayISO = getLocalISODate()
  const todaysBookings = bookings.filter((booking) => getBookingDateKey(booking) === todayISO)
  const stats = {
    todayBookings: todaysBookings.length,
    todayRevenue: todaysBookings.reduce((sum, booking) => sum + Number(booking.final_price || booking.service_price || 0), 0),
    totalUsers: users.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    orderRevenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    activeTickets: userTickets.filter((ticket) => Number(ticket?.remaining_count || 0) > 0).length,
  }

  const activeTabMeta = tabMeta[activeTab] || {
    title: 'Admin',
    eyebrow: 'Operations',
    description: 'Manage operational data and storefront configuration.',
  }

  const renderActiveContent = () => {
    if (activeTab === 'dashboard') return <DashboardTab stats={stats} bookings={bookings} orders={orders} transactions={transactions} customers={users} userTickets={userTickets} onOpenTab={setActiveTab} />
    if (activeTab === 'analytics') return <AnalyticsTab bookings={bookings} orders={orders} transactions={transactions} users={users} userTickets={userTickets} reviews={reviews} />
    if (activeTab === 'orders') return <OrdersTab orders={orders} bookings={bookings} customers={users} transactions={transactions} locations={locations} providerGroups={providerGroups} saving={saving} />
    if (activeTab === 'bookings') return <BookingsTab bookings={bookings} staff={staff} services={services} locations={locations} providerGroups={providerGroups} resources={resources} transactions={transactions} orders={orders} bookingResourceAllocations={bookingResourceAllocations} onUpdateStatus={updateStatus} onUpdateBookingStaff={updateBookingStaff} />
    if (activeTab === 'staff') {
      return (
        <StaffTab
          staff={staff}
          services={services}
          operationalContext={{ locations, providerGroups, availableTables }}
          staffShifts={staffShifts}
          staffBreaks={staffBreaks}
          staffTimeOff={staffTimeOff}
          blockedSlots={blockedSlots}
          onAddStaff={addStaff}
          onDeleteStaff={deleteStaff}
          onUpdateField={updateStaffField}
          onToggleService={toggleStaffService}
          onToggleDailyOff={toggleDailyOff}
          onUpdateSchedule={updateStaffSchedule}
          onSave={saveStaff}
          onSaveShifts={saveShifts}
          onSaveBreaks={saveStaffBreaks}
          onSaveTimeOff={saveStaffTimeOff}
          onSaveBlockedSlots={saveBlockedSlots}
          saving={saving}
        />
      )
    }
    if (activeTab === 'services') {
      return (
        <ServicesTab
          services={services}
          saveServices={saveServices}
          locations={locations}
          providerGroups={providerGroups}
          resources={resources}
          serviceLocations={serviceLocations}
          serviceProviderGroups={serviceProviderGroups}
          serviceResources={serviceResources}
          availableTables={availableTables}
        />
      )
    }
    if (activeTab === 'inventory') return <InventoryTab products={products} packages={servicePackages} tickets={tickets} services={services} fetchData={fetchData} saveInventory={saveInventory} />
    if (activeTab === 'locations') return <LocationsTab locations={locations} saveLocations={saveLocations} saving={saving} available={availableTables.locations} />
    if (activeTab === 'holidays') return <HolidaysTab holidays={holidays} locations={locations} providerGroups={providerGroups} providerGroupsAvailable={availableTables.providerGroups} staff={staff} saveHolidays={saveHolidays} saving={saving} available={availableTables.holidays} />
    if (activeTab === 'resources') return <ResourcesTab resources={resources} locations={locations} saveResources={saveResources} saving={saving} available={availableTables.resources} />
    if (activeTab === 'transactions') return <TransactionsTab transactions={transactions} bookings={bookings} orders={orders} customers={users} locations={locations} providerGroups={providerGroups} available={availableTables.transactions} saveTransactions={saveTransactions} saving={saving} />
    if (activeTab === 'coupons') return <CouponsTab coupons={coupons} saveCoupons={saveCoupons} />
    if (activeTab === 'articles') return <ArticlesTab articles={articles} />
    if (activeTab === 'faqs') return <FaqsTab faqs={faqs} />
    if (activeTab === 'customers') return <CustomersTab users={users} bookings={bookings} orders={orders} transactions={transactions} userTickets={userTickets} servicePackages={servicePackages} onUpdateCustomer={updateCustomer} />
    if (activeTab === 'settings') return <SettingsTab settings={settings} saveSettings={saveSettings} saving={saving} />
    return null
  }

  if (!authChecked || loading) return <div style={{ padding: '100px', textAlign: 'center' }}>載入中...</div>
  if (!isAuthenticated) return <div style={{ padding: '100px', textAlign: 'center' }}>Checking admin access...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ background: '#3D3D3D', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>VIVA SALON Admin</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ padding: '6px 12px', background: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Refresh
          </button>
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '6px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <aside className="admin-card" style={{ width: '280px', padding: '18px', position: 'sticky', top: '20px', alignSelf: 'flex-start', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>ADMIN NAVIGATION</div>
          <h3 style={{ margin: '8px 0 0', fontSize: '20px', fontWeight: 800 }}>Operations Console</h3>
          <p style={{ margin: '10px 0 18px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
            Use grouped navigation for bookings, commerce, scheduling, operations, and content instead of one long tab strip.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {tabGroups.map((group) => (
              <div key={group.name}>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: '#9A8A78', marginBottom: '8px', textTransform: 'uppercase' }}>{group.name}</div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {group.tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`admin-tab-btn ${isActive ? 'active' : ''}`}
                        style={{
                          textAlign: 'left',
                          padding: '11px 12px',
                          borderRadius: '12px',
                          border: isActive ? '1px solid rgba(166, 139, 106, 0.35)' : '1px solid transparent',
                          background: isActive ? '#FBF6EF' : 'transparent',
                          color: isActive ? '#7C6245' : '#5B5B5B',
                          fontSize: '14px',
                          fontWeight: isActive ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {tab.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main style={{ flex: '1 1 900px', minWidth: 0 }}>
          <div className="admin-card" style={{ padding: '22px', marginBottom: '20px', border: '1px solid rgba(166, 139, 106, 0.18)', background: 'linear-gradient(135deg, #fff, #FBF8F4)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>{activeTabMeta.eyebrow}</div>
            <div style={{ marginTop: '6px', fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>{activeTabMeta.title}</div>
            <div style={{ marginTop: '8px', maxWidth: '760px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-light)' }}>{activeTabMeta.description}</div>
          </div>

          {renderActiveContent()}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { analyzeScheduleRows } from '../../lib/booking/admin-schedule'
import { parseBusinessHours } from '../../lib/booking/availability'
import { parseTimeToMinutes } from '../../lib/time'

const ServicesTab = dynamic(() => import('../components/admin/ServicesTab'))
const CustomersTab = dynamic(() => import('../components/admin/CustomersTab'))
const SettingsTab = dynamic(() => import('../components/admin/SettingsTab'))
const CouponsTab = dynamic(() => import('../components/admin/CouponsTab'))
const InventoryTab = dynamic(() => import('../components/admin/InventoryTab'))
const OrdersTab = dynamic(() => import('../components/admin/OrdersTab'))
const AnalyticsTab = dynamic(() => import('../components/admin/AnalyticsTab'))
const DashboardTab = dynamic(() => import('../components/admin/DashboardTab'))
const ArticlesTab = dynamic(() => import('../components/admin/ArticlesTab'))
const FaqsTab = dynamic(() => import('../components/admin/FaqsTab'))
const SchedulingTab = dynamic(() => import('../components/admin/SchedulingTab'))
const BookingsTab = dynamic(() => import('../components/admin/BookingsTab'))
const LocationsTab = dynamic(() => import('../components/admin/LocationsTab'))
const HolidaysTab = dynamic(() => import('../components/admin/HolidaysTab'))
const ResourcesTab = dynamic(() => import('../components/admin/ResourcesTab'))
const TransactionsTab = dynamic(() => import('../components/admin/TransactionsTab'))
const SecurityLogsTab = dynamic(() => import('../components/admin/SecurityLogsTab'))

const scheduleTableLabels = {
  staff_shifts: '日期覆蓋',
  staff_breaks: '固定休息時段',
  staff_time_off: '休假時段',
  blocked_slots: '封鎖時段',
}

const WEEKDAY_LABELS = {
  '0': '星期日',
  '1': '星期一',
  '2': '星期二',
  '3': '星期三',
  '4': '星期四',
  '5': '星期五',
  '6': '星期六',
}

const tabLoadingMessage = '載入分頁資料中...'

const tabGroups = [
  { name: '總覽', tabs: [{ id: 'dashboard', name: '總覽' }, { id: 'analytics', name: '數據分析' }] },
  { name: '預約與排班', tabs: [{ id: 'bookings', name: '預約' }, { id: 'staff', name: '排班' }, { id: 'holidays', name: '假期' }, { id: 'locations', name: '地點' }, { id: 'resources', name: '資源設備' }] },
  { name: '銷售與庫存', tabs: [{ id: 'orders', name: '訂單' }, { id: 'transactions', name: '交易紀錄' }, { id: 'inventory', name: '庫存' }, { id: 'coupons', name: '優惠碼' }] },
  { name: '服務設定', tabs: [{ id: 'services', name: '服務' }] },
  { name: '顧客管理', tabs: [{ id: 'customers', name: '顧客' }] },
  { name: '內容管理', tabs: [{ id: 'articles', name: '文章' }, { id: 'faqs', name: '常見問題' }] },
  { name: '系統設定', tabs: [{ id: 'settings', name: '設定' }, { id: 'security', name: '安全紀錄' }] },
]

const DEFAULT_ADMIN_SETTINGS = {
  shop_name: 'PANDORA HEAD SPA',
  site_url: 'https://pandora-spa.vercel.app',
}

const LEGACY_SETTING_VALUE_PATTERN = new RegExp(
  [
    [['VI', 'VA'].join(''), ['HA', 'IR'].join('')].join(' '),
    ['viva', 'hairhk.com'].join(''),
    [['Ha', 'ir'].join(''), ['Sa', 'lon'].join('')].join(' '),
  ].join('|'),
  'i',
)
const MOJIBAKE_SETTING_PATTERN = new RegExp(
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

const normalizeAdminSettingValue = (key, value) => {
  if (value == null) return value
  const textValue = String(value)
  if (LEGACY_SETTING_VALUE_PATTERN.test(textValue) || MOJIBAKE_SETTING_PATTERN.test(textValue)) {
    return DEFAULT_ADMIN_SETTINGS[key] ?? ''
  }
  return value
}

const tabMeta = {
  dashboard: {
    title: '總覽',
    eyebrow: '營運儀表板',
    description: '在同一個畫面掌握今日預約、銷售、顧客動態，以及營運最需要的快捷入口。',
  },
  analytics: {
    title: '數據分析',
    eyebrow: '數據洞察',
    description: '查看預約趨勢、銷售表現、服務供應者效率，以及套票使用情況。',
  },
  bookings: {
    title: '預約管理',
    eyebrow: '預約紀錄',
    description: '追蹤顧客預約、服務供應者安排、時段狀態、付款摘要，以及整體預約流程。',
  },
  orders: {
    title: '訂單管理',
    eyebrow: '銷售紀錄',
    description: '管理商品與套票訂單，並一致查看配送、付款與訂單狀態。',
  },
  staff: {
    title: '服務供應者',
    eyebrow: '排班中心',
    description: '管理服務供應者資料、每週時間表、指定日期安排、固定休息與休假時段。',
  },
  services: {
    title: '服務設定',
    eyebrow: '服務內容',
    description: '設定服務項目、時長、價格，以及會影響可預約時段的規則。',
  },
  inventory: {
    title: '庫存',
    eyebrow: '商品與套票',
    description: '以分組方式管理可售商品、套票與票券項目。',
  },
  locations: {
    title: '地點',
    eyebrow: '營運據點',
    description: '管理分店與地點設定，支援多地點營運資料。',
  },
  holidays: {
    title: '假期',
    eyebrow: '休息與封鎖',
    description: '設定分店休息、服務供應者休假，以及會影響可預約時段的封鎖日期。',
  },
  resources: {
    title: '資源設備',
    eyebrow: '容量控制',
    description: '管理房間、座位、器材及其他預約資源，避免超額預約。',
  },
  transactions: {
    title: '交易紀錄',
    eyebrow: '付款明細',
    description: '查看付款參考編號、關聯訂單與營運追蹤資料。',
  },
  coupons: {
    title: '優惠碼',
    eyebrow: '推廣活動',
    description: '設定折扣碼與推廣活動，同時保留預約與銷售的可追蹤性。',
  },
  articles: {
    title: '文章',
    eyebrow: '內容管理',
    description: '管理用於前台與會員頁的教學、公告及推廣內容。',
  },
  faqs: {
    title: '常見問題',
    eyebrow: '內容管理',
    description: '持續更新常見問題內容，方便顧客快速理解預約與服務流程。',
  },
  customers: {
    title: '會員帳號管理',
    eyebrow: '會員帳號',
    description: '集中查看會員資料、登入狀態、管理員權限，以及相關預約、訂單與交易摘要。',
  },
  settings: {
    title: '設定',
    eyebrow: '系統控制',
    description: '管理全店營業時間、公休日與會影響預約規則的系統設定。',
  },
  security: {
    title: '安全紀錄',
    eyebrow: '審計追蹤',
    description: '查看管理員關鍵操作、資料寫入、付款確認與 CSV 匯入紀錄。',
  },
}
const normalizeDateValue = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

const normalizeTimeValue = (value) => {
  if (!value) return ''
  return String(value).slice(0, 5)
}

const getLocalISODate = () => {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000)
  return localTime.toISOString().slice(0, 10)
}

const getBookingDateKey = (booking) => normalizeDateValue(booking?.appointment_date || booking?.date)

const getBookingTimeKey = (booking) => normalizeTimeValue(booking?.start_time || booking?.time)

const getBookingServiceId = (booking, services = []) => {
  const directId = booking?.service_id
  if (directId != null && directId !== '') return Number(directId)
  const serviceName = String(booking?.service_name || booking?.service || '').trim()
  if (!serviceName) return null
  const matched = services.find((service) => String(service?.name || '').trim() === serviceName)
  return matched?.id != null ? Number(matched.id) : null
}

const safeTableResult = async (promise) => {
  const result = await promise
  if (!result?.error) {
    return {
      available: true,
      data: result?.data || [],
      error: null,
    }
  }
  const message = String(result.error?.message || '')
  const relationMissing =
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('Could not find the table') ||
    message.includes('Could not find the relation')
  if (!relationMissing) {
    throw result.error
  }
  return {
    available: false,
    data: [],
    error: result.error,
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isCompactAdmin, setIsCompactAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [baseLoaded, setBaseLoaded] = useState(false)
  const [tabDataLoaded, setTabDataLoaded] = useState({})
  const [tabLoadingState, setTabLoadingState] = useState({})

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
  const [memberProfiles, setMemberProfiles] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
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

  const normalizeDaysOff = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry || '').trim()).filter((entry) => /^[0-6]$/.test(entry))
    }
    const text = String(value || '').trim()
    if (!text) return []
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry || '').trim()).filter((entry) => /^[0-6]$/.test(entry))
      }
    } catch {}
    return text
      .split(',')
      .map((entry) => String(entry || '').trim())
      .filter((entry) => /^[0-6]$/.test(entry))
  }

  const normalizeStaffRow = (row) => ({
    ...row,
    daysOff: normalizeDaysOff(row?.daysOff ?? row?.daysoff),
  })

  const normalizeScheduleRow = (row) => ({
    ...row,
    date: row?.date ? String(row.date).substring(0, 10) : '',
    start_time: row?.start_time ? String(row.start_time).substring(0, 5) : '',
    end_time: row?.end_time ? String(row.end_time).substring(0, 5) : '',
  })

  const markTabsLoaded = (tabIds = []) => {
    setTabDataLoaded((current) => {
      const next = { ...current }
      for (const tabId of tabIds) next[tabId] = true
      return next
    })
  }

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
        await loadBaseData()
      } finally {
        setAuthChecked(true)
      }
    }

    checkAdmin()
  }, [router])

  useEffect(() => {
    const syncViewport = () => setIsCompactAdmin(window.innerWidth < 960)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const reduceSettingsRows = (rows = []) =>
    (rows || []).reduce((acc, item) => {
      if (!item?.key) return acc
      acc[item.key] = normalizeAdminSettingValue(item.key, item.value)
      return acc
    }, { ...DEFAULT_ADMIN_SETTINGS })

  const loadBaseData = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true)

    const [s, st, setRows, sh, br, to, bs, loc, providerGroupRows, hol, res] = await Promise.all([
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('staff').select('*').order('id'),
      supabase.from('settings').select('*'),
      supabase.from('staff_shifts').select('*'),
      supabase.from('staff_breaks').select('*').order('staff_id').order('day_of_week'),
      supabase.from('staff_time_off').select('*').order('date'),
      supabase.from('blocked_slots').select('*').order('date'),
      safeTableResult(supabase.from('locations').select('*').order('sort_order').order('name')),
      safeTableResult(supabase.from('provider_groups').select('*').order('sort_order').order('name')),
      safeTableResult(supabase.from('holidays').select('*').order('holiday_date')),
      safeTableResult(supabase.from('resources').select('*').order('sort_order').order('name')),
    ])

    if (s.data) setServices(s.data)
    if (st.data) setStaff(st.data.map(normalizeStaffRow))
    if (sh.data) setStaffShifts(sh.data.map(normalizeScheduleRow))
    if (br.data) setStaffBreaks(br.data)
    if (to.data) setStaffTimeOff(to.data.map(normalizeScheduleRow))
    if (bs.data) setBlockedSlots(bs.data.map(normalizeScheduleRow))
    setLocations(loc.data || [])
    setProviderGroups(providerGroupRows.data || [])
    setHolidays(hol.data || [])
    setResources(res.data || [])
    setAvailableTables((current) => ({
      ...current,
      locations: Boolean(loc.available),
      providerGroups: Boolean(providerGroupRows.available),
      holidays: Boolean(hol.available),
      resources: Boolean(res.available),
    }))
    if (setRows.data) setSettings(reduceSettingsRows(setRows.data))

    setBaseLoaded(true)
    if (showLoading) setLoading(false)
  }

  const loadDashboardAnalyticsData = async () => {
    const [b, o, tx, cust, ut, r] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      safeTableResult(supabase.from('transactions').select('*').order('created_at', { ascending: false })),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      safeTableResult(supabase.from('user_tickets').select('*').order('created_at', { ascending: false })),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ])

    if (b.data) setBookings(b.data)
    if (o.data) setOrders(o.data)
    setTransactions(tx.data || [])
    if (cust.data) setUsers(cust.data)
    setUserTickets(ut.data || [])
    if (r.data) setReviews(r.data)
    setAvailableTables((current) => ({ ...current, transactions: Boolean(tx.available) }))
    markTabsLoaded(['dashboard', 'analytics'])
  }

  const loadBookingsData = async () => {
    const [b, o, tx, bookingResourceAllocationRows] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      safeTableResult(supabase.from('transactions').select('*').order('created_at', { ascending: false })),
      safeTableResult(supabase.from('booking_resource_allocations').select('*').order('booking_id').order('resource_id')),
    ])

    if (b.data) setBookings(b.data)
    if (o.data) setOrders(o.data)
    setTransactions(tx.data || [])
    setBookingResourceAllocations(bookingResourceAllocationRows.data || [])
    setAvailableTables((current) => ({
      ...current,
      transactions: Boolean(tx.available),
      bookingResourceAllocations: Boolean(bookingResourceAllocationRows.available),
    }))
    markTabsLoaded(['bookings'])
  }

  const loadOrdersTransactionsData = async () => {
    const [b, o, tx, cust] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      safeTableResult(supabase.from('transactions').select('*').order('created_at', { ascending: false })),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
    ])

    if (b.data) setBookings(b.data)
    if (o.data) setOrders(o.data)
    setTransactions(tx.data || [])
    if (cust.data) setUsers(cust.data)
    setAvailableTables((current) => ({ ...current, transactions: Boolean(tx.available) }))
    markTabsLoaded(['orders', 'transactions'])
  }

  const loadCustomersData = async () => {
    const profilesPromise = fetch('/api/admin/member-profiles', { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || '會員帳號資料載入失敗')
        }
        return Array.isArray(payload?.profiles) ? payload.profiles : []
      })
      .catch((error) => {
        toast.error(`會員帳號資料載入失敗：${error?.message || '未知錯誤'}`)
        return []
      })

    const [cust, b, o, tx, ut, sp, profiles] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      safeTableResult(supabase.from('transactions').select('*').order('created_at', { ascending: false })),
      safeTableResult(supabase.from('user_tickets').select('*').order('created_at', { ascending: false })),
      supabase.from('service_packages').select('*'),
      profilesPromise,
    ])

    if (cust.data) setUsers(cust.data)
    if (b.data) setBookings(b.data)
    if (o.data) setOrders(o.data)
    setTransactions(tx.data || [])
    setUserTickets(ut.data || [])
    if (sp.data) setServicePackages(sp.data)
    setMemberProfiles(profiles)
    setAvailableTables((current) => ({ ...current, transactions: Boolean(tx.available) }))
    markTabsLoaded(['customers'])
  }

  const loadInventoryData = async () => {
    const [p, sp, t] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('service_packages').select('*'),
      supabase.from('tickets').select('*'),
    ])
    if (p.data) setProducts(p.data)
    if (sp.data) setServicePackages(sp.data)
    if (t.data) setTickets(t.data)
    markTabsLoaded(['inventory'])
  }

  const loadServiceRelationsData = async () => {
    const [serviceLocationRows, serviceProviderGroupRows, serviceResourceRows] = await Promise.all([
      safeTableResult(supabase.from('service_locations').select('*').order('service_id').order('location_id')),
      safeTableResult(supabase.from('service_provider_groups').select('*').order('service_id').order('provider_group_id')),
      safeTableResult(supabase.from('service_resources').select('*').order('service_id').order('resource_id')),
    ])
    setServiceLocations(serviceLocationRows.data || [])
    setServiceProviderGroups(serviceProviderGroupRows.data || [])
    setServiceResources(serviceResourceRows.data || [])
    setAvailableTables((current) => ({
      ...current,
      serviceLocations: Boolean(serviceLocationRows.available),
      serviceProviderGroups: Boolean(serviceProviderGroupRows.available),
      serviceResources: Boolean(serviceResourceRows.available),
    }))
    markTabsLoaded(['services'])
  }

  const loadContentData = async () => {
    const [art, f] = await Promise.all([
      supabase.from('articles').select('*').order('sort_order'),
      supabase.from('faqs').select('*').order('sort_order'),
    ])
    if (art.data) setArticles(art.data)
    if (f.data) setFaqs(f.data)
    markTabsLoaded(['articles', 'faqs'])
  }

  const loadCouponsData = async () => {
    const c = await supabase.from('coupons').select('*')
    if (c.data) setCoupons(c.data)
    markTabsLoaded(['coupons'])
  }

  const loadAdminProfilesData = async () => {
    try {
      const response = await fetch('/api/admin/member-profiles', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || '管理員帳號資料載入失敗')
      }
      setMemberProfiles(Array.isArray(payload?.profiles) ? payload.profiles : [])
    } catch (error) {
      toast.error(`管理員帳號資料載入失敗：${error?.message || '未知錯誤'}`)
      setMemberProfiles([])
    }
    markTabsLoaded(['settings'])
  }

  const loadAuditLogsData = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || '安全紀錄載入失敗')
      }
      setAuditLogs(Array.isArray(payload?.logs) ? payload.logs : [])
    } catch (error) {
      toast.error(`安全紀錄載入失敗：${error?.message || '未知錯誤'}`)
      setAuditLogs([])
    }
    markTabsLoaded(['security'])
  }

  const loadTabData = async (tabId, { force = false } = {}) => {
    if (!tabId || !isAuthenticated) return
    if (tabDataLoaded[tabId] && !force) return

    setTabLoadingState((current) => ({ ...current, [tabId]: true }))
    try {
      if (tabId === 'dashboard' || tabId === 'analytics') {
        await loadDashboardAnalyticsData()
      } else if (tabId === 'bookings') {
        await loadBookingsData()
      } else if (tabId === 'orders' || tabId === 'transactions') {
        await loadOrdersTransactionsData()
      } else if (tabId === 'customers') {
        await loadCustomersData()
      } else if (tabId === 'inventory') {
        await loadInventoryData()
      } else if (tabId === 'services') {
        await loadServiceRelationsData()
      } else if (tabId === 'articles' || tabId === 'faqs') {
        await loadContentData()
      } else if (tabId === 'coupons') {
        await loadCouponsData()
      } else if (tabId === 'settings') {
        await loadAdminProfilesData()
      } else if (tabId === 'security') {
        await loadAuditLogsData()
      } else {
        markTabsLoaded([tabId])
      }
    } finally {
      setTabLoadingState((current) => ({ ...current, [tabId]: false }))
    }
  }

  const fetchData = async () => {
    setTabDataLoaded({})
    await loadBaseData({ showLoading: true })
    await loadTabData(activeTab, { force: true })
  }

  useEffect(() => {
    if (!isAuthenticated || !authChecked || !baseLoaded) return
    loadTabData(activeTab)
  }, [activeTab, authChecked, baseLoaded, isAuthenticated])

  const refreshStaffTableState = async (table) => {
    switch (table) {
      case 'staff': {
        const { data, error } = await supabase.from('staff').select('*').order('id')
        if (error) throw error
        if (data) setStaff(data.map(normalizeStaffRow))
        return
      }
      case 'staff_shifts': {
        const { data, error } = await supabase.from('staff_shifts').select('*')
        if (error) throw error
        if (data) setStaffShifts(data)
        return
      }
      case 'staff_breaks': {
        const { data, error } = await supabase.from('staff_breaks').select('*').order('staff_id').order('day_of_week')
        if (error) throw error
        if (data) setStaffBreaks(data)
        return
      }
      case 'staff_time_off': {
        const { data, error } = await supabase.from('staff_time_off').select('*').order('date')
        if (error) throw error
        if (data) setStaffTimeOff(data.map(normalizeScheduleRow))
        return
      }
      case 'blocked_slots': {
        const { data, error } = await supabase.from('blocked_slots').select('*').order('date')
        if (error) throw error
        if (data) setBlockedSlots(data.map(normalizeScheduleRow))
        return
      }
      default:
        return
    }
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

  const normalizeScheduleTablePayload = ({ table, row }) => {
    const payload = { ...row }

    if (table === 'staff_time_off') {
      payload.is_all_day = Boolean(payload.is_all_day)
      if (payload.is_all_day) {
        payload.start_time = null
        payload.end_time = null
      } else {
        const nextStart = typeof payload.start_time === 'string' ? payload.start_time.trim() : payload.start_time
        const nextEnd = typeof payload.end_time === 'string' ? payload.end_time.trim() : payload.end_time
        payload.start_time = nextStart ? String(nextStart).substring(0, 5) : null
        payload.end_time = nextEnd ? String(nextEnd).substring(0, 5) : null
      }
    }

    if (table === 'staff_breaks' || table === 'blocked_slots') {
      payload.start_time = payload.start_time ? String(payload.start_time).substring(0, 5) : null
      payload.end_time = payload.end_time ? String(payload.end_time).substring(0, 5) : null
    }

    return payload
  }

  const ensureValidTimeRange = ({ table, row, label }) => {
    if (table === 'staff_time_off' && row?.is_all_day) {
      return {
        ...row,
        start_time: null,
        end_time: null,
      }
    }
    if (row?.is_off) return row

    if (!row?.start_time || !row?.end_time) {
      throw new Error(`${label}需要同時設定開始與結束時間`)
    }
    if (String(row.start_time) >= String(row.end_time)) {
      throw new Error(`${label}的結束時間必須晚於開始時間`)
    }
    return row
  }

  const validateTimeBoundRowStrict = ({ row, label }) => {
    if (!row?.start_time || !row?.end_time) {
      throw new Error(`${label}需要同時設定開始與結束時間`)
    }
    if (String(row.start_time) >= String(row.end_time)) {
      throw new Error(`${label}的結束時間必須晚於開始時間`)
    }
    return row
  }

  const validateScheduleTableRowStrict = ({ table, row }) => {
    const label = scheduleTableLabels[table] || '排班設定'

    if (table === 'staff_time_off') {
      if (row?.is_all_day) {
        return {
          ...row,
          start_time: null,
          end_time: null,
        }
      }
      return validateTimeBoundRowStrict({ row, label })
    }

    if (table === 'staff_breaks' || table === 'blocked_slots') {
      return validateTimeBoundRowStrict({ row, label })
    }

    if (table === 'staff_shifts' && row?.is_off) return row
    return validateTimeBoundRowStrict({ row, label })
  }

  const validateAdminProfilesDraft = (profiles = []) => {
    const invalidProfiles = (profiles || []).filter(
      (profile) => profile?.is_admin === true && (!profile?.auth_user_exists || profile?.account_status !== 'ready'),
    )

    if (invalidProfiles.length === 0) return

    const labels = invalidProfiles
      .map((profile) => profile?.email || profile?.auth_email || profile?.full_name || profile?.id)
      .filter(Boolean)

    throw new Error(`以下帳號未完成註冊或沒有對應登入帳號，不能開通管理員：${labels.join('、')}`)
  }

  const bumpAvailabilityCacheVersion = async () => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'availability_cache_version', value: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }

  const saveCollection = async (table, rows = [], deletedIds = []) => {
    const payload = (rows || [])
      .filter((row) => !row?.__deleted)
      .map((row) => {
        const item = stripTransientFields(row)
        if (!Number.isInteger(Number(item.id)) || Number(item.id) <= 0 || Number(item.id) > 2147483647) {
          delete item.id
        } else {
          item.id = Number(item.id)
        }
        return item
      })

    if (payload.length > 0) {
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

      const payload = (shifts || []).map((shift) => {
        const row = { ...shift }
        row.date = row.date ? String(row.date).substring(0, 10) : row.date
        if (!Number.isInteger(Number(row.id)) || Number(row.id) <= 0 || Number(row.id) > 2147483647) {
          delete row.id
        } else {
          row.id = Number(row.id)
        }
        if (row.staff_id != null && row.staff_id !== '') row.staff_id = Number(row.staff_id)
        row.is_off = Boolean(row.is_off)
        row.start_time = row.is_off ? null : (row.start_time ? String(row.start_time).substring(0, 5) : null)
        row.end_time = row.is_off ? null : (row.end_time ? String(row.end_time).substring(0, 5) : null)
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

      await bumpAvailabilityCacheVersion()
      await refreshStaffTableState('staff_shifts')
      if (!silentSuccess) toast.success('已儲存班次')
      return { ok: true, rows: payload }
    } catch (error) {
      toast.error(`班次儲存失敗：${error?.message || '未知錯誤'}`)
      throw error
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
          const payload = normalizeScheduleTablePayload({ table, row: stripTransientFields({ ...row }) })
          if (table === 'staff_time_off') {
            payload.is_all_day = Boolean(payload.is_all_day)
            if (payload.is_all_day) {
              payload.start_time = null
              payload.end_time = null
            } else {
              payload.start_time =
                typeof payload.start_time === 'string' && payload.start_time.trim()
                  ? String(payload.start_time).substring(0, 5)
                  : null
              payload.end_time =
                typeof payload.end_time === 'string' && payload.end_time.trim()
                  ? String(payload.end_time).substring(0, 5)
                  : null
            }
          }
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

          const label = scheduleTableLabels[table] || '排班設定'
          return validateScheduleTableRowStrict({ table, row: payload })
        })
      const normalizedDeletedIds = (deletedIds || [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && value <= 2147483647)

      const { issues } = analyzeScheduleRows({ table, rows: normalizedRows, bookings })
      if (issues.length > 0) {
        throw new Error(formatScheduleIssues(issues))
      }

      setSaving(true)
      if (normalizedRows.length > 0) {
        if (onConflict) {
          const { error } = await supabase.from(table).upsert(normalizedRows, { onConflict })
          if (error) throw error
        } else {
          const rowsWithId = normalizedRows.filter((row) => Number.isInteger(Number(row.id)) && Number(row.id) > 0)
          const rowsWithoutId = normalizedRows.filter((row) => !Number.isInteger(Number(row.id)) || Number(row.id) <= 0)

          for (const row of rowsWithId) {
            const { id, ...payload } = row
            const { error } = await supabase.from(table).update(payload).eq('id', id)
            if (error) throw error
          }

          if (rowsWithoutId.length > 0) {
            const insertPayload = rowsWithoutId.map(({ id, ...payload }) => payload)
            const { error } = await supabase.from(table).insert(insertPayload)
            if (error) throw error
          }
        }
      }

      if (normalizedDeletedIds.length > 0) {
        const { error } = await supabase.from(table).delete().in('id', normalizedDeletedIds)
        if (error) throw error
      }

      await bumpAvailabilityCacheVersion()
      await refreshStaffTableState(table)
      if (!silentSuccess) toast.success(`已儲存${scheduleTableLabels[table] || '排班設定'}`)
      return { ok: true, rows: normalizedRows }
    } catch (error) {
      toast.error(`${scheduleTableLabels[table] || table}儲存失敗：${error?.message || '未知錯誤'}`)
      throw error
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
      await bumpAvailabilityCacheVersion()
      await loadBaseData({ showLoading: false })
      toast.success('已儲存地點')
    } catch (error) {
      toast.error(`地點儲存失敗：${error?.message || '未知錯誤'}`)
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
      await bumpAvailabilityCacheVersion()
      await loadBaseData({ showLoading: false })
      toast.success('已儲存假期')
    } catch (error) {
      toast.error(`假期儲存失敗：${error?.message || '未知錯誤'}`)
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
      await bumpAvailabilityCacheVersion()
      await loadBaseData({ showLoading: false })
      toast.success('已儲存資源設備')
    } catch (error) {
      toast.error(`資源設備儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const saveStaff = async (targetStaffId = null, options = {}) => {
    const silentSuccess = Boolean(options?.silentSuccess)
    setSaving(true)
    try {
      const rowsToSave = targetStaffId == null ? staff : staff.filter((item) => item.id === targetStaffId)
      const savedRows = []
      for (const item of rowsToSave) {
        const normalizedSchedule = Object.entries(item.schedule || {}).reduce((acc, [dayKey, value]) => {
          const start = String(value?.start || '').substring(0, 5)
          const end = String(value?.end || '').substring(0, 5)
          if (!start && !end) return acc
          if (!start || !end) {
            throw new Error(`${WEEKDAY_LABELS[dayKey] || `星期 ${dayKey}`} 必須同時設定上班與下班時間`)
          }
          const startMin = parseTimeToMinutes(start)
          const endMin = parseTimeToMinutes(end)
          if (startMin == null || endMin == null || startMin >= endMin) {
            throw new Error(`${WEEKDAY_LABELS[dayKey] || `星期 ${dayKey}`} 的上班時間必須早於下班時間`)
          }
          acc[dayKey] = {
            start,
            end,
          }
          return acc
        }, {})
        const payload = {
          id: item.id,
          name: item.name || '新服務供應者',
          role: item.role || '頭皮護理師',
          phone: item.phone || '',
          photo_url: item.photo_url || '',
          bio: item.bio || '',
          enabled: item.enabled !== false,
          schedule: normalizedSchedule,
          services: Array.isArray(item.services) ? item.services : [],
          daysOff: Array.isArray(item.daysOff) ? item.daysOff : [],
          location_id: normalizeNullableNumber(item.location_id),
          provider_group_id: normalizeNullableNumber(item.provider_group_id),
        }
        if (!Number.isInteger(Number(payload.id)) || Number(payload.id) <= 0 || Number(payload.id) > 2147483647) {
          delete payload.id
        } else {
          payload.id = Number(payload.id)
        }
        const { data, error } = await supabase.from('staff').upsert(payload).select().single()
        if (error) throw error
        if (data) savedRows.push(data)
      }
      await bumpAvailabilityCacheVersion()
      await refreshStaffTableState('staff')
      if (!silentSuccess) toast.success('已儲存目前服務供應者')
      return targetStaffId == null ? savedRows : savedRows[0] || null
    } catch (error) {
      toast.error(`服務供應者儲存失敗：${error?.message || '未知錯誤'}`)
      throw error
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

      await bumpAvailabilityCacheVersion()
      await loadBaseData({ showLoading: false })
      await loadServiceRelationsData()
      toast.success('已儲存服務')
    } catch (error) {
      toast.error(`服務儲存失敗：${error?.message || '未知錯誤'}`)
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
      await loadInventoryData({ force: true })
      toast.success('已儲存庫存')
    } catch (error) {
      toast.error(`庫存儲存失敗：${error?.message || '未知錯誤'}`)
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
      await loadOrdersTransactionsData({ force: true })
      if (tabDataLoaded.dashboard || tabDataLoaded.analytics) {
        await loadDashboardAnalyticsData({ force: true })
      }
      toast.success('已儲存交易紀錄')
    } catch (error) {
      toast.error(`交易紀錄儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const saveCoupons = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.coupons || []
      await saveCollection('coupons', rows)
      await loadCouponsData({ force: true })
      toast.success('已儲存優惠碼')
    } catch (error) {
      toast.error(`優惠碼儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (newSettings) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: newSettings || {} }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        await loadBaseData({ showLoading: false })
        throw new Error(result?.error || '設定儲存失敗')
      }
      await bumpAvailabilityCacheVersion()
      await loadBaseData({ showLoading: false })
      toast.success('已儲存設定')
    } catch (error) {
      toast.error(`設定儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const saveAdminProfiles = async (profiles) => {
    setSaving(true)
    try {
      validateAdminProfilesDraft(profiles)
      const payload = (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email || null,
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        is_admin: profile.is_admin === true,
      }))

      if (payload.length > 0) {
        const response = await fetch('/api/admin/member-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profiles: payload }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result?.error || '未知錯誤')
      }

      await loadAdminProfilesData()
      toast.success('已儲存管理員帳號設定')
    } catch (error) {
      toast.error(`管理員帳號儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      toast.error(`預約狀態更新失敗：${error.message}`)
      return false
    }
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)))
    toast.success('已更新預約狀態')
    return true
  }

  const updateBookingStaff = async (id, staffId) => {
    const nextStaffId = staffId === '' || staffId == null ? null : Number(staffId)
    const targetBooking = bookings.find((booking) => booking.id === id)

    if (nextStaffId == null) {
      const { error } = await supabase
        .from('bookings')
        .update({
          staff_id: null,
          staff_name: null,
        })
        .eq('id', id)
      if (error) {
        toast.error(`預約服務供應者儲存失敗：${error.message}`)
        return false
      }

      setBookings((current) =>
        current.map((booking) => (booking.id === id ? { ...booking, staff_id: null, staff_name: null } : booking))
      )
      toast.success('已儲存預約')
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
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          staff_id: nextStaffId,
          staff_name: matchedStaff ? matchedStaff.name : null,
        })
        .eq('id', id)
      if (updateError) throw updateError

      setBookings((current) =>
        current.map((booking) =>
          booking.id === id
            ? { ...booking, staff_id: nextStaffId, staff_name: matchedStaff ? matchedStaff.name : null }
            : booking
        )
      )
      toast.success('已更新預約')
      return true
    } catch (error) {
      toast.error(`可用時段檢查失敗：${error?.message || '未知錯誤'}`)
      return false
    }
  }

  const addStaff = () => {
    const tempIds = staff.map((item) => Number(item.id)).filter((value) => Number.isFinite(value) && value < 0)
    const newId = tempIds.length ? Math.min(...tempIds) - 1 : -1
    setStaff([
      ...staff,
      {
        id: newId,
        name: '新服務供應者',
        role: '頭皮護理師',
        phone: '',
        enabled: true,
        schedule: {},
        services: [],
        daysOff: [],
        photo_url: '',
        bio: '',
      },
    ])
  }

  const deleteStaff = async (id) => {
    if (!confirm('確定要刪除這位服務供應者嗎？')) return
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

  const setDailyMode = (staffId, dayKey, mode) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const daysOff = item.daysOff || []
        const hasDay = daysOff.includes(dayKey)
        if (mode === 'rest') {
          return hasDay ? item : { ...item, daysOff: [...daysOff, dayKey] }
        }
        if (mode === 'work') {
          const nextDaysOff = hasDay ? daysOff.filter((day) => day !== dayKey) : daysOff
          const businessHours = parseBusinessHours(settings?.business_hours)
          const currentSchedule = item.schedule?.[dayKey] || {}
          const nextSchedule =
            currentSchedule.start || currentSchedule.end
              ? currentSchedule
              : {
                  start: businessHours.start,
                  end: businessHours.end,
                }
          return {
            ...item,
            daysOff: nextDaysOff,
            schedule: {
              ...(item.schedule || {}),
              [dayKey]: nextSchedule,
            },
          }
        }
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
        const nextDaysOff = (item.daysOff || []).filter((entry) => String(entry) !== String(day))
        return {
          ...item,
          daysOff: nextDaysOff,
          schedule: { ...schedule, [day]: { ...schedule[day], [field]: value } },
        }
      })
    )
  }

  const updateCustomer = async (id, updates) => {
    await supabase.from('customers').update(updates).eq('id', id)
    setUsers((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    toast.success('已儲存顧客資料')
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
  const pendingOrderCount = orders.filter((order) => ['awaiting_payment', 'pending', 'processing'].includes(String(order?.status || '').toLowerCase())).length
  const publicSiteUrl = settings.site_url || '/'
  const adminOpsTiles = [
    {
      label: '網站狀態',
      value: settings.site_url ? '已連公開網址' : '待填正式網域',
      note: settings.shop_name || 'PANDORA HEAD SPA',
      tone: settings.site_url ? 'success' : 'warning',
    },
    {
      label: '今日預約',
      value: `${stats.todayBookings} 個`,
      note: `${stats.pending} 個待確認`,
      tone: stats.pending ? 'warning' : 'success',
    },
    {
      label: '待處理訂單',
      value: `${pendingOrderCount} 張`,
      note: '含套票人工付款與處理中訂單',
      tone: pendingOrderCount ? 'warning' : 'success',
    },
    {
      label: '付款方式',
      value: settings.stripe_enabled === 'true' ? 'Stripe 已啟用' : 'Stripe 待檢查',
      note: settings.manual_payment_enabled !== 'false' ? '保留人工確認付款' : '只用線上付款',
      tone: settings.stripe_enabled === 'true' ? 'success' : 'warning',
    },
    {
      label: '會員套票',
      value: `${stats.activeTickets} 張可用`,
      note: '可追蹤扣次與回補紀錄',
      tone: stats.activeTickets ? 'success' : 'neutral',
    },
  ]
  const tabCounters = {
    bookings: stats.pending ? `${stats.pending}` : '',
    orders: pendingOrderCount ? `${pendingOrderCount}` : '',
    inventory: `${products.length + servicePackages.length + tickets.length}`,
    services: `${services.length}`,
    customers: `${users.length}`,
    tickets: `${stats.activeTickets}`,
    articles: `${articles.length}`,
    faqs: `${faqs.length}`,
    staff: `${staff.length}`,
    locations: `${locations.length}`,
    resources: `${resources.length}`,
  }

  const activeTabMeta = tabMeta[activeTab] || {
    title: '管理後台',
    eyebrow: '營運控制台',
    description: '管理預約、排班、銷售、顧客與內容設定。',
  }

  const renderActiveContent = () => {
    if (baseLoaded && tabLoadingState[activeTab] && !tabDataLoaded[activeTab]) {
      return (
        <div className="admin-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-light)' }}>
          {tabLoadingMessage}
        </div>
      )
    }

    if (activeTab === 'dashboard') return <DashboardTab stats={stats} bookings={bookings} orders={orders} transactions={transactions} customers={users} userTickets={userTickets} onOpenTab={setActiveTab} />
    if (activeTab === 'analytics') return <AnalyticsTab bookings={bookings} orders={orders} transactions={transactions} users={users} userTickets={userTickets} reviews={reviews} />
    if (activeTab === 'orders') return <OrdersTab orders={orders} bookings={bookings} customers={users} transactions={transactions} locations={locations} providerGroups={providerGroups} saving={saving} />
    if (activeTab === 'bookings') return <BookingsTab bookings={bookings} staff={staff} services={services} locations={locations} providerGroups={providerGroups} resources={resources} transactions={transactions} orders={orders} bookingResourceAllocations={bookingResourceAllocations} onUpdateStatus={updateStatus} onUpdateBookingStaff={updateBookingStaff} compact={isCompactAdmin} />
      if (activeTab === 'staff') {
        return (
          <SchedulingTab
            staff={staff}
            bookings={bookings}
            services={services}
            operationalContext={{
              locations,
              providerGroups,
              holidays,
              settings,
              serviceLocations,
              serviceProviderGroups,
              availableTables,
            }}
            staffShifts={staffShifts}
            staffBreaks={staffBreaks}
            staffTimeOff={staffTimeOff}
            blockedSlots={blockedSlots}
          onAddStaff={addStaff}
          onDeleteStaff={deleteStaff}
          onUpdateField={updateStaffField}
          onToggleService={toggleStaffService}
          onSetDailyMode={setDailyMode}
          onUpdateSchedule={updateStaffSchedule}
          onSave={saveStaff}
          onSaveShifts={saveShifts}
          onSaveBreaks={saveStaffBreaks}
          onSaveTimeOff={saveStaffTimeOff}
          onSaveBlockedSlots={saveBlockedSlots}
          saving={saving}
          compact={isCompactAdmin}
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
          compact={isCompactAdmin}
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
    if (activeTab === 'security') return <SecurityLogsTab logs={auditLogs} onRefresh={() => loadAuditLogsData()} />
    if (activeTab === 'customers') {
      return (
        <CustomersTab
          memberProfiles={memberProfiles}
          users={users}
          bookings={bookings}
          orders={orders}
          transactions={transactions}
          userTickets={userTickets}
          servicePackages={servicePackages}
          compact={isCompactAdmin}
        />
      )
    }
    if (activeTab === 'settings') {
      return (
        <SettingsTab
          settings={settings}
          saveSettings={saveSettings}
          saving={saving}
          memberProfiles={memberProfiles}
          saveAdminProfiles={saveAdminProfiles}
          compact={isCompactAdmin}
        />
      )
    }
    return null
  }

  if (!authChecked || loading) return <div style={{ padding: '100px', textAlign: 'center' }}>載入管理後台中...</div>
  if (!isAuthenticated) return <div style={{ padding: '100px', textAlign: 'center' }}>正在檢查管理權限...</div>

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.68)' }}>PANDORA HEAD SPA</div>
          <h2 style={{ fontSize: '18px', margin: '4px 0 0' }}>管理後台</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={publicSiteUrl} target="_blank" rel="noreferrer" className="admin-topbar-link">
            查看網站
          </a>
          <button onClick={fetchData} className="admin-topbar-button">
            重新整理
          </button>
          <button onClick={handleLogout} className="admin-topbar-button ghost">
            登出
          </button>
        </div>
      </header>

      <div className="admin-workspace" style={{ padding: isCompactAdmin ? '14px' : '20px', flexDirection: isCompactAdmin ? 'column' : 'row' }}>
        <aside className="admin-card admin-sidebar" style={{ width: isCompactAdmin ? '100%' : '280px', position: isCompactAdmin ? 'static' : 'sticky' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>管理導航</div>
          <h3 style={{ margin: '8px 0 0', fontSize: '20px', fontWeight: 800 }}>營運控制台</h3>
          <p style={{ margin: '10px 0 18px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
            以分組方式管理預約、排班、營運、內容與系統設定，避免所有功能擠在同一個長頁面。
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {tabGroups.map((group) => (
              <div key={group.name}>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: '#9A8A78', marginBottom: '8px', textTransform: 'uppercase' }}>{group.name}</div>
                <div style={{ display: isCompactAdmin ? 'flex' : 'grid', gap: '6px', overflowX: isCompactAdmin ? 'auto' : 'visible', paddingBottom: isCompactAdmin ? '4px' : 0 }}>
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
                          minWidth: isCompactAdmin ? '116px' : 'auto',
                          borderRadius: '12px',
                          border: isActive ? '1px solid rgba(166, 139, 106, 0.35)' : '1px solid transparent',
                          background: isActive ? '#FBF6EF' : 'transparent',
                          color: isActive ? '#7C6245' : '#5B5B5B',
                          fontSize: '14px',
                          fontWeight: isActive ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{tab.name}</span>
                        {tabCounters[tab.id] ? <span className="admin-nav-count">{tabCounters[tab.id]}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main style={{ flex: '1 1 900px', minWidth: 0, width: isCompactAdmin ? '100%' : 'auto' }}>
          <div className="admin-ops-grid" style={{ gridTemplateColumns: isCompactAdmin ? '1fr' : 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {adminOpsTiles.map((tile) => (
              <div key={tile.label} className={`admin-ops-tile ${tile.tone}`}>
                <div className="admin-ops-label">{tile.label}</div>
                <div className="admin-ops-value">{tile.value}</div>
                <div className="admin-ops-note">{tile.note}</div>
              </div>
            ))}
          </div>
          <div className="admin-card" style={{ padding: '22px', marginBottom: '20px', border: '1px solid rgba(166, 139, 106, 0.18)', background: 'linear-gradient(135deg, #fff, #FBF8F4)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>{activeTabMeta.eyebrow}</div>
            <div style={{ marginTop: '6px', fontSize: isCompactAdmin ? '20px' : '24px', fontWeight: 800, color: 'var(--text)' }}>{activeTabMeta.title}</div>
            <div style={{ marginTop: '8px', maxWidth: '760px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-light)' }}>{activeTabMeta.description}</div>
          </div>

          {renderActiveContent()}
        </main>
      </div>
    </div>
  )
}



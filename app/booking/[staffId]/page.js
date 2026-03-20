'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { bookingOpsCopy } from '../../components/admin/opsUi'

const MONTH_SUMMARY_CACHE_TTL_MS = 60 * 1000
const DAILY_SLOTS_CACHE_TTL_MS = 30 * 1000
const monthSummaryCache = new Map()
const dailySlotsCache = new Map()

const fieldStyle = {
  width: '100%',
  minHeight: '46px',
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #D6D3D1',
  background: '#fff',
  fontSize: '14px',
  color: '#1F2937',
}

const panelStyle = {
  padding: '22px',
  border: '1px solid #E8E0D5',
  borderRadius: '24px',
  background: '#fff',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.04)',
}

const LEGACY_T = {
  title: '線上預約',
  intro: '先選擇服務、日期，再從下拉選單選擇可預約的時段。',
  loadingStaff: '載入服務供應者資料中…',
  loadingBootstrapFailed: '無法載入預約資料',
  noStaffFound: '找不到這位服務供應者',
  backToBooking: '返回預約頁',
  serviceProvider: '服務供應者',
  service: '服務',
  businessHours: '營業時間',
  customerName: '顧客姓名',
  customerNamePlaceholder: '請輸入顧客姓名',
  customerPhone: '聯絡電話',
  customerPhonePlaceholder: '請輸入聯絡電話',
  date: '日期',
  time: '時間',
  chooseDateThenTime: '先選日期，再選時間',
  bookingSummary: '預約摘要',
  amountDue: '應付金額',
  monthPrev: '上月',
  monthNext: '下月',
  chooseDate: '選擇日期',
  collapseCalendar: '收起月曆',
  contactLabel: '查詢電話',
  timeDropdown: '可預約時段',
  submit: '提交預約',
  submitted: '預約已送出',
  submitFailed: '預約失敗',
  available: bookingOpsCopy.available,
  full: bookingOpsCopy.full,
  off: bookingOpsCopy.rest,
  chooseDateFirst: bookingOpsCopy.chooseDateFirst,
  chooseTimeFirst: bookingOpsCopy.chooseTimeFirst,
  loadingDates: bookingOpsCopy.loadingDates,
  loadingSlots: bookingOpsCopy.loadingSlots,
  noAvailability: bookingOpsCopy.noAvailability,
  fullNote: bookingOpsCopy.fullDayHint,
  configLimitedNote: bookingOpsCopy.limitedDayHint,
  offNote: bookingOpsCopy.offDayHint,
  restDay: bookingOpsCopy.restDay,
}

const T = {
  title: '線上預約',
  intro: '先選擇服務與日期，再從下拉選單揀可預約時段。',
  loadingStaff: '載入服務供應者資料中...',
  loadingBootstrapFailed: '無法載入預約資料',
  noStaffFound: '找不到這位服務供應者',
  backToBooking: '返回預約頁',
  serviceProvider: '服務供應者',
  service: '服務',
  businessHours: '營業時間',
  customerName: '顧客姓名',
  customerNamePlaceholder: '請輸入顧客姓名',
  customerPhone: '聯絡電話',
  customerPhonePlaceholder: '請輸入聯絡電話',
  date: '日期',
  time: '時間',
  chooseDateThenTime: '先選日期，再選時間',
  bookingSummary: '預約摘要',
  amountDue: '應付金額',
  monthPrev: '上月',
  monthNext: '下月',
  chooseDate: '選擇日期',
  collapseCalendar: '收起月曆',
  contactLabel: '查詢電話',
  timeDropdown: '可預約時段',
  submit: '提交預約',
  submitted: '預約已送出',
  submitFailed: '提交預約失敗',
  available: bookingOpsCopy.available,
  full: bookingOpsCopy.full,
  off: bookingOpsCopy.rest,
  chooseDateFirst: bookingOpsCopy.chooseDateFirst,
  chooseTimeFirst: bookingOpsCopy.chooseTimeFirst,
  loadingDates: bookingOpsCopy.loadingDates,
  loadingSlots: bookingOpsCopy.loadingSlots,
  noAvailability: bookingOpsCopy.noAvailability,
  fullNote: bookingOpsCopy.fullDayHint,
  configLimitedNote: bookingOpsCopy.limitedDayHint,
  offNote: bookingOpsCopy.offDayHint,
  restDay: bookingOpsCopy.restDay,
}

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

Object.assign(T, {
  title: '線上預約',
  intro: '先選擇服務與日期，再從下拉選單選擇可預約時段。',
  loadingStaff: '載入服務供應者資料中...',
  loadingBootstrapFailed: '無法載入預約資料',
  noStaffFound: '找不到這位服務供應者',
  backToBooking: '返回預約頁',
  serviceProvider: '服務供應者',
  service: '服務',
  businessHours: '營業時間',
  customerName: '顧客姓名',
  customerNamePlaceholder: '請輸入顧客姓名',
  customerPhone: '聯絡電話',
  customerPhonePlaceholder: '請輸入聯絡電話',
  date: '日期',
  time: '時間',
  chooseDateThenTime: '先選日期，再選時間',
  bookingSummary: '預約摘要',
  amountDue: '應付金額',
  monthPrev: '上月',
  monthNext: '下月',
  chooseDate: '選擇日期',
  collapseCalendar: '收起月曆',
  contactLabel: '查詢電話',
  timeDropdown: '可預約時段',
  submit: '提交預約',
  submitted: '預約已送出',
  submitFailed: '提交預約失敗',
})

DAY_LABELS.splice(0, DAY_LABELS.length, '一', '二', '三', '四', '五', '六', '日')

Object.assign(T, {
  title: '線上預約',
  intro: '先選擇服務與日期，再從下拉選單選擇可預約時段。',
  loadingStaff: '載入服務供應者資料中...',
  loadingBootstrapFailed: '無法載入預約資料',
  noStaffFound: '找不到這位服務供應者',
  backToBooking: '返回預約頁',
  serviceProvider: '服務供應者',
  service: '服務',
  businessHours: '營業時間',
  customerName: '顧客姓名',
  customerNamePlaceholder: '請輸入顧客姓名',
  customerPhone: '聯絡電話',
  customerPhonePlaceholder: '請輸入聯絡電話',
  date: '日期',
  time: '時間',
  chooseDateThenTime: '先選日期，再選時間',
  bookingSummary: '預約摘要',
  amountDue: '應付金額',
  monthPrev: '上月',
  monthNext: '下月',
  chooseDate: '選擇日期',
  collapseCalendar: '收起月曆',
  contactLabel: '查詢電話',
  timeDropdown: '可預約時段',
  submit: '提交預約',
  submitted: '預約已送出',
  submitFailed: '提交預約失敗',
})

DAY_LABELS.splice(0, DAY_LABELS.length, '一', '二', '三', '四', '五', '六', '日')

const getReasonMessageDisplay = (summary) => {
  if (!summary) return ''
  if (summary.status === 'off') return '休息日'
  if (summary.status !== 'full') return ''
  if (summary.reason === 'fully_booked' || summary.reason === 'resource_full') return '有上班，但今天已滿'
  if (summary.reason === 'provider_mismatch' || summary.reason === 'location_required' || summary.reason === 'no_bookable_slots') {
    return '已安排上班，但此服務目前未形成可預約時段'
  }
  return bookingOpsCopy.limitedDayHint
}

const getReasonMessageClean = (summary) => {
  if (!summary) return ''
  if (summary.status === 'off') return T.offNote
  if (summary.status !== 'full') return ''
  if (summary.reason === 'fully_booked' || summary.reason === 'resource_full') {
    return '有上班，但今天已滿'
  }
  if (summary.reason === 'provider_mismatch' || summary.reason === 'location_required' || summary.reason === 'no_bookable_slots') {
    return '已安排上班，但此服務目前未形成可預約時段'
  }
  return T.configLimitedNote
}

function LegendPill({ children, tone = 'default' }) {
  const palette =
    tone === 'warning'
      ? { background: '#FFF7ED', border: '#FCD9BD', color: '#9A5E1A' }
      : tone === 'muted'
        ? { background: '#F8FAFC', border: '#E5E7EB', color: '#6B7280' }
        : { background: '#FFFFFF', border: '#1F2937', color: '#111827' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 14px',
        borderRadius: '999px',
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        fontSize: '12px',
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  )
}

const monthKeyFromDate = (value) => String(value || '').slice(0, 7)
const todayISO = () => new Date().toISOString().slice(0, 10)

const addMonths = (monthKey, delta) => {
  const date = new Date(`${monthKey}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + delta, 1)
  return date.toISOString().slice(0, 7)
}

const getMonthLabel = (monthKey) =>
  new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'long', timeZone: 'Asia/Hong_Kong' }).format(new Date(`${monthKey}-01T12:00:00Z`))

const buildMonthGrid = (monthKey) => {
  const first = new Date(`${monthKey}-01T12:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const cursor = new Date(first)
  cursor.setUTCDate(cursor.getUTCDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(cursor)
    current.setUTCDate(cursor.getUTCDate() + index)
    const dateISO = current.toISOString().slice(0, 10)
    return {
      dateISO,
      inMonth: dateISO.startsWith(monthKey),
      dayLabel: dateISO.slice(8, 10),
    }
  })
}

const formatDateLabel = (dateISO) => {
  if (!dateISO) return ''
  return new Intl.DateTimeFormat('zh-HK', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Hong_Kong',
  }).format(new Date(`${dateISO}T12:00:00Z`))
}

const getCalendarStatusLabel = (summary) => {
  if (!summary) return T.off
  if (summary.status === 'available') return T.available
  if (summary.status === 'off') return T.off
  return T.full
}

const getReasonMessage = (summary) => {
  if (!summary) return ''
  if (summary.status === 'off') return T.offNote
  if (summary.status !== 'full') return ''
  if (summary.reason === 'fully_booked' || summary.reason === 'resource_full') {
    return '有上班，但今天已滿'
  }
  if (summary.reason === 'provider_mismatch' || summary.reason === 'location_required' || summary.reason === 'no_bookable_slots') {
    return '已安排上班，但此服務目前未形成可預約時段'
  }
  return T.configLimitedNote
}

const readCached = (cache, key, ttlMs) => {
  const cached = cache.get(key)
  if (!cached) return null
  if (Date.now() - cached.createdAt > ttlMs) {
    cache.delete(key)
    return null
  }
  return cached.value
}

const writeCached = (cache, key, value) => {
  cache.set(key, {
    createdAt: Date.now(),
    value,
  })
}

const serviceBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 12px',
  borderRadius: '999px',
  border: '1px solid #D7B894',
  color: '#A56F2C',
  fontSize: '12px',
  fontWeight: 700,
  background: '#FFFDF9',
}

export default function BookingStaffPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const staffId = Number(params?.staffId || searchParams.get('staffId') || 0)
  const calendarRef = useRef(null)

  const [staff, setStaff] = useState(null)
  const [services, setServices] = useState([])
  const [settings, setSettings] = useState({ phone: '', business_hours: '11:00 - 20:00' })
  const [availabilityVersion, setAvailabilityVersion] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [monthKey, setMonthKey] = useState(monthKeyFromDate(todayISO()))
  const [monthSummary, setMonthSummary] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [selectedTime, setSelectedTime] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!calendarRef.current?.contains(event.target)) {
        setCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/public/booking-bootstrap?staffId=${encodeURIComponent(String(staffId || ''))}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.loadingBootstrapFailed)
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        const nextServices = Array.isArray(payload?.services) ? payload.services : []
        setStaff(payload?.staff || null)
        setServices(nextServices)
        setSettings(payload?.settings || { phone: '', business_hours: '11:00 - 20:00' })
        setAvailabilityVersion(String(payload?.settings?.availability_cache_version || ''))
        setServiceId((current) => current || (nextServices[0]?.id != null ? String(nextServices[0].id) : ''))
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError?.message || T.loadingBootstrapFailed)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [staffId])

  useEffect(() => {
    let disposed = false

    const syncAvailabilityVersion = async () => {
      try {
        const response = await fetch('/api/public/availability-version')
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || disposed) return
        const nextVersion = String(payload?.version || '')
        if (!nextVersion || nextVersion === availabilityVersion) return
        monthSummaryCache.clear()
        dailySlotsCache.clear()
        setAvailabilityVersion(nextVersion)
      } catch {
        // Keep current caches when version check fails.
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncAvailabilityVersion()
      }
    }

    window.addEventListener('focus', syncAvailabilityVersion)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      disposed = true
      window.removeEventListener('focus', syncAvailabilityVersion)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [availabilityVersion])

  useEffect(() => {
    if (!staffId || !serviceId || !monthKey) return
    let cancelled = false
    setLoadingSummary(true)
    setError('')

    const monthSummaryKey = [staffId, serviceId, staff?.location_id || 'none', monthKey, availabilityVersion || 'v0'].join(':')
    const cachedMonthSummary = readCached(monthSummaryCache, monthSummaryKey, MONTH_SUMMARY_CACHE_TTL_MS)
    if (cachedMonthSummary) {
      setMonthSummary(cachedMonthSummary)
      setLoadingSummary(false)
      return
    }

    const summaryParams = new URLSearchParams({
      staffId: String(staffId),
      serviceId: String(serviceId),
      year: monthKey.slice(0, 4),
      month: monthKey.slice(5, 7),
    })
    if (staff?.location_id != null && staff.location_id !== '') {
      summaryParams.set('locationId', String(staff.location_id))
    }

    fetch(`/api/availability/month-summary?${summaryParams.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || bookingOpsCopy.loadFailed)
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        const dates = Array.isArray(payload?.dates) ? payload.dates : []
        writeCached(monthSummaryCache, monthSummaryKey, dates)
        setMonthSummary(dates)
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError?.message || bookingOpsCopy.loadFailed)
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false)
      })

    return () => {
      cancelled = true
    }
  }, [availabilityVersion, monthKey, serviceId, staff?.location_id, staffId])

  const summaryMap = useMemo(() => new Map(monthSummary.map((entry) => [entry.date, entry])), [monthSummary])
  const selectedSummary = selectedDate ? summaryMap.get(selectedDate) : null
  const selectedService = useMemo(() => services.find((item) => String(item.id) === String(serviceId)) || null, [services, serviceId])
  const monthGrid = useMemo(() => (calendarOpen ? buildMonthGrid(monthKey) : []), [calendarOpen, monthKey])

  useEffect(() => {
    if (!monthSummary.length) {
      setSelectedDate('')
      return
    }

    const current = selectedDate ? summaryMap.get(selectedDate) : null
    if (current && current.status !== 'off' && selectedDate.startsWith(monthKey)) {
      return
    }

    const firstAvailable = monthSummary.find((entry) => entry?.status === 'available')
    const firstFull = monthSummary.find((entry) => entry?.status === 'full')
    setSelectedDate(firstAvailable?.date || firstFull?.date || '')
  }, [monthKey, monthSummary, selectedDate, summaryMap])

  useEffect(() => {
    setSelectedTime('')
    if (!selectedDate || !staffId || !serviceId) {
      setSlots([])
      return
    }

    const daySummary = summaryMap.get(selectedDate)
    if (daySummary?.status !== 'available') {
      setSlots([])
      return
    }

    let cancelled = false
    setLoadingSlots(true)
    setError('')

    const dailySlotsKey = [staffId, serviceId, staff?.location_id || 'none', selectedDate, availabilityVersion || 'v0'].join(':')
    const monthSummaryKey = [staffId, serviceId, staff?.location_id || 'none', monthKey, availabilityVersion || 'v0'].join(':')
    const cachedSlots = readCached(dailySlotsCache, dailySlotsKey, DAILY_SLOTS_CACHE_TTL_MS)
    if (cachedSlots) {
      setSlots(cachedSlots)
      setLoadingSlots(false)
      return
    }

    const slotParams = new URLSearchParams({
      date: selectedDate,
      serviceId: String(serviceId),
      staffId: String(staffId),
    })
    if (staff?.location_id != null && staff.location_id !== '') {
      slotParams.set('locationId', String(staff.location_id))
    }

    fetch(`/api/availability?${slotParams.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || bookingOpsCopy.loadFailed)
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        const nextSlots = Array.isArray(payload?.slots)
          ? payload.slots
          : Array.isArray(payload?.slotMatrix)
            ? payload.slotMatrix.flat().filter(Boolean)
            : []
        if (!nextSlots.length && payload?.dateSummaryReason) {
          setMonthSummary((current) => {
            const next = current.map((entry) => {
              if (entry?.date !== selectedDate) return entry
              const nextStatus = payload.dateSummaryReason === 'staff_unavailable' ? 'off' : 'full'
              return {
                ...entry,
                status: nextStatus,
                reason: payload.dateSummaryReason,
                hasAvailableSlots: false,
                availableCount: 0,
              }
            })
            writeCached(monthSummaryCache, monthSummaryKey, next)
            return next
          })
        }
        writeCached(dailySlotsCache, dailySlotsKey, nextSlots)
        setSlots(nextSlots)
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setSlots([])
          setError(fetchError?.message || bookingOpsCopy.loadFailed)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })

    return () => {
      cancelled = true
    }
  }, [availabilityVersion, monthKey, selectedDate, serviceId, staff?.location_id, staffId, summaryMap])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedDate) return toast.error(T.chooseDateFirst)
    if (!selectedTime) return toast.error(T.chooseTimeFirst)

    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          serviceId: Number(serviceId),
          staffId,
          startTime: selectedTime,
          locationId: staff?.location_id || null,
          customerName,
          customerPhone,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || T.submitFailed)
      toast.success(T.submitted)
      router.push('/account/bookings')
    } catch (submitError) {
      toast.error(submitError?.message || T.submitFailed)
    }
  }

  if (loading) {
    return <section style={{ padding: '48px 16px', textAlign: 'center' }}>{T.loadingStaff}</section>
  }

  if (!staff) {
    return (
      <section style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p>{error || T.noStaffFound}</p>
        <Link href="/booking">{T.backToBooking}</Link>
      </section>
    )
  }

  return (
    <div style={{ padding: '32px 16px 48px', background: '#FAF8F5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px', gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="admin-card" style={panelStyle}>
            <h1 style={{ margin: 0, fontSize: '30px' }}>{T.title}</h1>
            <p style={{ marginTop: '8px', color: '#666' }}>{T.intro}</p>
          </div>

          <form className="admin-card" style={{ ...panelStyle, display: 'grid', gap: '18px' }} onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>{T.serviceProvider}</div>
                <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: 900 }}>{staff.name}</div>
                <div style={{ marginTop: '6px', color: '#6B7280' }}>{staff.role || T.serviceProvider}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#6B7280', fontSize: '13px' }}>
                {settings.phone ? `${T.contactLabel}：${settings.phone}` : null}
              </div>
            </div>

            <div className="admin-card" style={{ ...panelStyle, padding: '20px', display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '14px', alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.service}</span>
                  <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} style={fieldStyle}>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.businessHours}</span>
                  <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center' }}>{settings.business_hours || '11:00 - 20:00'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedService?.duration_min ? <span style={serviceBadgeStyle}>{selectedService.duration_min} 分鐘</span> : null}
                {selectedService?.buffer_min ? <span style={serviceBadgeStyle}>緩衝時間 {selectedService.buffer_min} 分鐘</span> : null}
                <span style={serviceBadgeStyle}>應付金額 ${Number(selectedService?.price || 0).toFixed(0)}</span>
              </div>
            </div>

            <div className="admin-card" style={{ ...panelStyle, display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>{T.date}</div>
                  <div style={{ marginTop: '4px', fontSize: '30px', fontWeight: 900 }}>{T.chooseDateThenTime}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <LegendPill>{T.available}</LegendPill>
                  <LegendPill tone="warning">{T.full}</LegendPill>
                  <LegendPill tone="muted">{T.off}</LegendPill>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)', gap: '14px', alignItems: 'start' }}>
                <div ref={calendarRef} style={{ position: 'relative', display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.date}</span>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((current) => !current)}
                    style={{
                      ...fieldStyle,
                      minHeight: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{selectedDate ? formatDateLabel(selectedDate) : T.chooseDateFirst}</span>
                    <span style={{ color: '#A68B6A', fontWeight: 800 }}>{calendarOpen ? T.collapseCalendar : T.chooseDate}</span>
                  </button>

                  {calendarOpen ? (
                    <div
                      className="admin-card"
                      style={{
                        ...panelStyle,
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 20,
                        width: 'min(100vw - 32px, 560px)',
                        minWidth: '320px',
                        marginTop: '8px',
                        display: 'grid',
                        gap: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900 }}>{getMonthLabel(monthKey)}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="btn btn-small btn-interactive" onClick={() => setMonthKey((current) => addMonths(current, -1))} disabled={loadingSummary}>
                            {T.monthPrev}
                          </button>
                          <button type="button" className="btn btn-small btn-interactive" onClick={() => setMonthKey((current) => addMonths(current, 1))} disabled={loadingSummary}>
                            {T.monthNext}
                          </button>
                        </div>
                      </div>

                      {loadingSummary ? <div style={{ color: '#6B7280' }}>{T.loadingDates}</div> : null}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                        {DAY_LABELS.map((day) => (
                          <div key={day} style={{ fontSize: '12px', color: '#6B7280', fontWeight: 800, textAlign: 'center' }}>
                            星期{day}
                          </div>
                        ))}
                        {monthGrid.map((cell) => {
                          const summary = summaryMap.get(cell.dateISO) || {}
                          const status = summary.status || 'off'
                          const isSelected = selectedDate === cell.dateISO
                          return (
                            <button
                              key={cell.dateISO}
                              type="button"
                              onClick={() => {
                                if (status === 'off') return
                                setSelectedDate(cell.dateISO)
                                setCalendarOpen(false)
                              }}
                              disabled={status === 'off'}
                              style={{
                                minHeight: '84px',
                                padding: '10px 8px',
                                borderRadius: '16px',
                                border: `1px solid ${isSelected ? '#A68B6A' : status === 'off' ? '#E5E7EB' : '#CBB39A'}`,
                                background: isSelected ? '#FFF8EE' : status === 'off' ? '#F8FAFC' : '#fff',
                                color: status === 'off' ? '#9CA3AF' : '#111827',
                                opacity: cell.inMonth ? 1 : 0.38,
                                cursor: status === 'off' ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{cell.dayLabel}</div>
                              {cell.inMonth ? (
                                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: status === 'off' ? '#9CA3AF' : '#6B7280' }}>
                                  {getCalendarStatusLabel(summary)}
                                </div>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.timeDropdown}</span>
                  <select
                    value={selectedTime}
                    onChange={(event) => setSelectedTime(event.target.value)}
                    disabled={!selectedDate || selectedSummary?.status !== 'available' || loadingSlots}
                    style={fieldStyle}
                  >
                    <option value="">{selectedDate ? (loadingSlots ? T.loadingSlots : T.chooseTimeFirst) : T.chooseDateFirst}</option>
                    {slots.map((slot) => {
                      const time = String(slot?.time || slot?.startTime || slot?.start_time || '').slice(0, 5)
                      if (!time) return null
                      return (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      )
                    })}
                  </select>
                </label>
              </div>

              {selectedDate && selectedSummary ? <div style={{ color: '#6B7280', fontSize: '14px' }}>{getReasonMessageDisplay(selectedSummary)}</div> : null}
              {selectedDate && !loadingSlots && slots.length === 0 && selectedSummary?.status === 'available' ? <div style={{ color: '#6B7280' }}>{T.noAvailability}</div> : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.customerName}</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={fieldStyle} placeholder={T.customerNamePlaceholder} />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.customerPhone}</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} style={fieldStyle} placeholder={T.customerPhonePlaceholder} />
              </label>
            </div>

            <button type="submit" className="btn btn-interactive" disabled={!selectedDate || !selectedTime} style={{ minHeight: '48px' }}>
              {T.submit}
            </button>
          </form>
        </div>

        <div className="admin-card" style={{ ...panelStyle, padding: '18px', alignSelf: 'start' }}>
          <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>{T.bookingSummary}</div>
          <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{T.service}</div>
              <div style={{ fontWeight: 900 }}>{selectedService?.name || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{T.date}</div>
              <div style={{ fontWeight: 900 }}>{selectedDate || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{T.time}</div>
              <div style={{ fontWeight: 900 }}>{selectedTime || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{T.amountDue}</div>
              <div style={{ fontWeight: 900 }}>${Number(selectedService?.price || 0).toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {error ? <div style={{ maxWidth: '1120px', margin: '16px auto 0', color: '#991B1B' }}>{error}</div> : null}
    </div>
  )
}

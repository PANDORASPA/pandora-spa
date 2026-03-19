'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { bookingOpsCopy } from '../../components/admin/opsUi'

const DEFAULT_SETTINGS = {
  phone: '',
  business_hours: '11:00 - 20:00',
  days_off: [],
  slot_step_min: 15,
}

const HK_TIME_ZONE = 'Asia/Hong_Kong'
const DATE_CARD_COUNT = 14

const T = {
  loadingPage: '載入預約頁面中...',
  loadingMember: '載入會員資料中...',
  loadingDates: '載入可預約日期中...',
  loadingSlots: '載入可預約時段中...',
  settingsError: '無法載入預約資料。',
  slotsError: '無法載入可預約時段。',
  bookingLoadError: '無法載入原預約資料。',
  requiredFields: '請填寫所有必填欄位。',
  loginFirst: '請先登入後再預約。',
  bookingFailed: '預約失敗。',
  chooseServiceAndDate: '請先選擇服務及日期。',
  chooseDateFirst: '請先選擇日期。',
  chooseTime: '請選擇時間',
  noSlots: '這一天目前沒有可預約時段，請改選其他日期。',
  fullyBooked: '今天有上班，但可預約時段已滿。',
  title: '線上預約',
  editTitle: '更改預約',
  intro: '先選擇日期，再從下拉選單選擇可預約時段。',
  editLocked: '改期只會調整日期與時段，優惠券及套票會保留原本設定。',
  back: '返回設計師列表',
  memberTitle: '請先登入會員',
  memberIntro: '登入後可帶入會員資料，並使用優惠券及套票。',
  login: '登入',
  register: '註冊',
  service: '服務',
  chooseService: '請選擇服務',
  businessHours: '營業時間',
  slotStep: '時段間距',
  date: '日期',
  time: '時間',
  name: '姓名',
  phone: '電話',
  coupon: '優惠券',
  noCoupon: '不使用優惠券',
  ticket: '會員套票',
  noTicket: '不使用套票',
  loginForTicket: '登入後可使用套票',
  remaining: '剩餘',
  times: '次',
  amount: '應付金額',
  ticketUse: '本次會扣除 1 次套票使用次數。',
  couponApply: '優惠金額會在提交後套用。',
  submitting: '提交中...',
  submit: '提交預約',
  update: '更新預約',
  minutes: '分鐘',
  whatsappIntro: '你好，我想確認以下預約資料：',
  refLabel: '預約編號：',
  success: '預約成功',
  updated: '預約已更新',
  whatsappConfirm: 'WhatsApp 確認',
  whatsappUnavailable: '未設定 WhatsApp 聯絡號碼',
  whatsappUnavailableHelp: '請先聯絡店舖更新 WhatsApp 聯絡號碼。',
  viewBookings: '查看我的預約',
  close: '關閉',
  completeRequired: '請完成服務、日期、時間、姓名及電話。',
  ctaHelp: '提交後會顯示預約編號及 WhatsApp 確認方式。',
  restDay: '該日休息',
  fullyBookedShort: '當日已滿',
  availableHint: '有上班，可載入可預約時段',
  restHint: '休息 / 假期 / 沒有上班',
  fullHint: '有上班，但今天已滿',
  chooseStaffFirst: '無法辨識服務供應者。',
  loginRequiredToSubmit: '登入後才可提交預約。',
}

const box = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }

const hkDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: HK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const hkCardFormatter = new Intl.DateTimeFormat('zh-HK', {
  timeZone: HK_TIME_ZONE,
  month: 'short',
  day: 'numeric',
  weekday: 'short',
})

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`
const formatServiceDuration = (service) => `${Number(service?.time || 60)} ${T.minutes}`

const getHKISODate = (date = new Date()) => {
  const parts = hkDateFormatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day}`
}

const normalizeDateISO = (value) => {
  const text = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

const addDaysISO = (dateISO, days) => {
  const next = new Date(`${dateISO}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return getHKISODate(next)
}

const formatDateCard = (dateISO) => {
  const date = new Date(`${dateISO}T12:00:00Z`)
  return hkCardFormatter.format(date)
}

const getTicketServiceId = (ticket) => {
  const raw = ticket?.tickets?.service_id ?? ticket?.service_id ?? null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const buildDateWindow = (startDate) =>
  Array.from({ length: DATE_CARD_COUNT }, (_, index) => {
    const dateISO = addDaysISO(startDate, index)
    return { dateISO, label: formatDateCard(dateISO) }
  })

const buildWhatsappUrl = (phone, lines) => {
  const digits = String(phone || '').replace(/[^\d+]/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits.replace(/^\+/, '')}?text=${encodeURIComponent(lines.join('\n'))}`
}

const getDateSummaryLabel = (status, selected) => {
  if (selected) return bookingOpsCopy.selected
  if (status === 'available') return bookingOpsCopy.available
  if (status === 'full') return bookingOpsCopy.full
  return bookingOpsCopy.rest
}

export default function BookingStaffDetailPage({ params }) {
  const searchParams = useSearchParams()
  const availabilityControllerRef = useRef(null)
  const dateSummaryControllerRef = useRef(null)

  const staffId = params?.staffId ? String(params.staffId) : ''
  const editId = searchParams.get('editId') || ''

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [staff, setStaff] = useState(null)
  const [services, setServices] = useState([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [loadingMember, setLoadingMember] = useState(true)
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [pageError, setPageError] = useState('')
  const [slotsError, setSlotsError] = useState('')
  const [dateSummaryError, setDateSummaryError] = useState('')

  const [user, setUser] = useState(null)
  const [memberProfile, setMemberProfile] = useState(null)
  const [userTickets, setUserTickets] = useState([])

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState(getHKISODate())
  const [selectedTime, setSelectedTime] = useState('')
  const [slotMatrix, setSlotMatrix] = useState([])
  const [resolvedLocationId, setResolvedLocationId] = useState(null)
  const [locationSelectionRequired, setLocationSelectionRequired] = useState(false)
  const [dateSummaries, setDateSummaries] = useState([])

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedBooking, setSubmittedBooking] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [editBooking, setEditBooking] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoadingPage(true)
    setPageError('')

    fetch(`/api/public/booking-bootstrap?staffId=${encodeURIComponent(staffId)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.settingsError)
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        setSettings({ ...DEFAULT_SETTINGS, ...(payload?.settings || {}) })
        setStaff(payload?.staff || null)
        const nextServices = Array.isArray(payload?.services) ? payload.services : []
        setServices(nextServices)
        if (nextServices.length) setSelectedServiceId(String(nextServices[0].id))
      })
      .catch((error) => {
        if (!cancelled) setPageError(error?.message || T.settingsError)
      })
      .finally(() => {
        if (!cancelled) setLoadingPage(false)
      })

    return () => {
      cancelled = true
    }
  }, [staffId])

  useEffect(() => {
    let cancelled = false

    const loadMember = async () => {
      setLoadingMember(true)
      const authRes = await supabase.auth.getUser()
      const nextUser = authRes?.data?.user || null
      if (cancelled) return
      setUser(nextUser)
      if (!nextUser) {
        setMemberProfile(null)
        setUserTickets([])
        setLoadingMember(false)
        return
      }

      const [profileRes, ticketsRes] = await Promise.all([
        supabase.from('member_profiles').select('full_name,phone').eq('id', nextUser.id).maybeSingle(),
        supabase.from('user_tickets').select('id,remaining_count,ticket_name,service_id,tickets(*)').eq('member_user_id', nextUser.id),
      ])

      if (cancelled) return
      setMemberProfile(profileRes?.data || null)
      setUserTickets(Array.isArray(ticketsRes?.data) ? ticketsRes.data : [])
      setLoadingMember(false)
    }

    loadMember().catch(() => {
      if (!cancelled) setLoadingMember(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const fallbackName = memberProfile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || ''
    const fallbackPhone = memberProfile?.phone || user?.user_metadata?.phone || ''
    setCustomerName((current) => current || fallbackName)
    setCustomerPhone((current) => current || fallbackPhone)
  }, [memberProfile, user])

  useEffect(() => {
    if (!editId) return
    let cancelled = false

    fetch(`/api/account/bookings/${encodeURIComponent(editId)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.bookingLoadError)
        return payload?.booking
      })
      .then((booking) => {
        if (cancelled || !booking) return
        setEditBooking(booking)
        setSelectedServiceId(String(booking.service_id || ''))
        setSelectedDate(booking.appointment_date || booking.date || getHKISODate())
        setSelectedTime(booking.start_time || booking.time || '')
        setCustomerName(booking.customer_name || booking.name || '')
        setCustomerPhone(booking.customer_phone || booking.phone || '')
        setCouponCode(booking.coupon || '')
        setSelectedTicketId(booking.user_ticket_id ? String(booking.user_ticket_id) : '')
        setResolvedLocationId(booking.location_id ?? null)
      })
      .catch((error) => {
        if (!cancelled) {
          setPageError(error?.message || T.bookingLoadError)
          toast.error(error?.message || T.bookingLoadError)
        }
      })

    return () => {
      cancelled = true
    }
  }, [editId])

  const dateWindow = useMemo(() => buildDateWindow(normalizeDateISO(selectedDate) || getHKISODate()), [selectedDate])
  const dateSummaryStartDate = dateWindow[0]?.dateISO || normalizeDateISO(selectedDate) || getHKISODate()
  const dateSummaryMap = useMemo(() => new Map(dateSummaries.map((entry) => [entry.date, entry])), [dateSummaries])
  const currentDateSummary = dateSummaryMap.get(selectedDate) || null

  useEffect(() => {
    if (!selectedServiceId || !staffId) return
    dateSummaryControllerRef.current?.abort?.()
    const controller = new AbortController()
    dateSummaryControllerRef.current = controller
    setLoadingDates(true)
    setDateSummaryError('')

    const params = new URLSearchParams({
      serviceId: String(selectedServiceId),
      staffId: String(staffId),
      startDate: dateSummaryStartDate,
      days: String(DATE_CARD_COUNT),
    })
    if (resolvedLocationId != null) params.set('locationId', String(resolvedLocationId))

    fetch(`/api/availability/date-summary?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.settingsError)
        return payload
      })
      .then((payload) => {
        setDateSummaries(Array.isArray(payload?.dates) ? payload.dates : [])
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setDateSummaries([])
          setDateSummaryError(error?.message || T.settingsError)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDates(false)
      })

    return () => controller.abort()
  }, [dateSummaryStartDate, resolvedLocationId, selectedServiceId, staffId])

  useEffect(() => {
    if (!dateSummaries.length) return
    const selectedSummary = dateSummaryMap.get(selectedDate)
    if (selectedSummary && selectedSummary.status !== 'off') return
    const nextActiveDate = dateSummaries.find((entry) => entry.status !== 'off')?.date
    if (nextActiveDate && nextActiveDate !== selectedDate) setSelectedDate(nextActiveDate)
  }, [dateSummaries, dateSummaryMap, selectedDate])

  useEffect(() => {
    if (!selectedDate || !selectedServiceId || !staffId) {
      setSlotMatrix([])
      setSelectedTime('')
      return
    }
    if (currentDateSummary?.status === 'off' || currentDateSummary?.status === 'full') {
      setSlotMatrix([])
      setSelectedTime('')
      setLoadingSlots(false)
      return
    }

    availabilityControllerRef.current?.abort?.()
    const controller = new AbortController()
    availabilityControllerRef.current = controller
    setLoadingSlots(true)
    setSlotsError('')

    const params = new URLSearchParams({
      date: selectedDate,
      serviceId: String(selectedServiceId),
      staffId: String(staffId),
    })
    if (resolvedLocationId != null) params.set('locationId', String(resolvedLocationId))

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.slotsError)
        return payload
      })
      .then((payload) => {
        const nextMatrix = Array.isArray(payload?.slotMatrix) ? payload.slotMatrix : []
        setSlotMatrix(nextMatrix)
        setResolvedLocationId(payload?.locationId ?? null)
        setLocationSelectionRequired(Boolean(payload?.locationSelectionRequired))
        const nextAvailableTimes = [...new Set(nextMatrix.filter((slot) => slot?.available).map((slot) => slot.time).filter(Boolean))]
        setSelectedTime((current) => (current && nextAvailableTimes.includes(current) ? current : nextAvailableTimes[0] || ''))
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setSlotMatrix([])
          setSelectedTime('')
          setSlotsError(error?.message || T.slotsError)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false)
      })

    return () => controller.abort()
  }, [currentDateSummary?.status, resolvedLocationId, selectedDate, selectedServiceId, staffId])

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(selectedServiceId)) || null,
    [selectedServiceId, services],
  )

  const availableTimes = useMemo(
    () => [...new Set(slotMatrix.filter((slot) => slot?.available).map((slot) => slot.time).filter(Boolean))],
    [slotMatrix],
  )

  const eligibleTickets = useMemo(() => {
    return (userTickets || []).filter((ticket) => {
      if (Number(ticket?.remaining_count || 0) <= 0) return false
      const ticketServiceId = getTicketServiceId(ticket)
      if (ticketServiceId == null) return true
      return ticketServiceId === Number(selectedServiceId)
    })
  }, [selectedServiceId, userTickets])

  const currentDateHint =
    currentDateSummary?.status === 'off'
      ? T.restHint
      : currentDateSummary?.status === 'full'
        ? T.fullHint
        : currentDateSummary?.status === 'available'
          ? T.availableHint
          : ''

  const currentPath = useMemo(() => {
    const query = searchParams.toString()
    return `/booking/${encodeURIComponent(staffId)}${query ? `?${query}` : ''}`
  }, [searchParams, staffId])

  const whatsappUrl = useMemo(() => {
    if (!submittedBooking) return ''
    const lines = [
      T.whatsappIntro,
      `${T.refLabel}${submittedBooking.ref || `#${submittedBooking.id}`}`,
      `${T.service}：${selectedService?.name || submittedBooking.service || '-'}`,
      `${T.date}：${submittedBooking.appointment_date || submittedBooking.date || selectedDate}`,
      `${T.time}：${submittedBooking.start_time || submittedBooking.time || selectedTime}`,
      `${T.name}：${submittedBooking.customer_name || submittedBooking.name || customerName}`,
      `${T.phone}：${submittedBooking.customer_phone || submittedBooking.phone || customerPhone}`,
    ]
    return buildWhatsappUrl(settings.phone, lines)
  }, [customerName, customerPhone, selectedDate, selectedService?.name, selectedTime, settings.phone, submittedBooking])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!staffId) {
      toast.error(T.chooseStaffFirst)
      return
    }
    if (!user) {
      toast.error(T.loginRequiredToSubmit)
      return
    }
    if (!selectedServiceId || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      toast.error(T.completeRequired)
      return
    }

    setSubmitting(true)
    const payload = {
      date: selectedDate,
      serviceId: Number(selectedServiceId),
      staffId: Number(staffId),
      startTime: selectedTime,
      locationId: resolvedLocationId,
      customerName,
      customerPhone,
      couponCode: editId ? editBooking?.coupon || '' : couponCode,
      userTicketId: editId ? editBooking?.user_ticket_id || null : selectedTicketId ? Number(selectedTicketId) : null,
    }
    const endpoint = editId ? `/api/account/bookings/${encodeURIComponent(editId)}` : '/api/bookings/create'
    const method = editId ? 'PATCH' : 'POST'
    const body = editId ? { ...payload, action: 'reschedule' } : payload

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || T.bookingFailed)
      setSubmittedBooking(result?.booking || null)
      setShowSuccess(true)
      toast.success(editId ? T.updated : T.success)
    } catch (error) {
      toast.error(error?.message || T.bookingFailed)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingPage) {
    return <section style={{ padding: '48px 16px', textAlign: 'center' }}>{T.loadingPage}</section>
  }

  if (pageError || !staff) {
    return (
      <section style={{ padding: '48px 16px' }}>
        <div style={{ maxWidth: '840px', margin: '0 auto', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '18px', padding: '20px' }}>
          {pageError || T.settingsError}
        </div>
      </section>
    )
  }

  if (loadingMember) {
    return <section style={{ padding: '48px 16px', textAlign: 'center' }}>{T.loadingMember}</section>
  }

  if (!user) {
    return (
      <section style={{ padding: '48px 16px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', background: '#fff', borderRadius: '24px', border: '1px solid #E8E0D5', padding: '28px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>{T.memberTitle}</h1>
          <p style={{ marginTop: '10px', color: '#666', lineHeight: 1.7 }}>{T.memberIntro}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            <Link href={`/login?redirectTo=${encodeURIComponent(currentPath)}`} className="btn btn-interactive" style={{ textDecoration: 'none' }}>
              {T.login}
            </Link>
            <Link href={`/signup?redirectTo=${encodeURIComponent(currentPath)}`} className="btn btn-secondary btn-interactive" style={{ textDecoration: 'none' }}>
              {T.register}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section style={{ padding: '28px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/booking" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 700 }}>
            ← {T.back}
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', alignItems: 'center', marginTop: '18px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '32px' }}>{editId ? T.editTitle : T.title}</h1>
              <p style={{ marginTop: '10px', color: '#666', lineHeight: 1.7 }}>{editId ? T.editLocked : T.intro}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid #E8E0D5', padding: '18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '78px', height: '78px', borderRadius: '20px', background: 'linear-gradient(135deg, #f6efe4, #faf8f5)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {staff.photo_url ? <img src={staff.photo_url} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '30px' }}>✂</span>}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{staff.name}</div>
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#A68B6A', fontWeight: 700 }}>{staff.role || '服務供應者'}</div>
                {staff.bio ? <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.6, color: '#666' }}>{staff.bio}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 16px 48px' }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px' }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div className="admin-card" style={{ padding: '22px', border: '1px solid #E8E0D5' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.service}</span>
                    <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} style={box} disabled={Boolean(editId)}>
                      <option value="">{T.chooseService}</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.businessHours}</span>
                    <input value={settings.business_hours || DEFAULT_SETTINGS.business_hours} readOnly style={{ ...box, background: '#F9FAFB' }} />
                  </label>
                </div>

                {selectedService ? (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge badge-outline" style={{ background: '#fff' }}>{formatServiceDuration(selectedService)}</span>
                    <span className="badge badge-outline" style={{ background: '#fff' }}>{T.slotStep} {settings.slot_step_min || DEFAULT_SETTINGS.slot_step_min} {T.minutes}</span>
                    <span className="badge badge-outline" style={{ background: '#fff' }}>{T.amount} {formatCurrency(selectedService.price)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '22px', border: '1px solid #E8E0D5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>{T.date}</div>
                  <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 800 }}>先選日期，再選時間</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-outline" style={{ background: '#fff', color: '#111827', borderColor: '#111827' }}>{bookingOpsCopy.available}</span>
                  <span className="badge badge-outline" style={{ background: '#F3F4F6', color: '#6B7280', borderColor: '#D1D5DB' }}>{bookingOpsCopy.unavailable}</span>
                  <span className="badge badge-outline" style={{ background: 'rgba(166, 139, 106, 0.14)', color: '#7C5F40', borderColor: 'rgba(166, 139, 106, 0.26)' }}>{bookingOpsCopy.selected}</span>
                </div>
              </div>

              {loadingDates ? <div style={{ color: '#666', marginBottom: '12px' }}>{T.loadingDates}</div> : null}
              {dateSummaryError ? <div style={{ color: '#991B1B', marginBottom: '12px' }}>{dateSummaryError}</div> : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '10px' }}>
                {dateWindow.map(({ dateISO, label }) => {
                  const summary = dateSummaryMap.get(dateISO)
                  const status = summary?.status || 'off'
                  const disabled = status === 'off'
                  const selected = selectedDate === dateISO
                  return (
                    <button
                      key={dateISO}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedDate(dateISO)}
                      className="btn-interactive"
                      style={{
                        padding: '14px 12px',
                        borderRadius: '16px',
                        border: selected ? '1px solid rgba(166, 139, 106, 0.55)' : disabled ? '1px solid #E5E7EB' : '1px solid #D1D5DB',
                        background: selected ? 'rgba(166, 139, 106, 0.14)' : '#fff',
                        color: disabled ? '#9CA3AF' : '#111827',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'grid',
                        gap: '6px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800 }}>{label}</span>
                      <span style={{ fontSize: '11px', color: disabled ? '#9CA3AF' : '#6B7280' }}>{getDateSummaryLabel(status, selected)}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>{currentDateHint}</div>
            </div>

            <div className="admin-card" style={{ padding: '22px', border: '1px solid #E8E0D5' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.time}</span>
                  <select value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} style={box} disabled={loadingSlots || !selectedDate || !selectedServiceId || currentDateSummary?.status === 'off' || availableTimes.length === 0}>
                    <option value="">
                      {!selectedDate ? T.chooseDateFirst : loadingSlots ? T.loadingSlots : availableTimes.length ? T.chooseTime : currentDateSummary?.status === 'full' ? T.fullyBookedShort : T.noSlots}
                    </option>
                    {availableTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>

                {slotsError ? <div style={{ color: '#991B1B' }}>{slotsError}</div> : null}
                {!slotsError && !loadingSlots && currentDateSummary?.status === 'off' ? <div style={{ color: '#6B7280' }}>{T.restDay}</div> : null}
                {!slotsError && !loadingSlots && currentDateSummary?.status === 'full' ? <div style={{ color: '#B45309' }}>{T.fullyBooked}</div> : null}
              </div>
            </div>

            <div className="admin-card" style={{ padding: '22px', border: '1px solid #E8E0D5' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.name}</span>
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={box} placeholder="請輸入姓名" />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.phone}</span>
                  <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} style={box} placeholder="+852..." />
                </label>
              </div>

              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.coupon}</span>
                  <input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} disabled={Boolean(editId)} style={{ ...box, background: editId ? '#F9FAFB' : '#fff' }} placeholder={T.noCoupon} />
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{T.couponApply}</span>
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{T.ticket}</span>
                  <select value={selectedTicketId} onChange={(event) => setSelectedTicketId(event.target.value)} disabled={Boolean(editId)} style={{ ...box, background: editId ? '#F9FAFB' : '#fff' }}>
                    <option value="">{T.noTicket}</option>
                    {eligibleTickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {(ticket.ticket_name || ticket?.tickets?.name || `#${ticket.id}`) + ` (${T.remaining} ${ticket.remaining_count} ${T.times})`}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{eligibleTickets.length ? T.ticketUse : T.loginForTicket}</span>
                </label>
              </div>
            </div>
          </div>

          <aside style={{ display: 'grid', gap: '18px', alignSelf: 'start', position: 'sticky', top: '88px' }}>
            <div className="admin-card" style={{ padding: '22px', border: '1px solid #E8E0D5' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>預約摘要</div>
              <div style={{ marginTop: '10px', display: 'grid', gap: '12px' }}>
                <div><div style={{ fontSize: '13px', color: '#6B7280' }}>{T.service}</div><div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedService?.name || '-'}</div></div>
                <div><div style={{ fontSize: '13px', color: '#6B7280' }}>{T.date}</div><div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedDate || '-'}</div></div>
                <div><div style={{ fontSize: '13px', color: '#6B7280' }}>{T.time}</div><div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedTime || '-'}</div></div>
                <div><div style={{ fontSize: '13px', color: '#6B7280' }}>{T.amount}</div><div style={{ marginTop: '4px', fontWeight: 800 }}>{formatCurrency(selectedService?.price || 0)}</div></div>
              </div>

              {locationSelectionRequired ? (
                <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '12px', background: '#FEF3C7', color: '#92400E', fontSize: '13px', lineHeight: 1.6 }}>
                  這項服務需要地點判斷，系統已採用保守規則處理，未能確認的時段不會顯示。
                </div>
              ) : null}

              <button type="submit" disabled={submitting || !selectedTime || !selectedDate || !selectedServiceId} className="btn btn-interactive" style={{ width: '100%', marginTop: '18px' }}>
                {submitting ? T.submitting : editId ? T.update : T.submit}
              </button>
              <div style={{ marginTop: '10px', fontSize: '12px', lineHeight: 1.6, color: '#6B7280' }}>{T.ctaHelp}</div>
            </div>
          </aside>
        </form>
      </section>

      {showSuccess && submittedBooking ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1200 }}>
          <div className="admin-card" style={{ width: 'min(520px, 100%)', padding: '28px', border: '1px solid #E8E0D5' }}>
            <h2 style={{ margin: 0, fontSize: '26px' }}>{editId ? T.updated : T.success}</h2>
            <div style={{ marginTop: '14px', display: 'grid', gap: '8px', color: '#3D3D3D' }}>
              <div>{T.refLabel}{submittedBooking.ref || `#${submittedBooking.id}`}</div>
              <div>{T.service}：{selectedService?.name || submittedBooking.service || '-'}</div>
              <div>{T.date}：{submittedBooking.appointment_date || submittedBooking.date || selectedDate}</div>
              <div>{T.time}：{submittedBooking.start_time || submittedBooking.time || selectedTime}</div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-interactive" style={{ textDecoration: 'none' }}>
                  {T.whatsappConfirm}
                </a>
              ) : (
                <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#FEF3C7', color: '#92400E', fontSize: '13px', lineHeight: 1.6 }}>
                  <strong>{T.whatsappUnavailable}</strong>
                  <div style={{ marginTop: '4px' }}>{T.whatsappUnavailableHelp}</div>
                </div>
              )}
              <Link href="/account/bookings" className="btn btn-secondary btn-interactive" style={{ textDecoration: 'none' }}>
                {T.viewBookings}
              </Link>
              <button type="button" className="btn btn-small btn-interactive" onClick={() => setShowSuccess(false)}>
                {T.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const DEFAULT_SETTINGS = {
  phone: '',
  business_hours: '11:00 - 20:00',
  days_off: [],
}

const T = {
  minutes: '\u5206\u9418',
  slotsError: '\u7121\u6cd5\u53d6\u5f97\u53ef\u7528\u6642\u6bb5',
  settingsError: '\u7121\u6cd5\u8f09\u5165\u5e97\u8216\u8a2d\u5b9a',
  partialLoad: '\u90e8\u5206\u8cc7\u6599\u8f09\u5165\u5931\u6557\uff1a',
  pageLoadError: '\u8f09\u5165\u9810\u7d04\u9801\u9762\u5931\u6557',
  bookingLoadError: '\u7121\u6cd5\u8f09\u5165\u9810\u7d04\u8cc7\u6599',
  requiredFields: '\u8acb\u586b\u5beb\u6240\u6709\u5fc5\u586b\u6b04\u4f4d',
  loginFirst: '\u8acb\u5148\u767b\u5165\u5f8c\u518d\u9810\u7d04',
  bookingFailed: '\u9810\u7d04\u5931\u6557',
  whatsappIntro: '\u4f60\u597d\uff0c\u6211\u60f3\u78ba\u8a8d\u4ee5\u4e0b\u9810\u7d04\u8cc7\u6599\uff1a',
  ref: '\u7de8\u865f',
  service: '\u670d\u52d9',
  date: '\u65e5\u671f',
  time: '\u6642\u9593',
  name: '\u59d3\u540d',
  updated: '\u9810\u7d04\u5df2\u66f4\u65b0',
  success: '\u9810\u7d04\u6210\u529f',
  loading: '\u8f09\u5165\u4e2d...',
  editTitle: '\u4fee\u6539\u9810\u7d04',
  editLocked: '\u6539\u671f\u53ea\u6703\u8abf\u6574\u65e5\u671f\u3001\u6642\u6bb5\u8207\u8a2d\u8a08\u5e2b\uff0c\u670d\u52d9\u3001\u512a\u60e0\u5238\u53ca\u5957\u7968\u6703\u4fdd\u7559\u539f\u9810\u7d04\u8a2d\u5b9a\u3002',
  title: '\u7dda\u4e0a\u9810\u7d04',
  intro:
    '\u5efa\u8b70\u5148\u767b\u5165\u6703\u54e1\uff0c\u518d\u4f7f\u7528\u6703\u54e1\u8cc7\u6599\u548c\u5957\u7968\u5b8c\u6210\u9810\u7d04\u6d41\u7a0b\uff0c\u907f\u514d\u8cc7\u6599\u4e0d\u4e00\u81f4\u3002',
  memberTitle: '\u8acb\u5148\u767b\u5165\u6703\u54e1',
  memberIntro:
    '\u767b\u5165\u5f8c\u53ef\u81ea\u52d5\u5e36\u5165\u6703\u54e1\u8cc7\u6599\uff0c\u4e5f\u53ef\u4ee5\u4f7f\u7528\u5957\u7968\u5b8c\u6210\u9810\u7d04\u3002',
  login: '\u767b\u5165',
  register: '\u8a3b\u518a',
  section1: '1. \u9078\u64c7\u670d\u52d9\u8207\u8a2d\u8a08\u5e2b',
  chooseService: '\u8acb\u9078\u64c7\u670d\u52d9',
  stylist: '\u8a2d\u8a08\u5e2b',
  randomStaff: '\u7cfb\u7d71\u5206\u914d',
  section2: '2. \u9078\u64c7\u65e5\u671f\u8207\u6642\u6bb5',
  businessHours: '\u71df\u696d\u6642\u9593',
  loadingSlots: '\u8f09\u5165\u53ef\u7528\u6642\u6bb5\u4e2d...',
  noSlots:
    '\u9019\u500b\u65e5\u671f\u76ee\u524d\u6c92\u6709\u53ef\u7528\u6642\u6bb5\uff0c\u8acb\u6539\u9078\u5176\u4ed6\u65e5\u671f\u6216\u8a2d\u8a08\u5e2b\u3002',
  section3: '3. \u806f\u7d61\u8cc7\u6599\u8207\u512a\u60e0',
  phone: '\u96fb\u8a71',
  coupon: '\u512a\u60e0\u5238',
  noCoupon: '\u4e0d\u4f7f\u7528\u512a\u60e0\u5238',
  ticket: '\u6703\u54e1\u5957\u7968',
  noTicket: '\u4e0d\u4f7f\u7528\u5957\u7968',
  loginForTicket: '\u767b\u5165\u5f8c\u53ef\u4f7f\u7528\u5957\u7968',
  remaining: '\u5269\u9918',
  times: '\u6b21',
  amount: '\u61c9\u4ed8\u91d1\u984d',
  ticketUse: '\u672c\u6b21\u5c07\u6263\u9664 1 \u6b21\u5957\u7968\u4f7f\u7528\u6b21\u6578',
  couponApply: '\u512a\u60e0\u91d1\u984d\u5c07\u65bc\u78ba\u8a8d\u5f8c\u5957\u7528',
  submitting: '\u63d0\u4ea4\u4e2d...',
  submit: '\u63d0\u4ea4\u9810\u7d04',
  update: '\u66f4\u65b0\u9810\u7d04',
  refLabel: '\u9810\u7d04\u7de8\u865f\uff1a',
  whatsappConfirm: 'WhatsApp \u78ba\u8a8d',
  whatsappUnavailable: '\u672a\u8a2d\u5b9a WhatsApp \u806f\u7d61\u865f\u78bc',
  whatsappUnavailableHelp: '\u8acb\u5148\u806f\u7d61\u5e97\u8216\u66f4\u65b0\u96fb\u8a71\u8a2d\u5b9a\u3002',
  viewBookings: '\u67e5\u770b\u6211\u7684\u9810\u7d04',
  close: '\u95dc\u9589',
}

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const formatServiceDuration = (service) => {
  const duration = Number(service?.time || 60)
  return `${duration} ${T.minutes}`
}

const normalizeDaysOff = (value) => {
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

const normalizePublicSettings = (payload) => ({
  ...DEFAULT_SETTINGS,
  ...(payload?.settings || {}),
  days_off: normalizeDaysOff(payload?.settings?.days_off),
})

const getTicketServiceId = (ticket) => {
  const raw = ticket?.tickets?.service_id ?? ticket?.service_id ?? null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export default function BookingPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [bootstrapError, setBootstrapError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [shopSettings, setShopSettings] = useState(DEFAULT_SETTINGS)
  const [services, setServices] = useState([])
  const [staffList, setStaffList] = useState([])
  const [coupons, setCoupons] = useState([])
  const [userTickets, setUserTickets] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('random')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [formData, setFormData] = useState({ name: '', phone: '', coupon: '' })
  const [editId, setEditId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [waUrl, setWaUrl] = useState('')
  const isEditing = Boolean(editId)

  const refreshAvailability = async () => {
    if (!selectedServiceId || !selectedDate) {
      setAvailableSlots([])
      setSelectedTime('')
      return
    }

    setLoadingSlots(true)
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        serviceId: String(selectedServiceId),
      })
      if (selectedStaffId && selectedStaffId !== 'random') {
        params.set('staffId', selectedStaffId)
      }

      const response = await fetch(`/api/availability?${params.toString()}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || T.slotsError)

      const nextSlots = result.slots || []
      setAvailableSlots(nextSlots)
      setSelectedTime((current) => (current && nextSlots.includes(current) ? current : ''))
    } catch (error) {
      setAvailableSlots([])
      setSelectedTime('')
      toast.error(error?.message || T.slotsError)
    } finally {
      setLoadingSlots(false)
    }
  }

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId]
  )

  const filteredTickets = useMemo(() => {
    if (!selectedService) return []
    return userTickets.filter((ticket) => {
      const linkedServiceId = getTicketServiceId(ticket)
      return linkedServiceId == null || linkedServiceId === Number(selectedService.id)
    })
  }, [selectedService, userTickets])

  const selectedTicket = useMemo(
    () => filteredTickets.find((ticket) => String(ticket.id) === String(selectedTicketId)) || null,
    [filteredTickets, selectedTicketId]
  )

  const finalPrice = useMemo(() => {
    if (!selectedService) return 0
    if (selectedTicket) return 0

    const base = Number(selectedService.price || 0)
    const coupon = coupons.find((item) => item.code === formData.coupon)
    if (!coupon) return base

    if (coupon.type === 'fixed') return Math.max(0, base - Number(coupon.discount || 0))
    return Math.max(0, base * (1 - Number(coupon.discount || 0) / 100))
  }, [coupons, formData.coupon, selectedService, selectedTicket])

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true)
      setBootstrapError('')
      try {
        const [authResult, servicesResult, staffResult, couponsResult, settingsResult] = await Promise.allSettled([
          supabase.auth.getSession(),
          supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
          supabase.from('staff').select('*').eq('enabled', true).order('name'),
          supabase.from('coupons').select('*').eq('enabled', true),
          fetch('/api/public/settings').then(async (response) => {
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(payload?.error || T.settingsError)
            return payload
          }),
        ])

        const auth = authResult.status === 'fulfilled' ? authResult.value?.data : null
        const servicesRes = servicesResult.status === 'fulfilled' ? servicesResult.value : { data: [] }
        const staffRes = staffResult.status === 'fulfilled' ? staffResult.value : { data: [] }
        const couponsRes = couponsResult.status === 'fulfilled' ? couponsResult.value : { data: [] }
        const settingsRes = settingsResult.status === 'fulfilled' ? settingsResult.value : { settings: DEFAULT_SETTINGS }

        const user = auth?.session?.user || null
        setAuthUser(user)
        setServices(servicesRes.data || [])
        setStaffList(staffRes.data || [])
        setCoupons(couponsRes.data || [])
        setShopSettings(normalizePublicSettings(settingsRes))

        if (user) {
          try {
            await loadMemberContext(user)
          } catch (error) {
            console.error('Failed to load member context', error)
          }
        }

        const failures = [
          servicesResult.status === 'rejected' ? 'services' : '',
          staffResult.status === 'rejected' ? 'staff' : '',
          couponsResult.status === 'rejected' ? 'coupons' : '',
          settingsResult.status === 'rejected' ? 'settings' : '',
        ].filter(Boolean)

        if (authResult.status === 'rejected') {
          console.warn('Booking page auth bootstrap failed; continuing as guest.', authResult.reason)
        }

        if (failures.length > 0) {
          setBootstrapError(`${T.partialLoad}${failures.join(', ')}`)
        }
      } catch (error) {
        console.error('Failed to bootstrap booking page', error)
        setBootstrapError(error?.message || T.pageLoadError)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null
      setAuthUser(user)
      if (!user) {
        setUserTickets([])
        return
      }
      await loadMemberContext(user)
    })

    return () => {
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const loadEditBooking = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const nextEditId = params.get('editId') || ''
        setEditId(nextEditId)

        const staffId = params.get('staffId')
        if (staffId) setSelectedStaffId(staffId)
        if (!nextEditId) return

        const response = await fetch(`/api/account/bookings/${nextEditId}`)
        const result = await response.json()
        if (!response.ok) throw new Error(result?.error || T.bookingLoadError)

        const booking = result.booking
        setSelectedServiceId(String(booking.service_id || ''))
        setSelectedStaffId(booking.staff_id ? String(booking.staff_id) : 'random')
        setSelectedDate(booking.appointment_date || '')
        setSelectedTime(booking.start_time || booking.time || '')
        setFormData((current) => ({
          ...current,
          name: booking.customer_name || booking.name || current.name,
          phone: booking.customer_phone || booking.phone || current.phone,
          coupon: booking.coupon || '',
        }))
      } catch (error) {
        toast.error(error?.message || T.bookingLoadError)
      }
    }

    loadEditBooking()
  }, [])

  useEffect(() => {
    refreshAvailability()
  }, [selectedDate, selectedServiceId, selectedStaffId])

  useEffect(() => {
    if (!selectedTicketId) return
    if (!filteredTickets.some((ticket) => String(ticket.id) === String(selectedTicketId))) {
      setSelectedTicketId('')
    }
  }, [filteredTickets, selectedTicketId])

  const loadMemberContext = async (user) => {
    const [profileRes, ticketsRes] = await Promise.all([
      supabase.from('member_profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_tickets')
        .select('id,remaining_count,ticket_name,member_user_id,customer_id,ticket_id,tickets(*)')
        .or(`member_user_id.eq.${user.id},customer_id.eq.${user.id}`)
        .gt('remaining_count', 0),
    ])

    setFormData((current) => ({
      ...current,
      name: profileRes.data?.full_name || current.name,
      phone: profileRes.data?.phone || current.phone,
    }))
    setUserTickets(ticketsRes.data || [])
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !formData.name || !formData.phone) {
      toast.error(T.requiredFields)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error(T.loginFirst)
      const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/booking'
      router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
      return
    }

    setSubmitting(true)
    try {
      await supabase.from('member_profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: formData.name,
        phone: formData.phone,
      })

      const payload = {
        date: selectedDate,
        serviceId: selectedService.id,
        staffId: selectedStaffId !== 'random' ? Number(selectedStaffId) : null,
        startTime: selectedTime,
        customerName: formData.name,
        customerPhone: formData.phone,
        couponCode: formData.coupon || null,
        userTicketId: selectedTicket?.id || null,
      }

      const response = await fetch(editId ? `/api/account/bookings/${editId}` : '/api/bookings/create', {
        method: editId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || T.bookingFailed)

      const savedBooking = result.booking
      const ref = savedBooking?.ref || ''
      const shopPhone = String(shopSettings.phone || '').replace(/\D/g, '')
      const message = [
        T.whatsappIntro,
        `${T.ref}\uff1a${ref}`,
        `${T.service}\uff1a${selectedService.name}`,
        `${T.date}\uff1a${selectedDate}`,
        `${T.time}\uff1a${selectedTime}`,
        `${T.name}\uff1a${formData.name}`,
      ].join('\n')

      setBookingRef(ref)
      setWaUrl(shopPhone ? `https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}` : '')
      setShowModal(true)
      setSelectedTime('')
      await refreshAvailability()
      toast.success(editId ? T.updated : T.success)

      if (selectedTicket) {
        setSelectedTicketId('')
        await loadMemberContext(user)
      }
    } catch (error) {
      toast.error(error?.message || T.bookingFailed)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p>{T.loading}</p>
      </div>
    )
  }

  return (
    <>
      <section style={{ padding: '32px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>{editId ? T.editTitle : T.title}</h1>
        <p style={{ color: '#666' }}>{T.intro}</p>
        {isEditing && <p style={{ color: '#8B7355', fontSize: '14px', marginTop: '10px' }}>{T.editLocked}</p>}
      </section>

      <section style={{ padding: '24px 16px 40px' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto', display: 'grid', gap: '24px' }}>
          {bootstrapError && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '16px', padding: '16px 18px' }}>
              {bootstrapError}
            </div>
          )}

          {!authUser && (
            <div style={{ background: '#fff', borderRadius: '18px', padding: '20px', border: '1px dashed #d1d5db' }}>
              <div style={{ fontWeight: 800, marginBottom: '8px', color: '#A68B6A' }}>{T.memberTitle}</div>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '14px' }}>{T.memberIntro}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link href={`/login?redirectTo=${encodeURIComponent('/booking')}`} style={{ padding: '10px 16px', background: '#A68B6A', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
                  {T.login}
                </Link>
                <Link href={`/register?redirectTo=${encodeURIComponent('/booking')}`} style={{ padding: '10px 16px', background: '#fff', color: '#A68B6A', borderRadius: '10px', textDecoration: 'none', border: '1px solid #A68B6A', fontWeight: 700 }}>
                  {T.register}
                </Link>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '18px' }}>{T.section1}</h2>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.service}</label>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  disabled={isEditing}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: isEditing ? '#f9fafb' : '#fff' }}
                >
                  <option value="">{T.chooseService}</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(service.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.stylist}</label>
                <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}>
                  <option value="random">{T.randomStaff}</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedService && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#FAF8F5', borderRadius: '14px' }}>
                <div style={{ fontWeight: 800, marginBottom: '4px' }}>{selectedService.name}</div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  {formatServiceDuration(selectedService)} / {formatCurrency(selectedService.price)}
                </div>
                {selectedService.description && <div style={{ color: '#777', fontSize: '14px', marginTop: '8px' }}>{selectedService.description}</div>}
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '18px' }}>{T.section2}</h2>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.date}</label>
                <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.businessHours}</label>
                <input value={shopSettings.business_hours || DEFAULT_SETTINGS.business_hours} readOnly style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: '#f9fafb' }} />
              </div>
            </div>

            {loadingSlots ? (
              <p style={{ color: '#666' }}>{T.loadingSlots}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className="btn-interactive"
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: selectedTime === slot ? '1px solid #A68B6A' : '1px solid #e5e7eb',
                      background: selectedTime === slot ? '#A68B6A' : '#fff',
                      color: selectedTime === slot ? '#fff' : '#222',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}

            {!loadingSlots && selectedDate && availableSlots.length === 0 && <p style={{ color: '#777', marginTop: '12px' }}>{T.noSlots}</p>}
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '18px' }}>{T.section3}</h2>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.name}</label>
                <input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.phone}</label>
                <input value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.coupon}</label>
                <select
                  value={formData.coupon}
                  onChange={(event) => setFormData((current) => ({ ...current, coupon: event.target.value }))}
                  disabled={Boolean(selectedTicket) || isEditing}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: isEditing ? '#f9fafb' : '#fff' }}
                >
                  <option value="">{T.noCoupon}</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.code}>
                      {coupon.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.ticket}</label>
                <select
                  value={selectedTicketId}
                  onChange={(event) => {
                    setSelectedTicketId(event.target.value)
                    if (event.target.value) {
                      setFormData((current) => ({ ...current, coupon: '' }))
                    }
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}
                  disabled={!authUser || filteredTickets.length === 0 || isEditing}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: isEditing ? '#f9fafb' : '#fff' }}
                >
                  <option value="">{authUser ? T.noTicket : T.loginForTicket}</option>
                  {filteredTickets.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.ticket_name} / {T.remaining} {ticket.remaining_count} {T.times}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '18px', borderRadius: '14px', background: '#FAF8F5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{T.amount}</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>{selectedTicket ? T.ticketUse : T.couponApply}</div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#A68B6A' }}>{formatCurrency(finalPrice)}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-interactive"
              style={{ width: '100%', marginTop: '18px', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              {submitting ? T.submitting : editId ? T.update : T.submit}
            </button>
          </div>
        </div>
      </section>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>OK</div>
            <h2 style={{ marginBottom: '8px' }}>{editId ? T.updated : T.success}</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              {T.refLabel}
              {bookingRef || '-'}
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {waUrl ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                  {T.whatsappConfirm}
                </a>
              ) : (
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#f3f4f6', color: '#666', fontWeight: 700 }}>
                  <div>{T.whatsappUnavailable}</div>
                  <div style={{ fontSize: '12px', fontWeight: 500, marginTop: '4px' }}>{T.whatsappUnavailableHelp}</div>
                </div>
              )}
              <Link href="/account/bookings" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: '#f3f4f6', color: '#333', textDecoration: 'none', fontWeight: 700 }}>
                {T.viewBookings}
              </Link>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff', border: '1px solid #ddd', fontWeight: 700, cursor: 'pointer' }}>
                {T.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

const DEFAULT_SETTINGS = { phone: '', business_hours: '11:00 - 20:00', days_off: [], slot_step_min: 15 }
const T = {
  loadingPage: '\u8f09\u5165\u9810\u7d04\u9801\u9762\u4e2d...',
  loadingMember: '\u8f09\u5165\u6703\u54e1\u8cc7\u6599\u4e2d...',
  settingsError: '\u7121\u6cd5\u8f09\u5165\u9810\u7d04\u8cc7\u6599',
  slotsError: '\u7121\u6cd5\u53d6\u5f97\u53ef\u7528\u6642\u6bb5',
  bookingLoadError: '\u7121\u6cd5\u8f09\u5165\u539f\u9810\u7d04\u8cc7\u6599',
  requiredFields: '\u8acb\u586b\u5beb\u6240\u6709\u5fc5\u586b\u6b04\u4f4d',
  loginFirst: '\u8acb\u5148\u767b\u5165\u5f8c\u518d\u9810\u7d04',
  bookingFailed: '\u9810\u7d04\u5931\u6557',
  loadingSlots: '\u8f09\u5165\u53ef\u7528\u6642\u6bb5\u4e2d...',
  chooseServiceAndDate: '\u8acb\u5148\u9078\u64c7\u670d\u52d9\u8207\u65e5\u671f',
  noSlots: '\u9019\u500b\u65e5\u671f\u76ee\u524d\u6c92\u6709\u53ef\u7528\u6642\u6bb5\uff0c\u8acb\u6539\u9078\u5176\u4ed6\u65e5\u671f\u3002',
  title: '\u7dda\u4e0a\u9810\u7d04',
  editTitle: '\u4fee\u6539\u9810\u7d04',
  intro: '\u9078\u64c7\u670d\u52d9\u3001\u65e5\u671f\u8207\u6642\u9593\uff0c\u5b8c\u6210\u6b64\u8a2d\u8a08\u5e2b\u7684\u9810\u7d04\u3002',
  editLocked: '\u6539\u671f\u53ea\u6703\u8abf\u6574\u65e5\u671f\u3001\u6642\u6bb5\uff0c\u512a\u60e0\u8207\u5957\u7968\u6703\u4fdd\u7559\u539f\u9810\u7d04\u8a2d\u5b9a\u3002',
  back: '\u8fd4\u56de\u9078\u64c7\u8a2d\u8a08\u5e2b',
  memberTitle: '\u8acb\u5148\u767b\u5165\u6703\u54e1',
  memberIntro: '\u767b\u5165\u5f8c\u53ef\u81ea\u52d5\u5e36\u5165\u6703\u54e1\u8cc7\u6599\uff0c\u4e26\u4f7f\u7528 coupon \u8207\u5957\u7968\u3002',
  login: '\u767b\u5165',
  register: '\u8a3b\u518a',
  service: '\u670d\u52d9',
  chooseService: '\u8acb\u9078\u64c7\u670d\u52d9',
  businessHours: '\u71df\u696d\u6642\u9593',
  date: '\u65e5\u671f',
  time: '\u6642\u9593',
  name: '\u59d3\u540d',
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
  minutes: '\u5206\u9418',
  whatsappIntro: '\u4f60\u597d\uff0c\u6211\u60f3\u78ba\u8a8d\u4ee5\u4e0b\u9810\u7d04\u8cc7\u6599\uff1a',
  ref: '\u7de8\u865f',
  refLabel: '\u9810\u7d04\u7de8\u865f\uff1a',
  success: '\u9810\u7d04\u6210\u529f',
  updated: '\u9810\u7d04\u5df2\u66f4\u65b0',
  whatsappConfirm: 'WhatsApp \u78ba\u8a8d',
  whatsappUnavailable: '\u672a\u8a2d\u5b9a WhatsApp \u806f\u7d61\u865f\u78bc',
  whatsappUnavailableHelp: '\u8acb\u5148\u806f\u7d61\u5e97\u8216\u66f4\u65b0\u96fb\u8a71\u8a2d\u5b9a\u3002',
  viewBookings: '\u67e5\u770b\u6211\u7684\u9810\u7d04',
  close: '\u95dc\u9589',
  legendAvailable: '\u53ef\u9810\u7d04',
  legendUnavailable: '\u5df2\u88ab\u4f54\u7528 / \u4e0d\u53ef\u7528',
  legendSelected: '\u5df2\u9078\u64c7',
}

const box = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }
const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`
const formatServiceDuration = (service) => `${Number(service?.time || 60)} ${T.minutes}`
const getStep = (settings) => {
  const n = Number(settings?.slot_step_min)
  return Number.isFinite(n) && n > 0 ? n : 15
}
const getTicketServiceId = (ticket) => {
  const raw = ticket?.tickets?.service_id ?? ticket?.service_id ?? null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export default function BookingStaffDetailPage({ params }) {
  const router = useRouter()
  const availabilityControllerRef = useRef(null)
  const staffId = params?.staffId ? String(params.staffId) : ''
  const [pageLoading, setPageLoading] = useState(true)
  const [memberLoading, setMemberLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [publicError, setPublicError] = useState('')
  const [staff, setStaff] = useState(null)
  const [shopSettings, setShopSettings] = useState(DEFAULT_SETTINGS)
  const [services, setServices] = useState([])
  const [coupons, setCoupons] = useState([])
  const [userTickets, setUserTickets] = useState([])
  const [authUser, setAuthUser] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [slotMatrix, setSlotMatrix] = useState([])
  const [formData, setFormData] = useState({ name: '', phone: '', coupon: '' })
  const [editId, setEditId] = useState('')
  const [queryReady, setQueryReady] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [bookingRef, setBookingRef] = useState('')
  const [waUrl, setWaUrl] = useState('')
  const isEditing = Boolean(editId)

  const selectedService = useMemo(() => services.find((service) => String(service.id) === String(selectedServiceId)) || null, [services, selectedServiceId])
  const filteredTickets = useMemo(() => {
    if (!selectedService) return []
    return userTickets.filter((ticket) => {
      const linkedServiceId = getTicketServiceId(ticket)
      return linkedServiceId == null || linkedServiceId === Number(selectedService.id)
    })
  }, [selectedService, userTickets])
  const selectedTicket = useMemo(() => filteredTickets.find((ticket) => String(ticket.id) === String(selectedTicketId)) || null, [filteredTickets, selectedTicketId])
  const availableSlots = useMemo(() => slotMatrix.filter((slot) => slot.available).map((slot) => slot.time), [slotMatrix])
  const canLoadSlots = Boolean(selectedServiceId && selectedDate)
  const slotStepMin = getStep(shopSettings)
  const finalPrice = useMemo(() => {
    if (!selectedService) return 0
    if (selectedTicket) return 0
    const base = Number(selectedService.price || 0)
    const coupon = coupons.find((item) => item.code === formData.coupon)
    if (!coupon) return base
    if (coupon.type === 'fixed') return Math.max(0, base - Number(coupon.discount || 0))
    return Math.max(0, base * (1 - Number(coupon.discount || 0) / 100))
  }, [coupons, formData.coupon, selectedService, selectedTicket])

  const loadMemberContext = async (user) => {
    setMemberLoading(true)
    try {
      const [profileRes, ticketsRes, couponsRes] = await Promise.all([
        supabase.from('member_profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
        supabase.from('user_tickets').select('id,remaining_count,ticket_name,member_user_id,customer_id,ticket_id,tickets(*)').or(`member_user_id.eq.${user.id},customer_id.eq.${user.id}`).gt('remaining_count', 0),
        supabase.from('coupons').select('*').eq('enabled', true),
      ])
      setFormData((current) => ({ ...current, name: profileRes.data?.full_name || current.name, phone: profileRes.data?.phone || current.phone }))
      setUserTickets(ticketsRes.data || [])
      setCoupons(couponsRes.data || [])
    } finally {
      setMemberLoading(false)
    }
  }

  useEffect(() => {
    if (!staffId || staffId === 'random') {
      router.replace('/booking')
      return
    }
    let cancelled = false
    setPageLoading(true)
    setPublicError('')
    fetch(`/api/public/booking-bootstrap?staffId=${encodeURIComponent(staffId)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.settingsError)
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        setStaff(payload.staff || null)
        setServices(Array.isArray(payload.services) ? payload.services : [])
        setShopSettings({ ...DEFAULT_SETTINGS, ...(payload.settings || {}) })
      })
      .catch((error) => !cancelled && setPublicError(error?.message || T.settingsError))
      .finally(() => !cancelled && setPageLoading(false))
    return () => {
      cancelled = true
    }
  }, [router, staffId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const search = new URLSearchParams(window.location.search)
    setEditId(search.get('editId') || '')
    setQueryReady(true)
  }, [])

  useEffect(() => {
    let active = true
    const bootstrapMember = async () => {
      const sessionRes = await supabase.auth.getSession()
      const user = sessionRes?.data?.session?.user || null
      if (!active) return
      setAuthUser(user)
      if (user) {
        await loadMemberContext(user)
      } else {
        const couponsRes = await supabase.from('coupons').select('*').eq('enabled', true)
        if (!active) return
        setCoupons(couponsRes.data || [])
        setUserTickets([])
      }
    }
    bootstrapMember().catch(() => {})
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null
      setAuthUser(user)
      if (!user) {
        setUserTickets([])
        const couponsRes = await supabase.from('coupons').select('*').eq('enabled', true)
        if (active) setCoupons(couponsRes.data || [])
        return
      }
      await loadMemberContext(user)
    })
    return () => {
      active = false
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!queryReady || !editId) return
    let cancelled = false
    fetch(`/api/account/bookings/${editId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.bookingLoadError)
        return payload?.booking
      })
      .then((booking) => {
        if (cancelled || !booking) return
        setSelectedServiceId(String(booking.service_id || ''))
        setSelectedDate(booking.appointment_date || '')
        setSelectedTime(booking.start_time || booking.time || '')
        setFormData((current) => ({ ...current, name: booking.customer_name || booking.name || current.name, phone: booking.customer_phone || booking.phone || current.phone, coupon: booking.coupon || '' }))
      })
      .catch((error) => !cancelled && toast.error(error?.message || T.bookingLoadError))
    return () => {
      cancelled = true
    }
  }, [editId, queryReady])

  useEffect(() => {
    if (selectedTicketId && !filteredTickets.some((ticket) => String(ticket.id) === String(selectedTicketId))) setSelectedTicketId('')
  }, [filteredTickets, selectedTicketId])

  useEffect(() => {
    if (availabilityControllerRef.current) {
      availabilityControllerRef.current.abort()
      availabilityControllerRef.current = null
    }
    if (!canLoadSlots || !staffId || staffId === 'random') {
      setSlotMatrix([])
      setSelectedTime('')
      setLoadingSlots(false)
      return
    }
    const controller = new AbortController()
    availabilityControllerRef.current = controller
    setLoadingSlots(true)
    const query = new URLSearchParams({ date: selectedDate, serviceId: String(selectedServiceId), staffId: String(staffId) })
    fetch(`/api/availability?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.slotsError)
        return payload
      })
      .then((payload) => {
        const nextMatrix = Array.isArray(payload?.slotMatrix) ? payload.slotMatrix : []
        setSlotMatrix(nextMatrix)
        setSelectedTime((current) => (current && nextMatrix.some((slot) => slot.time === current && slot.available) ? current : ''))
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setSlotMatrix([])
        setSelectedTime('')
        toast.error(error?.message || T.slotsError)
      })
      .finally(() => {
        if (availabilityControllerRef.current === controller) {
          availabilityControllerRef.current = null
          setLoadingSlots(false)
        }
      })
    return () => {
      controller.abort()
      if (availabilityControllerRef.current === controller) availabilityControllerRef.current = null
    }
  }, [canLoadSlots, selectedDate, selectedServiceId, staffId])

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !formData.name || !formData.phone) return toast.error(T.requiredFields)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error(T.loginFirst)
      const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/booking/${staffId}`
      router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
      return
    }
    setSubmitting(true)
    try {
      await supabase.from('member_profiles').upsert({ id: user.id, email: user.email, full_name: formData.name, phone: formData.phone })
      const payload = { date: selectedDate, serviceId: selectedService.id, staffId: Number(staffId), startTime: selectedTime, customerName: formData.name, customerPhone: formData.phone, couponCode: formData.coupon || null, userTicketId: selectedTicket?.id || null }
      const response = await fetch(editId ? `/api/account/bookings/${editId}` : '/api/bookings/create', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || T.bookingFailed)
      const ref = result?.booking?.ref || ''
      const shopPhone = String(shopSettings.phone || '').replace(/\D/g, '')
      const message = [T.whatsappIntro, `${T.ref}: ${ref}`, `${T.service}: ${selectedService.name}`, `${T.date}: ${selectedDate}`, `${T.time}: ${selectedTime}`, `${T.name}: ${formData.name}`].join('\n')
      setBookingRef(ref)
      setWaUrl(shopPhone ? `https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}` : '')
      setShowModal(true)
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

  if (pageLoading) return <section style={{ padding: '48px 16px', textAlign: 'center' }}><p>{T.loadingPage}</p></section>
  if (publicError || !staff) return <section style={{ padding: '40px 16px' }}><div style={{ maxWidth: '900px', margin: '0 auto', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '16px', padding: '18px' }}>{publicError || T.settingsError}</div></section>

  return (
    <>
      <section style={{ padding: '28px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <Link href="/booking" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#8B7355', textDecoration: 'none', fontWeight: 700, marginBottom: '16px' }}><span aria-hidden="true">&lt;</span><span>{T.back}</span></Link>
          <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>{isEditing ? T.editTitle : T.title}</h1>
          <p style={{ color: '#666', marginBottom: isEditing ? '10px' : 0 }}>{T.intro}</p>
          {isEditing && <p style={{ color: '#8B7355', fontSize: '14px' }}>{T.editLocked}</p>}
        </div>
      </section>

      <section style={{ padding: '24px 16px 40px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gap: '24px', gridTemplateColumns: 'minmax(280px, 380px) minmax(0, 1fr)' }}>
          <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E8E0D5', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', alignSelf: 'start' }}>
            <div style={{ aspectRatio: '4 / 4.8', background: 'linear-gradient(135deg, #f6efe4, #faf8f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {staff.photo_url ? <img src={staff.photo_url} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '56px', fontWeight: 800, color: '#A68B6A' }}>{staff.name?.slice(0, 1) || 'S'}</div>}
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>{staff.name}</div>
              <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>{staff.role || 'Stylist'}</div>
              <div style={{ color: '#666', lineHeight: 1.7 }}>{staff.bio || T.intro}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '24px' }}>
            {memberLoading && <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: '14px', padding: '14px 16px' }}>{T.loadingMember}</div>}
            {!authUser && (
              <div style={{ background: '#fff', borderRadius: '18px', padding: '20px', border: '1px dashed #d1d5db' }}>
                <div style={{ fontWeight: 800, marginBottom: '8px', color: '#A68B6A' }}>{T.memberTitle}</div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '14px' }}>{T.memberIntro}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link href={`/login?redirectTo=${encodeURIComponent(`/booking/${staffId}${editId ? `?editId=${encodeURIComponent(editId)}` : ''}`)}`} style={{ padding: '10px 16px', background: '#A68B6A', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>{T.login}</Link>
                  <Link href={`/register?redirectTo=${encodeURIComponent(`/booking/${staffId}`)}`} style={{ padding: '10px 16px', background: '#fff', color: '#A68B6A', borderRadius: '10px', textDecoration: 'none', border: '1px solid #A68B6A', fontWeight: 700 }}>{T.register}</Link>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.service}</label>
                  <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} disabled={isEditing} style={{ ...box, background: isEditing ? '#f9fafb' : '#fff' }}>
                    <option value="">{T.chooseService}</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name} - {formatCurrency(service.price)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.businessHours}</label>
                  <input value={shopSettings.business_hours || DEFAULT_SETTINGS.business_hours} readOnly style={{ ...box, border: '1px solid #eee', background: '#f9fafb' }} />
                </div>
              </div>

              {selectedService && <div style={{ marginTop: '16px', padding: '16px', background: '#FAF8F5', borderRadius: '14px' }}><div style={{ fontWeight: 800, marginBottom: '4px' }}>{selectedService.name}</div><div style={{ color: '#666', fontSize: '14px' }}>{formatServiceDuration(selectedService)} / {formatCurrency(selectedService.price)}</div>{selectedService.description && <div style={{ color: '#777', fontSize: '14px', marginTop: '8px' }}>{selectedService.description}</div>}</div>}

              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '18px' }}>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.date}</label><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={box} /></div>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Slot Step</label><input readOnly value={`${slotStepMin} min`} style={{ ...box, border: '1px solid #eee', background: '#f9fafb' }} /></div>
              </div>

              <div style={{ marginTop: '18px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px' }}>{T.time}</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ display: 'inline-flex', padding: '8px 10px', borderRadius: '999px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontSize: '12px', fontWeight: 700 }}>{T.legendAvailable}</span>
                  <span style={{ display: 'inline-flex', padding: '8px 10px', borderRadius: '999px', background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 700 }}>{T.legendUnavailable}</span>
                  <span style={{ display: 'inline-flex', padding: '8px 10px', borderRadius: '999px', background: '#A68B6A', color: '#fff', border: '1px solid #8B7355', fontSize: '12px', fontWeight: 700 }}>{T.legendSelected}</span>
                </div>
                {loadingSlots ? <p style={{ color: '#666' }}>{T.loadingSlots}</p> : !canLoadSlots ? <p style={{ color: '#777' }}>{T.chooseServiceAndDate}</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: '10px' }}>{slotMatrix.map((slot) => { const isSelected = selectedTime === slot.time; const isAvailable = Boolean(slot.available); return <button key={slot.time} type="button" onClick={() => isAvailable && setSelectedTime(slot.time)} disabled={!isAvailable} className="btn-interactive" style={{ padding: '12px 10px', borderRadius: '12px', border: isSelected ? '1px solid #8B7355' : `1px solid ${isAvailable ? '#D6B98B' : '#E5E7EB'}`, background: isSelected ? '#A68B6A' : isAvailable ? '#F7EFE1' : '#F3F4F6', color: isSelected ? '#fff' : isAvailable ? '#6F563A' : '#9CA3AF', fontWeight: 700, cursor: isAvailable ? 'pointer' : 'not-allowed', opacity: isAvailable ? 1 : 0.8 }}>{slot.time}</button> })}</div>}
                {!loadingSlots && canLoadSlots && slotMatrix.length > 0 && availableSlots.length === 0 && <p style={{ color: '#777', marginTop: '12px' }}>{T.noSlots}</p>}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.name}</label><input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} style={box} /></div>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.phone}</label><input value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} style={box} /></div>
              </div>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.coupon}</label>
                  <select value={formData.coupon} onChange={(event) => setFormData((current) => ({ ...current, coupon: event.target.value }))} disabled={Boolean(selectedTicket) || isEditing} style={{ ...box, background: isEditing ? '#f9fafb' : '#fff' }}>
                    <option value="">{T.noCoupon}</option>
                    {coupons.map((coupon) => <option key={coupon.id} value={coupon.code}>{coupon.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>{T.ticket}</label>
                  <select value={selectedTicketId} onChange={(event) => { setSelectedTicketId(event.target.value); if (event.target.value) setFormData((current) => ({ ...current, coupon: '' })) }} disabled={!authUser || filteredTickets.length === 0 || isEditing} style={{ ...box, background: isEditing ? '#f9fafb' : '#fff' }}>
                    <option value="">{authUser ? T.noTicket : T.loginForTicket}</option>
                    {filteredTickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticket_name} / {T.remaining} {ticket.remaining_count} {T.times}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '20px', padding: '18px', borderRadius: '14px', background: '#FAF8F5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div><div style={{ fontWeight: 800 }}>{T.amount}</div><div style={{ color: '#666', fontSize: '14px' }}>{selectedTicket ? T.ticketUse : T.couponApply}</div></div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#A68B6A' }}>{formatCurrency(finalPrice)}</div>
                </div>
              </div>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-interactive" style={{ width: '100%', marginTop: '18px', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{submitting ? T.submitting : isEditing ? T.update : T.submit}</button>
            </div>
          </div>
        </div>
      </section>

      {showModal && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}><div style={{ background: '#fff', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '420px', textAlign: 'center' }}><div style={{ fontSize: '48px', marginBottom: '12px', fontWeight: 800, color: '#A68B6A' }}>OK</div><h2 style={{ marginBottom: '8px' }}>{isEditing ? T.updated : T.success}</h2><p style={{ color: '#666', marginBottom: '16px' }}>{T.refLabel}{bookingRef || '-'}</p><div style={{ display: 'grid', gap: '10px' }}>{waUrl ? <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>{T.whatsappConfirm}</a> : <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#f3f4f6', color: '#666', fontWeight: 700 }}><div>{T.whatsappUnavailable}</div><div style={{ fontSize: '12px', fontWeight: 500, marginTop: '4px' }}>{T.whatsappUnavailableHelp}</div></div>}<Link href="/account/bookings" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: '#f3f4f6', color: '#333', textDecoration: 'none', fontWeight: 700 }}>{T.viewBookings}</Link><button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff', border: '1px solid #ddd', fontWeight: 700, cursor: 'pointer' }}>{T.close}</button></div></div></div>}
    </>
  )
}

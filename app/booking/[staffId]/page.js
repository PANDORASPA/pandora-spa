'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../../lib/supabase/browser'

const fieldStyle = {
  width: '100%',
  minHeight: '48px',
  padding: '11px 13px',
  borderRadius: '14px',
  border: '1px solid #D6D3D1',
  background: '#fff',
  fontSize: '15px',
  color: '#1F2937',
}

const panelStyle = {
  padding: 'clamp(18px, 4vw, 24px)',
  border: '1px solid #E8E0D5',
  borderRadius: '24px',
  background: '#fff',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.04)',
}

const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const extractTimeText = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  const directMatch = text.match(/^(\d{2}:\d{2})(?::\d{2})?$/)
  if (directMatch) return directMatch[1]
  const isoMatch = text.match(/T(\d{2}:\d{2})(?::\d{2})?/)
  if (isoMatch) return isoMatch[1]
  const anyMatch = text.match(/(\d{2}:\d{2})(?::\d{2})?/)
  return anyMatch ? anyMatch[1] : ''
}

const normalizeSlotValue = (slot) => {
  if (typeof slot === 'string') {
    const value = extractTimeText(slot)
    return value ? { time: value } : null
  }
  if (!slot || typeof slot !== 'object') return null
  if (slot.available === false) return null
  const value = extractTimeText(slot.time || slot.startTime || slot.start_time)
  return value ? { ...slot, time: value } : null
}

const normalizeSlotList = (slots) =>
  Array.from(
    new Map(
      (Array.isArray(slots) ? slots : [])
        .map(normalizeSlotValue)
        .filter(Boolean)
        .map((slot) => [slot.time, slot]),
    ).values(),
  ).sort((left, right) => left.time.localeCompare(right.time))

export default function BookingStaffPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const staffId = Number(params?.staffId || 0)
  const editId = searchParams.get('editId') || ''

  const [staff, setStaff] = useState(null)
  const [services, setServices] = useState([])
  const [settings, setSettings] = useState({ phone: '', business_hours: '11:00 - 20:00' })
  const [serviceId, setServiceId] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [slots, setSlots] = useState([])
  const [selectedTime, setSelectedTime] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [memberProfile, setMemberProfile] = useState(null)
  const [memberProfileLoading, setMemberProfileLoading] = useState(true)
  const [userTickets, setUserTickets] = useState([])
  const [selectedUserTicketId, setSelectedUserTicketId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingBooking, setEditingBooking] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    fetch(`/api/public/booking-bootstrap?staffId=${encodeURIComponent(String(staffId || ''))}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '無法載入預約資料')
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        const nextServices = Array.isArray(payload?.services) ? payload.services : []
        setStaff(payload?.staff || null)
        setServices(nextServices)
        setSettings(payload?.settings || { phone: '', business_hours: '11:00 - 20:00' })
        setServiceId((current) => current || (nextServices[0]?.id != null ? String(nextServices[0].id) : ''))
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError?.message || '無法載入預約資料')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [staffId])

  useEffect(() => {
    if (!editId) return
    let cancelled = false

    fetch(`/api/account/bookings/${encodeURIComponent(editId)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '無法載入原預約')
        return payload?.booking
      })
      .then((booking) => {
        if (cancelled || !booking) return
        setEditingBooking(booking)
        if (booking.service_id) setServiceId(String(booking.service_id))
        if (booking.appointment_date) setSelectedDate(String(booking.appointment_date).slice(0, 10))
        if (booking.start_time) setSelectedTime(extractTimeText(booking.start_time))
        setCustomerName(booking.customer_name || booking.name || '')
        setCustomerPhone(booking.customer_phone || booking.phone || '')
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || '無法載入原預約')
      })

    return () => {
      cancelled = true
    }
  }, [editId])

  useEffect(() => {
    let cancelled = false

    const loadMemberProfile = async () => {
      setMemberProfileLoading(true)
      try {
        const supabase = getBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (!cancelled) setMemberProfile(null)
          return
        }

        const { data: profile } = await supabase.from('member_profiles').select('full_name,phone,email').eq('id', user.id).maybeSingle()

        if (cancelled) return

        const nextProfile = {
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || user.user_metadata?.full_name || '',
          phone: profile?.phone || user.user_metadata?.phone || '',
        }

        setMemberProfile(nextProfile)
        setCustomerName(String(nextProfile.full_name || ''))
        setCustomerPhone(String(nextProfile.phone || ''))

        try {
          const ticketResponse = await fetch('/api/account/tickets', { cache: 'no-store' })
          const ticketPayload = await ticketResponse.json().catch(() => ({}))
          setUserTickets(ticketResponse.ok && Array.isArray(ticketPayload?.tickets) ? ticketPayload.tickets : [])
        } catch {
          setUserTickets([])
        }
      } catch {
        if (!cancelled) setMemberProfile(null)
      } finally {
        if (!cancelled) setMemberProfileLoading(false)
      }
    }

    loadMemberProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedService = useMemo(() => services.find((item) => String(item.id) === String(serviceId)) || null, [services, serviceId])
  const usableTickets = useMemo(() => {
    const now = Date.now()
    return (userTickets || []).filter((ticket) => {
      if (Number(ticket?.remaining_count || 0) <= 0) return false
      if (ticket?.expiry_date && Date.parse(ticket.expiry_date) < now) return false
      const rawTicketServiceId = ticket?.tickets?.service_id
      if (rawTicketServiceId === null || rawTicketServiceId === undefined || rawTicketServiceId === '') return true
      const ticketServiceId = Number(rawTicketServiceId)
      return !Number.isFinite(ticketServiceId) || ticketServiceId === Number(serviceId)
    })
  }, [serviceId, userTickets])
  const selectedUserTicket = useMemo(() => usableTickets.find((ticket) => String(ticket.id) === String(selectedUserTicketId)) || null, [selectedUserTicketId, usableTickets])
  const amountDue = selectedUserTicket ? 0 : Number(selectedService?.price || 0)

  useEffect(() => {
    if (selectedUserTicketId && !usableTickets.some((ticket) => String(ticket.id) === String(selectedUserTicketId))) {
      setSelectedUserTicketId('')
    }
  }, [selectedUserTicketId, usableTickets])

  useEffect(() => {
    if (!selectedDate || !staffId || !serviceId) {
      setSlots([])
      return
    }

    const controller = new AbortController()
    setLoadingSlots(true)
    setSelectedTime('')

    const slotParams = new URLSearchParams({
      date: selectedDate,
      serviceId: String(serviceId),
      staffId: String(staffId),
    })

    fetch(`/api/availability?${slotParams.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '無法載入可預約時段')
        return payload
      })
      .then((payload) => {
        if (controller.signal.aborted) return
        const rawSlots = Array.isArray(payload?.slots)
          ? payload.slots
          : Array.isArray(payload?.slotMatrix)
            ? payload.slotMatrix.flat().filter(Boolean)
            : []
        setSlots(normalizeSlotList(rawSlots))
      })
      .catch((fetchError) => {
        if (fetchError?.name !== 'AbortError') {
          setSlots([])
          setError(fetchError?.message || '無法載入可預約時段')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false)
      })

    return () => controller.abort()
  }, [selectedDate, serviceId, staffId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedDate) return toast.error('請先選擇日期')
    if (!selectedTime) return toast.error('請先選擇時段')
    const effectiveCustomerName = String(memberProfile?.full_name || customerName || '').trim()
    const effectiveCustomerPhone = String(memberProfile?.phone || customerPhone || '').trim()

    if (memberProfile && (!effectiveCustomerName || !effectiveCustomerPhone)) {
      return toast.error('請先完成帳戶資料中的姓名及電話')
    }

    setSubmitting(true)
    try {
      const response = await fetch(editId ? `/api/account/bookings/${encodeURIComponent(editId)}` : '/api/bookings/create', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          serviceId: Number(serviceId),
          staffId,
          startTime: selectedTime,
          locationId: null,
          customerName: effectiveCustomerName,
          customerPhone: effectiveCustomerPhone,
          userTicketId: selectedUserTicket?.id || null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '提交預約失敗')
      toast.success(editId ? '預約已更新' : '預約已送出')
      router.push('/account/bookings')
    } catch (submitError) {
      toast.error(submitError?.message || '提交預約失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <section className="vh-loading">載入頭皮護理師資料中...</section>
  }

  if (!staff) {
    return (
      <section className="vh-loading">
        <p>{error || '找不到這位頭皮護理師'}</p>
        <Link href="/booking">返回預約入口</Link>
      </section>
    )
  }

  return (
    <div style={{ padding: '32px 16px max(48px, env(safe-area-inset-bottom))', background: '#FAF8F5', minHeight: '100vh' }}>
      <div className="booking-layout" style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '20px', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 320px)' }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="admin-card" style={panelStyle}>
            <h1 style={{ margin: 0, fontSize: '30px' }}>{editId ? '更改預約時段' : '線上預約'}</h1>
            <p style={{ marginTop: '8px', color: '#666' }}>
              {editId && editingBooking ? '正在更新原有預約。請重新選擇頭皮護理服務、日期和時段。' : '選擇頭皮護理服務、日期和時段；如有適用套票，可在提交前選擇扣次使用。'}
            </p>
          </div>

          {error ? <div className="vh-alert vh-alert-error">{error}</div> : null}

          <form className="admin-card" style={{ ...panelStyle, display: 'grid', gap: '18px' }} onSubmit={handleSubmit}>
            <div className="booking-provider-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#8BA58B', fontWeight: 800, letterSpacing: '0.08em' }}>頭皮護理師</div>
                <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: 900 }}>{staff.name}</div>
                <div style={{ marginTop: '6px', color: '#6B7280' }}>{staff.role || '頭皮護理師'}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#6B7280', fontSize: '13px' }}>{settings.phone ? `查詢電話：${settings.phone}` : null}</div>
            </div>

            <div className="booking-service-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: '14px', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>頭皮護理服務</span>
                <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} style={fieldStyle}>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>營業時間</span>
                <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center' }}>{settings.business_hours || '11:00 - 20:00'}</div>
              </div>
            </div>

            <div className="booking-date-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)', gap: '14px', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>日期</span>
                <input type="date" min={todayISO()} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={fieldStyle} />
              </label>

              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>可預約時段</span>
                <select value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} style={fieldStyle} disabled={!selectedDate || loadingSlots || slots.length === 0}>
                  <option value="">{loadingSlots ? '載入時段中...' : slots.length ? '請選擇時段' : '暫時沒有可預約時段'}</option>
                  {slots.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      {slot.time}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {memberProfile ? (
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '16px', padding: '14px', background: '#F8FAFC', color: '#374151', lineHeight: 1.7 }}>
                <strong>會員資料</strong>
                <div>姓名：{memberProfile.full_name || '-'}</div>
                <div>電話：{memberProfile.phone || '-'}</div>
                {memberProfile.email ? <div>電郵：{memberProfile.email}</div> : null}
                {!memberProfileLoading && (!memberProfile.full_name || !memberProfile.phone) ? (
                  <div style={{ color: '#B45309', marginTop: '8px' }}>請先完成帳戶資料中的姓名及電話，才可提交預約。</div>
                ) : null}
              </div>
            ) : (
              <div className="booking-guest-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>顧客姓名</span>
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={fieldStyle} placeholder="請輸入姓名" />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>聯絡電話</span>
                  <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} style={fieldStyle} placeholder="請輸入電話" />
                </label>
              </div>
            )}

            {memberProfile ? (
              <div className="admin-card" style={{ ...panelStyle, padding: '20px', display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#8BA58B', fontWeight: 800, letterSpacing: '0.08em' }}>套票</div>
                  <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>使用我的套票</div>
                </div>
                {usableTickets.length > 0 ? (
                  <label style={{ display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800 }}>可用套票</span>
                    <select value={selectedUserTicketId} onChange={(event) => setSelectedUserTicketId(event.target.value)} style={fieldStyle}>
                      <option value="">不使用套票，現場付款</option>
                      {usableTickets.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {ticket.ticket_name || ticket?.tickets?.name || `套票 #${ticket.id}`} - 剩餘 {ticket.remaining_count} 次
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div style={{ border: '1px dashed #D6D3D1', borderRadius: '14px', padding: '14px', color: '#6B7280', lineHeight: 1.7 }}>
                    這項服務暫時沒有可用套票。你仍可正常提交預約。
                  </div>
                )}
                {selectedUserTicket ? <div style={{ background: '#F0FDF4', color: '#166534', borderRadius: '14px', padding: '12px 14px', fontWeight: 800 }}>今次預約會扣 1 次套票，應付金額為 $0。</div> : null}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn btn-interactive"
              disabled={submitting || !selectedDate || !selectedTime || Boolean(memberProfile && (!memberProfile.full_name || !memberProfile.phone))}
              style={{ width: '100%', minHeight: '52px', background: '#8BA58B', color: '#fff', borderRadius: '14px', fontWeight: 800 }}
            >
              {submitting ? '提交中...' : editId ? '更新預約' : '提交預約'}
            </button>
          </form>
        </div>

        <aside className="admin-card booking-summary" style={{ ...panelStyle, height: 'fit-content', position: 'sticky', top: '24px' }}>
          <div style={{ fontSize: '12px', color: '#8BA58B', fontWeight: 800, letterSpacing: '0.08em' }}>預約摘要</div>
          <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>服務</div>
              <strong>{selectedService?.name || '-'}</strong>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>日期</div>
              <strong>{selectedDate || '-'}</strong>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>時間</div>
              <strong>{selectedTime || '-'}</strong>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>應付金額</div>
              <strong>${amountDue.toFixed(0)}</strong>
              {selectedUserTicket ? <div style={{ color: '#166534', fontSize: '12px', marginTop: '4px' }}>使用套票扣 1 次</div> : null}
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 860px) {
          .booking-layout {
            grid-template-columns: 1fr !important;
          }
          .booking-provider-row,
          .booking-service-row,
          .booking-date-row,
          .booking-guest-row {
            grid-template-columns: 1fr !important;
          }
          .booking-provider-row > div:last-child {
            text-align: left !important;
          }
          .booking-summary {
            position: static !important;
          }
        }
      `}</style>
    </div>
  )
}

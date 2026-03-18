'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const formatServiceDuration = (service) => {
  const duration = Number(service?.time || 60)
  return `${duration} 分鐘`
}

const buildSettingsMap = (rows) =>
  (rows || []).reduce((acc, row) => {
    acc[row.key] = row.value
    return acc
  }, {})

export default function BookingPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [shopSettings, setShopSettings] = useState({})
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

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId]
  )

  const filteredTickets = useMemo(() => {
    if (!selectedService) return []
    return userTickets.filter((ticket) => Number(ticket?.tickets?.service_id) === Number(selectedService.id))
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
      try {
        const [{ data: auth }, servicesRes, staffRes, couponsRes, settingsRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
          supabase.from('staff').select('*').eq('enabled', true).order('name'),
          supabase.from('coupons').select('*').eq('enabled', true),
          supabase.from('settings').select('*'),
        ])

        const user = auth?.user || auth?.data?.user || null
        setAuthUser(user)
        setServices(servicesRes.data || [])
        setStaffList(staffRes.data || [])
        setCoupons(couponsRes.data || [])
        setShopSettings(buildSettingsMap(settingsRes.data || []))

        if (user) {
          await loadMemberContext(user)
        }
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
        if (!response.ok) throw new Error(result?.error || 'Failed to load booking')

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
        toast.error(error?.message || 'Failed to load booking')
      }
    }

    loadEditBooking()
  }, [])

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedServiceId || !selectedDate) {
        setAvailableSlots([])
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
        if (!response.ok) throw new Error(result?.error || 'Failed to fetch available slots')
        setAvailableSlots(result.slots || [])
      } catch (error) {
        setAvailableSlots([])
        toast.error(error?.message || '無法讀取可預約時段')
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
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
        .select('id,remaining_count,ticket_name,member_user_id,customer_id,tickets(service_id)')
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
      toast.error('請填寫所有必填欄位')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('請先登入會員後再預約')
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
      if (!response.ok) throw new Error(result?.error || '預約失敗')

      const savedBooking = result.booking
      const ref = savedBooking?.ref || ''
      const shopPhone = String(shopSettings.phone || '85212345678').replace(/\D/g, '')
      const message = [
        '你好，我想確認預約資料：',
        `編號：${ref}`,
        `服務：${selectedService.name}`,
        `日期：${selectedDate}`,
        `時間：${selectedTime}`,
        `姓名：${formData.name}`,
      ].join('\n')

      setBookingRef(ref)
      setWaUrl(`https://wa.me/${shopPhone}?text=${encodeURIComponent(message)}`)
      setShowModal(true)
      toast.success(editId ? '預約已更新' : '預約成功')

      if (selectedTicket) {
        setSelectedTicketId('')
        await loadMemberContext(user)
      }
    } catch (error) {
      toast.error(error?.message || '預約失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p>載入中...</p>
      </div>
    )
  }

  return (
    <>
      <section style={{ padding: '32px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>{editId ? '更改預約' : '線上預約'}</h1>
        <p style={{ color: '#666' }}>統一使用會員登入與伺服器預約流程，避免時段衝突與資料不一致。</p>
      </section>

      <section style={{ padding: '24px 16px 40px' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto', display: 'grid', gap: '24px' }}>
          {!authUser && (
            <div style={{ background: '#fff', borderRadius: '18px', padding: '20px', border: '1px dashed #d1d5db' }}>
              <div style={{ fontWeight: 800, marginBottom: '8px', color: '#A68B6A' }}>請先登入會員</div>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '14px' }}>登入後先會顯示你的會員資料、可用套票與私人預約記錄。</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link href={`/login?redirectTo=${encodeURIComponent('/booking')}`} style={{ padding: '10px 16px', background: '#A68B6A', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
                  登入
                </Link>
                <Link href={`/register?redirectTo=${encodeURIComponent('/booking')}`} style={{ padding: '10px 16px', background: '#fff', color: '#A68B6A', borderRadius: '10px', textDecoration: 'none', border: '1px solid #A68B6A', fontWeight: 700 }}>
                  註冊
                </Link>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '18px' }}>1. 選擇服務與髮型師</h2>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>服務</label>
                <select value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}>
                  <option value="">請選擇服務</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {formatCurrency(service.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>髮型師</label>
                <select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}>
                  <option value="random">系統分配</option>
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
                  {formatServiceDuration(selectedService)} · {formatCurrency(selectedService.price)}
                </div>
                {selectedService.description && <div style={{ color: '#777', fontSize: '14px', marginTop: '8px' }}>{selectedService.description}</div>}
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '18px' }}>2. 選擇日期與時段</h2>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>日期</label>
                <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>營業時間</label>
                <input value={shopSettings.business_hours || '11:00 - 20:00'} readOnly style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: '#f9fafb' }} />
              </div>
            </div>

            {loadingSlots ? (
              <p style={{ color: '#666' }}>載入可用時段中...</p>
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

            {!loadingSlots && selectedDate && availableSlots.length === 0 && (
              <p style={{ color: '#777', marginTop: '12px' }}>該日期暫無可用時段，請改選其他日期或髮型師。</p>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '18px' }}>3. 聯絡資料與優惠</h2>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>姓名</label>
                <input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>電話</label>
                <input value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>優惠碼</label>
                <select
                  value={formData.coupon}
                  onChange={(event) => setFormData((current) => ({ ...current, coupon: event.target.value }))}
                  disabled={Boolean(selectedTicket)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}
                >
                  <option value="">不使用優惠碼</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.code}>
                      {coupon.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>會員套票</label>
                <select
                  value={selectedTicketId}
                  onChange={(event) => {
                    setSelectedTicketId(event.target.value)
                    if (event.target.value) {
                      setFormData((current) => ({ ...current, coupon: '' }))
                    }
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd' }}
                  disabled={!authUser || filteredTickets.length === 0}
                >
                  <option value="">{authUser ? '不使用套票' : '登入後可使用套票'}</option>
                  {filteredTickets.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.ticket_name} · 剩餘 {ticket.remaining_count} 次
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '18px', borderRadius: '14px', background: '#FAF8F5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>應付金額</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {selectedTicket ? '本次將扣除 1 次套票額度' : '優惠會由伺服器再次驗證'}
                  </div>
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
              {submitting ? '提交中...' : editId ? '更新預約' : '提交預約'}
            </button>
          </div>
        </div>
      </section>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>OK</div>
            <h2 style={{ marginBottom: '8px' }}>{editId ? '預約已更新' : '預約成功'}</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>預約編號：{bookingRef || '-'}</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                WhatsApp 確認
              </a>
              <Link href="/account/bookings" style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', background: '#f3f4f6', color: '#333', textDecoration: 'none', fontWeight: 700 }}>
                查看我的預約
              </Link>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff', border: '1px solid #ddd', fontWeight: 700, cursor: 'pointer' }}>
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

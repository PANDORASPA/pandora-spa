'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

const formatDateValue = (value) => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function BookingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [fetchError, setFetchError] = useState('')

  const [selectedServiceId, setSelectedServiceId] = useState(searchParams.get('serviceId') || '')
  const [selectedStaffId, setSelectedStaffId] = useState(searchParams.get('staffId') || '')
  const [selectedDate, setSelectedDate] = useState(formatDateValue(searchParams.get('date')))
  const [selectedTime, setSelectedTime] = useState(searchParams.get('time') || '')
  const [couponCode, setCouponCode] = useState(searchParams.get('coupon') || '')
  const [formData, setFormData] = useState({ name: '', phone: '' })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setFetchError('')

      try {
        const supabase = getBrowserClient()
        const [authResult, servicesResult, staffResult, couponsResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('services').select('*').eq('enabled', true).order('sort_order').order('id'),
          supabase.from('staff').select('*').eq('enabled', true).order('name'),
          supabase.from('coupons').select('*').eq('enabled', true).order('id'),
        ])

        const authUser = authResult?.data?.user || null
        setUser(authUser)

        if (!authUser) {
          router.replace(`/login?redirectTo=${encodeURIComponent('/booking')}`)
          return
        }

        const profileResult = await supabase
          .from('member_profiles')
          .select('full_name, phone, email')
          .eq('id', authUser.id)
          .maybeSingle()

        const memberProfile = profileResult.data || null
        setProfile(memberProfile)
        setFormData({
          name: memberProfile?.full_name || '',
          phone: memberProfile?.phone || '',
        })

        setServices(servicesResult.data || [])
        setStaff(staffResult.data || [])
        setCoupons(couponsResult.data || [])
      } catch (error) {
        setFetchError(error?.message || '載入預約資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const selectedService = useMemo(
    () => services.find((item) => String(item.id) === String(selectedServiceId)) || null,
    [selectedServiceId, services]
  )

  useEffect(() => {
    async function loadSlots() {
      if (!selectedServiceId || !selectedDate) {
        setAvailableSlots([])
        return
      }

      setSlotsLoading(true)
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          serviceId: String(selectedServiceId),
        })

        if (selectedStaffId) params.set('staffId', selectedStaffId)

        const response = await fetch(`/api/availability?${params.toString()}`)
        const json = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(json?.error || '讀取時段失敗')
        }

        setAvailableSlots(Array.isArray(json?.slots) ? json.slots : [])
      } catch (error) {
        setAvailableSlots([])
        toast.error(error?.message || '讀取時段失敗')
      } finally {
        setSlotsLoading(false)
      }
    }

    loadSlots()
  }, [selectedDate, selectedServiceId, selectedStaffId])

  const selectedCoupon = coupons.find((item) => item.code === couponCode) || null
  const finalPrice = useMemo(() => {
    if (!selectedService) return 0
    const basePrice = Number(selectedService.price || 0)
    if (!selectedCoupon) return basePrice
    if (selectedCoupon.type === 'fixed') {
      return Math.max(0, basePrice - Number(selectedCoupon.discount || 0))
    }
    return Math.max(0, Math.round(basePrice * (1 - Number(selectedCoupon.discount || 0) / 100)))
  }, [selectedCoupon, selectedService])

  const handleSubmit = async () => {
    if (!user) {
      router.push('/login?redirectTo=/booking')
      return
    }

    if (!selectedServiceId || !selectedDate || !selectedTime || !formData.name || !formData.phone) {
      toast.error('請先完成服務、日期、時間與聯絡資料')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: Number(selectedServiceId),
          staffId: selectedStaffId || null,
          date: selectedDate,
          startTime: selectedTime,
          customerName: formData.name,
          customerPhone: formData.phone,
          coupon: couponCode || null,
        }),
      })

      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(json?.error || '建立預約失敗')
      }

      toast.success('預約成功')
      router.replace('/account/bookings')
    } catch (error) {
      toast.error(error?.message || '建立預約失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '80px 16px', textAlign: 'center' }}>載入預約資料中...</div>
  }

  if (fetchError) {
    return (
      <div style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '10px' }}>預約頁面暫時未能載入</h1>
        <p style={{ color: '#666' }}>{fetchError}</p>
      </div>
    )
  }

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>預約服務</h1>
        <p style={{ color: '#666' }}>登入會員後即可選擇服務、設計師與可用時段。</p>
      </section>

      <section style={{ padding: '32px 16px 80px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gap: '20px' }}>
          <div className="admin-card" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '12px' }}>1. 會員資料</h2>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>電話</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '12px' }}>目前登入：{profile?.email || user?.email}</p>
          </div>

          <div className="admin-card" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '12px' }}>2. 選擇服務</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {services.length === 0 ? (
                <p style={{ color: '#666' }}>目前沒有可預約的服務。</p>
              ) : (
                services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(String(service.id))
                      setSelectedTime('')
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '16px',
                      borderRadius: '14px',
                      border: selectedServiceId === String(service.id) ? '2px solid #A68B6A' : '1px solid #e5e5e5',
                      background: selectedServiceId === String(service.id) ? '#FAF8F5' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{service.name}</div>
                        <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>{service.time || 60} 分鐘</div>
                      </div>
                      <div style={{ color: '#A68B6A', fontWeight: 800 }}>${service.price}</div>
                    </div>
                    {service.description ? <div style={{ marginTop: '8px', color: '#777', fontSize: '14px' }}>{service.description}</div> : null}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="admin-card" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '12px' }}>3. 選擇設計師與日期</h2>
            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>設計師</label>
                <select
                  value={selectedStaffId}
                  onChange={(event) => {
                    setSelectedStaffId(event.target.value)
                    setSelectedTime('')
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                >
                  <option value="">任何可用設計師</option>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => {
                    setSelectedDate(event.target.value)
                    setSelectedTime('')
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                />
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '12px' }}>4. 可預約時段</h2>
            {!selectedServiceId || !selectedDate ? (
              <p style={{ color: '#666' }}>請先選擇服務與日期。</p>
            ) : slotsLoading ? (
              <p style={{ color: '#666' }}>讀取可用時段中...</p>
            ) : availableSlots.length === 0 ? (
              <p style={{ color: '#666' }}>這一天暫時沒有可用時段，請改選其他日期或設計師。</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: selectedTime === slot ? '2px solid #A68B6A' : '1px solid #ddd',
                      background: selectedTime === slot ? '#FAF8F5' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '12px' }}>5. 優惠與確認</h2>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>優惠券</label>
              <select
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
              >
                <option value="">不使用優惠券</option>
                {coupons.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.code} - {item.name || '優惠'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ background: '#FAF8F5', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div>服務：{selectedService?.name || '尚未選擇'}</div>
                <div>日期：{selectedDate || '尚未選擇'}</div>
                <div>時間：{selectedTime || '尚未選擇'}</div>
                <div>設計師：{staff.find((item) => String(item.id) === String(selectedStaffId))?.name || '由系統安排'}</div>
                <div style={{ fontWeight: 800, color: '#A68B6A' }}>總額：${finalPrice}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-interactive"
              style={{ width: '100%', background: '#A68B6A', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 700 }}
            >
              {submitting ? '提交預約中...' : '確認預約'}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export default function BookingPage() {
  return (
    <Suspense>
      <BookingInner />
    </Suspense>
  )
}

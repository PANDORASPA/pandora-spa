'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'

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

function Pill({ children, tone = 'default' }) {
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

const T = {
  title: '線上預約',
  intro: '先選擇日期，再從下拉選單選擇可預約的時段。',
  loadingStaff: '載入服務供應者中...',
  loadingDates: '載入月曆中...',
  loadingSlots: '載入可預約時段中...',
  chooseDateFirst: '請先選擇日期',
  chooseTimeFirst: '請先選擇時段',
  noAvailability: '暫時沒有可預約時段',
  submit: '提交預約',
  submitted: '預約已送出',
  unavailable: '休息',
  full: '已滿',
  available: '可預約',
  fullNote: '有上班，但今天已滿',
  configLimitedNote: '已設定上班，但此服務目前未形成可預約時段',
  offNote: '今天休息，未有可預約時段',
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
    return { dateISO, inMonth: dateISO.startsWith(monthKey), dayLabel: dateISO.slice(8, 10) }
  })
}

const getFullReasonLabel = (summary) => {
  if (!summary) return T.fullNote
  if (summary.reason === 'location_required') return '已設定上班，但此服務需要先確認地點才可形成可預約時段'
  if (summary.reason === 'provider_mismatch') return '已設定上班，但此服務與服務供應者設定未形成可預約時段'
  if (summary.reason === 'no_bookable_slots') return '今天有上班，但可預約時段已被休息、休假或封鎖時段扣減'
  return T.fullNote
}

const getCalendarStatusLabel = (summary) => {
  if (!summary) return T.unavailable
  if (summary.status === 'available') return T.available
  if (summary.status === 'off') return T.unavailable
  if (summary.reason === 'provider_mismatch' || summary.reason === 'location_required' || summary.reason === 'no_bookable_slots') {
    return '未成時段'
  }
  return T.full
}

export default function BookingStaffPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const staffId = Number(params?.staffId || searchParams.get('staffId') || 0)

  const [staff, setStaff] = useState(null)
  const [services, setServices] = useState([])
  const [settings, setSettings] = useState({ phone: '', business_hours: '11:00 - 20:00' })
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
        setServiceId(nextServices[0]?.id != null ? String(nextServices[0].id) : '')
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
    if (!staffId || !serviceId || !monthKey) return
    let cancelled = false
    setLoadingSummary(true)
    setError('')
    fetch(`/api/availability/month-summary?staffId=${staffId}&serviceId=${serviceId}&year=${monthKey.slice(0, 4)}&month=${monthKey.slice(5, 7)}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '無法載入月曆')
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        const dates = Array.isArray(payload?.dates) ? payload.dates : []
        setMonthSummary(dates)
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError?.message || '無法載入月曆')
      })
      .finally(() => {
        if (!cancelled) setLoadingSummary(false)
      })
    return () => {
      cancelled = true
    }
  }, [monthKey, serviceId, staffId])

  const summaryMap = useMemo(() => new Map(monthSummary.map((entry) => [entry.date, entry])), [monthSummary])
  const monthGrid = useMemo(() => buildMonthGrid(monthKey), [monthKey])
  const selectedSummary = selectedDate ? summaryMap.get(selectedDate) : null
  const selectedService = useMemo(() => services.find((item) => String(item.id) === String(serviceId)) || null, [services, serviceId])

  useEffect(() => {
    if (!monthSummary.length) return
    if (!selectedDate || !selectedDate.startsWith(monthKey)) {
      const firstAvailable = monthSummary.find((entry) => entry?.status === 'available')
      const firstFull = monthSummary.find((entry) => entry?.status === 'full')
      setSelectedDate(firstAvailable?.date || firstFull?.date || '')
      return
    }

    const current = summaryMap.get(selectedDate)
    if (!current || current.status === 'off') {
      const firstAvailable = monthSummary.find((entry) => entry?.status === 'available')
      const firstFull = monthSummary.find((entry) => entry?.status === 'full')
      setSelectedDate(firstAvailable?.date || firstFull?.date || '')
    }
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
    fetch(`/api/availability?date=${selectedDate}&serviceId=${serviceId}&staffId=${staffId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '無法載入時段')
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        const nextSlots = Array.isArray(payload?.slots)
          ? payload.slots
          : Array.isArray(payload?.slotMatrix)
            ? payload.slotMatrix.flat().filter(Boolean)
            : []
        setSlots(nextSlots)
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setSlots([])
          setError(fetchError?.message || '無法載入時段')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate, serviceId, staffId, summaryMap])

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
      if (!response.ok) throw new Error(payload?.error || '預約失敗')
      toast.success(T.submitted)
      router.push('/account/bookings')
    } catch (submitError) {
      toast.error(submitError?.message || '預約失敗')
    }
  }

  if (loading) {
    return <section style={{ padding: '48px 16px', textAlign: 'center' }}>{T.loadingStaff}</section>
  }

  if (!staff) {
    return (
      <section style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p>{error || '找不到服務供應者'}</p>
        <Link href="/booking">返回選擇服務供應者</Link>
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

          <div className="admin-card" style={{ ...panelStyle, display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: '16px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>服務供應者</div>
                <div style={{ marginTop: '4px', fontSize: '24px', fontWeight: 900 }}>{staff.name}</div>
                <div style={{ marginTop: '6px', color: '#6B7280' }}>{staff.role || '服務供應者'}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#6B7280', fontSize: '13px' }}>{settings.phone ? `查詢：${settings.phone}` : null}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>服務</span>
                <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} style={fieldStyle}>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>顧客姓名</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={fieldStyle} placeholder="請輸入姓名" />
              </label>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>電話</span>
                <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} style={fieldStyle} placeholder="請輸入電話" />
              </label>
            </div>
          </div>

          <div className="admin-card" style={{ ...panelStyle, display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>日期</div>
                <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>先選日期，再選時間</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Pill>{T.available}</Pill>
                <Pill tone="warning">{T.full}</Pill>
                <Pill tone="muted">{T.unavailable}</Pill>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>{getMonthLabel(monthKey)}</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-small btn-interactive" onClick={() => setMonthKey((current) => addMonths(current, -1))} disabled={loadingSummary}>
                  上月
                </button>
                <button type="button" className="btn btn-small btn-interactive" onClick={() => setMonthKey((current) => addMonths(current, 1))} disabled={loadingSummary}>
                  下月
                </button>
              </div>
            </div>

            {loadingSummary ? <div style={{ color: '#6B7280' }}>{T.loadingDates}</div> : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
              {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
                <div key={day} style={{ fontSize: '12px', color: '#6B7280', fontWeight: 800 }}>
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
                    }}
                    disabled={status === 'off'}
                    style={{
                      ...panelStyle,
                      minHeight: '92px',
                      padding: '12px',
                      opacity: cell.inMonth ? 1 : 0.4,
                      textAlign: 'left',
                      borderColor: isSelected ? '#A68B6A' : status === 'available' || status === 'full' ? '#CBB39A' : '#E5E7EB',
                      background: isSelected ? '#FFF8EE' : status === 'off' ? '#F8FAFC' : '#fff',
                      color: status === 'off' ? '#9CA3AF' : '#111827',
                      cursor: status === 'off' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '18px' }}>{cell.dayLabel}</div>
                    {cell.inMonth ? (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: status === 'off' ? '#9CA3AF' : '#6B7280', fontWeight: 700 }}>
                        {getCalendarStatusLabel(summary)}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="admin-card" style={{ ...panelStyle, display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>時段</div>
                <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>可預約時段</div>
              </div>
              <div style={{ color: '#6B7280', fontSize: '13px' }}>{selectedDate || T.chooseDateFirst}</div>
            </div>

            {selectedDate && selectedSummary?.status === 'full' ? <div style={{ color: '#8B5E34' }}>{getFullReasonLabel(selectedSummary)}</div> : null}
            {selectedDate && selectedSummary?.status === 'off' ? <div style={{ color: '#6B7280' }}>{T.offNote}</div> : null}

            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>時段下拉選單</span>
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

            {selectedDate && !loadingSlots && slots.length === 0 && selectedSummary?.status === 'available' ? <div style={{ color: '#6B7280' }}>{T.noAvailability}</div> : null}
            <button type="button" className="btn btn-interactive" onClick={handleSubmit} disabled={!selectedDate || !selectedTime} style={{ minHeight: '48px' }}>
              {T.submit}
            </button>
          </div>
        </div>

        <div className="admin-card" style={{ ...panelStyle, padding: '18px', alignSelf: 'start' }}>
          <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>預約摘要</div>
          <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>服務</div>
              <div style={{ fontWeight: 900 }}>{selectedService?.name || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>日期</div>
              <div style={{ fontWeight: 900 }}>{selectedDate || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>時間</div>
              <div style={{ fontWeight: 900 }}>{selectedTime || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>應付金額</div>
              <div style={{ fontWeight: 900 }}>${Number(selectedService?.price || 0).toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {error ? <div style={{ maxWidth: '1120px', margin: '16px auto 0', color: '#991B1B' }}>{error}</div> : null}
    </div>
  )
}

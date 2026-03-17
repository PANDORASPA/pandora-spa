'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast';
import { getBrowserClient } from '../../lib/supabase/browser'

export default function Booking() {
  const router = useRouter()
  const [services, setServices] = useState([])
  const [allServices, setAllServices] = useState([]) // All services for display
  const [categories, setCategories] = useState(['全部'])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [coupons, setCoupons] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [formData, setFormData] = useState({ name: '', phone: '', coupon: '' })
  const [bookingRef, setBookingRef] = useState('')
  const [staffList, setStaffList] = useState([])
  const [bookings, setBookings] = useState([])
  const [occupiedSlots, setOccupiedSlots] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [loading, setLoading] = useState(true)
  const [shopSettings, setShopSettings] = useState({})
  const [waUrl, setWaUrl] = useState('')
  const [staffShifts, setStaffShifts] = useState([])
  const [reviews, setReviews] = useState([])
  const [authUser, setAuthUser] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Fetch services, coupons, staff, bookings and shifts from Supabase
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      let supabase
      try {
        supabase = getBrowserClient()
      } catch (e) {
        toast.error(e?.message || 'Supabase 設定錯誤')
        setLoading(false)
        return
      }
      const [servicesData, couponsData, staffData, bookingsData, settingsData, shiftsData, reviewsData] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('coupons').select('*').eq('enabled', true),
        supabase.from('staff').select('*').eq('enabled', true).order('name'),
        supabase.from('bookings').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('staff_shifts').select('*'),
        supabase.from('reviews').select('*')
      ])
      
      if (reviewsData.data) setReviews(reviewsData.data)
      
      const { data: auth } = await supabase.auth.getUser()
      setAuthUser(auth?.user || null)
      if (auth?.user) {
        setFormData(prev => ({ ...prev, name: prev.name, phone: prev.phone }))
      }
      
      if (settingsData.data) {
        const settingsMap = settingsData.data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        setShopSettings(settingsMap);
      }
      if (servicesData.data) {
        // Store all services
        const allSvcs = servicesData.data.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          time: s.time ? `${s.time}分` : '60分',
          timeMins: s.time || 60,
          emoji: s.emoji || getServiceEmoji(s.name),
          category: s.category || '其他',
          description: s.description || '',
          serviceIds: [s.id] // For matching with staff services
        }))
        setAllServices(allSvcs)
        setServices(allSvcs) // Initially show all services
        
        const uniqueCategories = ['全部', ...new Set(allSvcs.map(s => s.category).filter(Boolean))]
        setCategories(uniqueCategories)
      }
      
      if (couponsData.data) {
        const mappedCoupons = couponsData.data.map(c => ({
          id: c.id,
          code: c.code,
          name: c.name,
          discount: c.discount,
          type: c.type,
          desc: c.type === 'percent' ? `${c.discount}折` : `減$${c.discount}`
        }))
        setCoupons(mappedCoupons)
      }
      
      if (staffData.data) setStaffList(staffData.data)
      if (bookingsData.data) setBookings(bookingsData.data)
      if (shiftsData.data) setStaffShifts(shiftsData.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  // Refetch bookings when date changes
  useEffect(() => {
    async function refetchBookings() {
      let supabase
      try {
        supabase = getBrowserClient()
      } catch (e) {
        return
      }

      const { data } = await supabase.from('bookings').select('*')
      if (data) setBookings(data)
    }
    if (selectedDate) {
      refetchBookings()
    }
  }, [selectedDate])

  // Fetch occupied time slots when date is selected
  useEffect(() => {
    async function fetchOccupiedSlots() {
      if (!selectedDate) {
        setOccupiedSlots([])
        return
      }
      let supabase
      try {
        supabase = getBrowserClient()
      } catch (e) {
        setOccupiedSlots([])
        return
      }
      const dateStr = `${selectedDate}/${currentMonth + 1}/${currentYear}`
      const { data } = await supabase
        .from('bookings')
        .select('time, staff_id')
        .eq('date', dateStr)
        .in('status', ['pending', 'confirmed'])
      
      if (data) {
        setOccupiedSlots(data)
      }
    }
    fetchOccupiedSlots()
  }, [selectedDate, currentMonth, currentYear])

  // When staff or category is selected, filter services
  useEffect(() => {
    let filtered = allServices;

    // Filter by staff
    if (selectedStaff && selectedStaff !== 'random') {
      const staff = staffList.find(s => s.id.toString() === selectedStaff)
      if (staff && staff.services && staff.services.length > 0) {
        const allowedServiceIds = staff.services
        filtered = filtered.filter(s => 
          allowedServiceIds.includes(s.id) || allowedServiceIds.includes(s.serviceIds?.[0])
        )
      }
    }

    // Filter by category
    if (activeCategory !== '全部') {
      filtered = filtered.filter(s => s.category === activeCategory)
    }

    setServices(filtered)
    
    // Reset selected service if it's no longer in the filtered list
    if (selectedService && !filtered.find(s => s.id === selectedService.id)) {
      setSelectedService(null)
    }
  }, [selectedStaff, staffList, activeCategory, allServices])

  const getServiceEmoji = (name) => {
    if (name.includes('剪')) return '✂️'
    if (name.includes('染')) return '🎨'
    if (name.includes('燙')) return '💇'
    if (name.includes('護')) return '💆'
    if (name.includes('头皮')) return '🧴'
    return '✂️'
  }

  // Format date key for schedule lookup
  const formatDateKey = (day, year, month) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const normalizeTime = (t) => {
    if (!t) return ''
    const s = String(t)
    return s.length >= 5 ? s.substring(0, 5) : s
  }

  const normalizeDateKey = (d) => {
    if (!d) return ''
    return String(d).substring(0, 10)
  }

  const parseDaysOff = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') {
      const s = value.trim()
      if (!s) return []
      try {
        if (s.startsWith('[')) {
          const arr = JSON.parse(s)
          return Array.isArray(arr) ? arr.map(v => String(v).trim()).filter(Boolean) : [String(arr).trim()].filter(Boolean)
        }
      } catch (e) {}
      return s.split(',').map(v => v.trim()).filter(Boolean)
    }
    return [String(value).trim()].filter(Boolean)
  }

  const getBusinessHoursRange = () => {
    try {
      const hoursStr = shopSettings.business_hours || '11:00 - 20:00'
      const parts = hoursStr.split('-').map(s => s.trim())
      if (parts.length !== 2) return { start: '11:00', end: '20:00' }
      return { start: normalizeTime(parts[0]), end: normalizeTime(parts[1]) }
    } catch (e) {
      return { start: '11:00', end: '20:00' }
    }
  }

  // Check if a specific time slot is occupied
  const isSlotOccupied = (staffId, date, time) => {
    const dateStr = `${date}/${currentMonth + 1}/${currentYear}`
    return bookings.some(b => 
      b.staff_id === staffId && 
      b.date === dateStr && 
      b.time === time &&
      (b.status === 'pending' || b.status === 'confirmed')
    )
  }

  // Check if staff is working on selected date, considering service duration and breaks
  const isStaffWorking = (staff, date, time, serviceDuration) => {
    if (!staff) return false
    
    // 1. Check specific shift override
    const dateStrISO = formatDateKey(date, currentYear, currentMonth)
    const shift = staffShifts.find(s => s.staff_id === staff.id && normalizeDateKey(s.date) === dateStrISO)

    if (shift) {
      isOff = shift.is_off
      workingStart = shift.start_time
      workingEnd = shift.end_time
    } else {
      // 2. Fallback to weekly schedule
      const dateObj = new Date(currentYear, currentMonth, date)
      const dayOfWeek = dateObj.getDay().toString()
      const dayName = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]
      
      // Check shop global days off
      const shopDaysOff = parseDaysOff(shopSettings.days_off)
      if (shopDaysOff.length > 0 && (shopDaysOff.includes(dayName) || shopDaysOff.includes(dayOfWeek))) {
        return false
      }

      const staffDaysOff = parseDaysOff(staff.daysOff)
      isOff = staffDaysOff.includes(dayOfWeek)
      workingStart = staff.schedule?.[dayOfWeek]?.start
      workingEnd = staff.schedule?.[dayOfWeek]?.end
    }

    workingStart = normalizeTime(workingStart)
    workingEnd = normalizeTime(workingEnd)
    const bh = getBusinessHoursRange()
    if (workingStart && !workingEnd) workingEnd = bh.end
    if (!workingStart && workingEnd) workingStart = bh.start

    if (isOff || !workingStart || !workingEnd) return false
    
    if (time) {
      const startTime = new Date(`1970-01-01T${time}:00`)
      const endTime = new Date(startTime.getTime() + (serviceDuration || 60) * 60000)
      const wStart = new Date(`1970-01-01T${workingStart}:00`)
      const wEnd = new Date(`1970-01-01T${workingEnd}:00`)

      // Check working hours
      if (startTime < wStart || endTime > wEnd) return false

      // Check break time (break_start to break_end) - currently defaults apply even to shifts unless break is removed
      if (staff.break_start && staff.break_end) {
        const bs = normalizeTime(staff.break_start)
        const be = normalizeTime(staff.break_end)
        const breakStart = new Date(`1970-01-01T${bs}:00`)
        const breakEnd = new Date(`1970-01-01T${be}:00`)
        if (startTime < breakEnd && endTime > breakStart) return false
      }

      // Check for booking conflicts throughout the service duration
      let currentTime = new Date(startTime.getTime())
      while (currentTime < endTime) {
        const timeStr = currentTime.toTimeString().substring(0, 5)
        if (isSlotOccupied(staff.id, date, timeStr)) {
          return false
        }
        currentTime.setMinutes(currentTime.getMinutes() + 30)
      }
    }
    
    return true
  }

  const availableStaff = staffList.filter(s => isStaffWorking(s, selectedDate, selectedTime, selectedService?.timeMins))

  // Dynamically generate time slots based on business hours
  const getTimeSlots = () => {
    try {
      const bh = getBusinessHoursRange()
      let rangeStart = bh.start
      let rangeEnd = bh.end
      const duration = selectedService?.timeMins || 60

      if (selectedStaff && selectedStaff !== 'random' && selectedDate) {
        const staff = staffList.find(s => s.id?.toString() === selectedStaff?.toString())
        if (staff) {
          const dateStrISO = formatDateKey(selectedDate, currentYear, currentMonth)
          const dateObj = new Date(currentYear, currentMonth, selectedDate)
          const dayOfWeek = dateObj.getDay().toString()
          const dayName = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]

          const shopDaysOff = parseDaysOff(shopSettings.days_off)
          if (shopDaysOff.length > 0 && (shopDaysOff.includes(dayName) || shopDaysOff.includes(dayOfWeek))) {
            return []
          }

          const shift = staffShifts.find(s => s.staff_id === staff.id && normalizeDateKey(s.date) === dateStrISO)
          let workingStart, workingEnd, isOff

          if (shift) {
            isOff = shift.is_off
            workingStart = shift.start_time
            workingEnd = shift.end_time
          } else {
            const staffDaysOff = parseDaysOff(staff.daysOff)
            isOff = staffDaysOff.includes(dayOfWeek)
            workingStart = staff.schedule?.[dayOfWeek]?.start
            workingEnd = staff.schedule?.[dayOfWeek]?.end
          }

          workingStart = normalizeTime(workingStart)
          workingEnd = normalizeTime(workingEnd)

          if (isOff) return []

          if (workingStart) rangeStart = workingStart
          if (workingEnd) rangeEnd = workingEnd

          if (rangeStart && !rangeEnd) rangeEnd = bh.end
          if (!rangeStart && rangeEnd) rangeStart = bh.start
        }
      }

      if (!rangeStart || !rangeEnd) return []

      const startTime = new Date(`1970-01-01T${rangeStart}:00`)
      const endTime = new Date(`1970-01-01T${rangeEnd}:00`)
      const lastStart = new Date(endTime.getTime() - duration * 60000)

      const bs = selectedStaff && selectedStaff !== 'random'
        ? normalizeTime(staffList.find(s => s.id?.toString() === selectedStaff?.toString())?.break_start)
        : ''
      const be = selectedStaff && selectedStaff !== 'random'
        ? normalizeTime(staffList.find(s => s.id?.toString() === selectedStaff?.toString())?.break_end)
        : ''
      const breakStart = bs ? new Date(`1970-01-01T${bs}:00`) : null
      const breakEnd = be ? new Date(`1970-01-01T${be}:00`) : null

      const slots = []
      let current = new Date(startTime.getTime())
      let count = 0
      while (current <= lastStart && count < 100) {
        const slotEnd = new Date(current.getTime() + duration * 60000)
        if (breakStart && breakEnd) {
          if (!(current < breakEnd && slotEnd > breakStart)) {
            slots.push(current.toTimeString().substring(0, 5))
          }
        } else {
          slots.push(current.toTimeString().substring(0, 5))
        }
        current.setMinutes(current.getMinutes() + 30)
        count++
      }
      return slots
    } catch (e) {
      return ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
    }
  }

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedService || !selectedDate) {
        setAvailableSlots([])
        return
      }
      const dateISO = formatDateKey(selectedDate, currentYear, currentMonth)
      const staffId = selectedStaff && selectedStaff !== 'random' ? selectedStaff : ''
      setSlotsLoading(true)
      try {
        const res = await fetch(`/api/availability?date=${encodeURIComponent(dateISO)}&serviceId=${encodeURIComponent(selectedService.id)}${staffId ? `&staffId=${encodeURIComponent(staffId)}` : ''}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setAvailableSlots([])
          return
        }
        setAvailableSlots(Array.isArray(json.slots) ? json.slots : [])
      } catch (e) {
        setAvailableSlots([])
      } finally {
        setSlotsLoading(false)
      }
    }
    loadSlots()
  }, [selectedService, selectedDate, selectedStaff, currentYear, currentMonth])

  const timeSlots = availableSlots.length > 0 ? availableSlots : (slotsLoading ? [] : getTimeSlots())

  // Get booking count for each day of the month
  const getDayBookingCount = (day) => {
    const dateStr = `${day}/${currentMonth + 1}/${currentYear}`
    return bookings.filter(b => b.date === dateStr && (b.status === 'pending' || b.status === 'confirmed')).length
  }

  const renderCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const today = new Date()
    const maxBookingsPerDay = 5 // Assume max 5 bookings per day for color coding
    
    let days = []
    for (let i = 0; i < firstDay; i++) days.push(<div key={'empty-' + i}></div>)
    
    for (let d = 1; d <= daysInMonth; d++) {
      const isPast = currentYear < today.getFullYear() || 
        (currentYear === today.getFullYear() && currentMonth < today.getMonth()) ||
        (currentYear === today.getFullYear() && currentMonth === today.getMonth() && d < today.getDate())
      const isSelected = selectedDate === d
      const bookingCount = getDayBookingCount(d)
      const occupancyRate = bookingCount / maxBookingsPerDay
      
      // Color coding: Green = available, Yellow = half full, Red = full
      let bgColor = 'transparent'
      if (!isPast && !isSelected) {
        if (occupancyRate >= 1) bgColor = '#fee2e2' // Red - full
        else if (occupancyRate >= 0.5) bgColor = '#fef3c7' // Yellow - half full
        else bgColor = '#dcfce7' // Green - available
      }
      
      days.push(
        <div
          key={d}
          onClick={() => !isPast && setSelectedDate(d)}
          className={`btn-interactive ${isSelected ? 'active' : ''}`}
          style={{
            cursor: isPast ? 'not-allowed' : 'pointer',
            opacity: isPast ? 0.3 : 1,
            background: isSelected ? 'var(--primary)' : bgColor,
            color: isSelected ? '#fff' : isPast ? '#999' : (occupancyRate >= 1 ? '#dc2626' : 'var(--text)'),
            padding: '12px 8px',
            textAlign: 'center',
            borderRadius: '12px',
            border: bookingCount > 0 && !isPast && !isSelected ? '1px solid var(--gray)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: '15px' }}>{d}</div>
          {!isPast && bookingCount > 0 && (
            <div style={{ 
              fontSize: '10px', 
              marginTop: '4px',
              padding: '2px 6px',
              borderRadius: '10px',
              background: isSelected ? 'rgba(255,255,255,0.2)' : (occupancyRate >= 1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)'),
              color: isSelected ? '#fff' : (occupancyRate >= 1 ? '#dc2626' : 'var(--text-light)') 
            }}>
              {bookingCount}
            </div>
          )}
        </div>
      )
    }
    return days
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !formData.name || !formData.phone) {
      toast.error('請填寫所有必填項目')
      return
    }

    const dateISO = formatDateKey(selectedDate, currentYear, currentMonth)
    const returnParams = new URLSearchParams()
    returnParams.set('serviceId', String(selectedService.id))
    if (selectedStaff) returnParams.set('staffId', String(selectedStaff))
    returnParams.set('date', dateISO)
    returnParams.set('time', String(selectedTime))
    const returnTo = `/booking?${returnParams.toString()}`

    if (!authUser) {
      toast.error('請先登入會員後再預約')
      router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
      return
    }

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: dateISO,
          serviceId: selectedService.id,
          staffId: selectedStaff === 'random' || !selectedStaff ? null : Number(selectedStaff),
          startTime: selectedTime,
          customerName: formData.name,
          customerPhone: formData.phone,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (res.status === 401) {
        toast.error('請先登入會員後再預約')
        router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
        return
      }
      if (!res.ok) {
        toast.error(json?.error || '預約失敗')
        return
      }

      const booking = json?.booking
      if (booking) setBookings([...bookings, booking])

      const ref = booking?.ref || ''
      const shopPhone = shopSettings.phone || '85212345678'
      const waMsg = `您好，我想確認預約：\n編號：${ref}\n服務：${selectedService.name}\n日期：${selectedDate}/${currentMonth + 1}/${currentYear}\n時間：${selectedTime}\n姓名：${formData.name}`
      const wa = `https://wa.me/${shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`
      setWaUrl(wa)

      toast.success('預約已提交，已為你封鎖時段')
      setBookingRef(ref)
      setShowModal(true)
    } catch (e) {
      toast.error('預約失敗: ' + (e?.message || '未知錯誤'))
    }
  }

  const finalPrice = selectedService ? 
    (formData.coupon ? 
      (() => {
        const coupon = coupons.find(c => c.code === formData.coupon);
        if (!coupon) return selectedService.price;
        if (coupon.type === 'fixed') {
          return Math.max(0, selectedService.price - (coupon.discount || 0));
        } else {
          return selectedService.price * (1 - (coupon.discount || 0) / 100);
        }
      })()
      : selectedService.price) 
    : 0

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>載入中...</p>
      </div>
    )
  }

  // Calculate staff ratings
  const getStaffRating = (staffId) => {
    const staffBookings = bookings.filter(b => b.staff_id?.toString() === staffId.toString());
    const staffBookingIds = staffBookings.map(b => b.id);
    const staffReviews = reviews.filter(r => staffBookingIds.includes(r.booking_id));
    
    if (staffReviews.length === 0) return null;
    
    const avg = staffReviews.reduce((sum, r) => sum + r.rating, 0) / staffReviews.length;
    return {
      average: avg.toFixed(1),
      count: staffReviews.length
    };
  };

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>預約<span style={{ color: '#A68B6A' }}>服務</span></h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: selectedStaff ? 'var(--primary)' : '#e5e7eb', color: selectedStaff ? '#fff' : '#999', fontSize: '12px', minWidth: '80px', textAlign: 'center' }}>
              1. 選擇髮型師
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: selectedService ? 'var(--primary)' : '#e5e7eb', color: selectedService ? '#fff' : '#999', fontSize: '12px', minWidth: '80px', textAlign: 'center' }}>
              2. 選擇服務
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: selectedDate && selectedTime ? 'var(--primary)' : '#e5e7eb', color: selectedDate && selectedTime ? '#fff' : '#999', fontSize: '12px', minWidth: '80px', textAlign: 'center' }}>
              3. 預約時段
            </div>
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: formData.name && formData.phone ? 'var(--primary)' : '#e5e7eb', color: formData.name && formData.phone ? '#fff' : '#999', fontSize: '12px', minWidth: '80px', textAlign: 'center' }}>
              4. 填寫資料
            </div>
          </div>

          {/* Step 1: Staff Selection (Presented like products) */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 700, textAlign: 'center' }}>
              1. 選擇專屬髮型師
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Random/Any Staff option */}
              <div
                onClick={() => setSelectedStaff('random')}
                className="btn-interactive admin-card"
                style={{
                  padding: '24px',
                  background: selectedStaff === 'random' ? 'rgba(166, 139, 106, 0.05)' : '#fff',
                  border: '2px solid ' + (selectedStaff === 'random' ? 'var(--primary)' : 'transparent'),
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px' }}>🎲</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>隨機安排</div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '12px' }}>由系統為您分配當天最有空的髮型師</div>
                <div style={{ 
                  padding: '6px 16px', 
                  borderRadius: '20px', 
                  background: selectedStaff === 'random' ? 'var(--primary)' : 'var(--bg)', 
                  color: selectedStaff === 'random' ? '#fff' : 'var(--text-light)',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {selectedStaff === 'random' ? '已選擇' : '選擇此項'}
                </div>
              </div>

              {staffList.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStaff(s.id.toString())}
                  className="btn-interactive admin-card"
                  style={{
                    padding: '24px',
                    background: selectedStaff === s.id.toString() ? 'rgba(166, 139, 106, 0.05)' : '#fff',
                    border: '2px solid ' + (selectedStaff === s.id.toString() ? 'var(--primary)' : 'transparent'),
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: s.photo_url ? `url(${s.photo_url}) center/cover` : 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#fff', 
                    fontSize: '32px', 
                    fontWeight: 700, 
                    overflow: 'hidden',
                    marginBottom: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {!s.photo_url && (s.name?.charAt(0) || '?')}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{s.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700, marginBottom: '8px' }}>{s.role || '髮型師'}</div>
                  
                  {/* Rating Display */}
                  {(() => {
                    const rating = getStaffRating(s.id);
                    if (rating) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#F59E0B' }}>★</span>
                          <span style={{ fontWeight: 700 }}>{rating.average}</span>
                          <span style={{ color: 'var(--text-light)' }}>({rating.count})</span>
                        </div>
                      );
                    }
                    return <div style={{ height: '20px', marginBottom: '8px' }}></div>; // Spacer
                  })()}

                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-light)', 
                    marginBottom: '16px', 
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: '36px'
                  }}>
                    {s.bio || '專業剪髮、染髮及造型設計，為您打造專屬個人風格。'}
                  </div>
                  <div style={{ 
                    padding: '6px 20px', 
                    borderRadius: '20px', 
                    background: selectedStaff === s.id.toString() ? 'var(--primary)' : 'var(--bg)', 
                    color: selectedStaff === s.id.toString() ? '#fff' : 'var(--text-light)',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {selectedStaff === s.id.toString() ? '已選擇 ✓' : '查看時間'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Service Selection (Filtered by staff) */}
          {selectedStaff && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '17px', fontWeight: 700, textAlign: 'center' }}>
                2. 選擇服務項目
              </h3>
              
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', scrollbarWidth: 'none' }} className="hide-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="btn-interactive"
                    style={{
                      padding: '8px 18px',
                      background: activeCategory === cat ? 'var(--primary)' : 'var(--bg)',
                      color: activeCategory === cat ? '#fff' : 'var(--text-light)',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {services.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>💇‍♂️</div>
                  <p>該髮型師暫無提供此分類的服務</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {services.map(service => (
                    <div 
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className="btn-interactive"
                      style={{ 
                        padding: '20px', 
                        border: '2px solid ' + (selectedService?.id === service.id ? 'var(--primary)' : 'var(--gray)'),
                        borderRadius: '16px',
                        cursor: 'pointer',
                        background: selectedService?.id === service.id ? 'rgba(166, 139, 106, 0.03)' : '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '32px' }}>{service.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)' }}>{service.name}</div>
                            <div style={{ color: 'var(--text-light)', fontSize: '13px', marginTop: '2px' }}>⏱️ {service.time}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>${service.price}</div>
                          {selectedService?.id === service.id && <div style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>已選取</div>}
                        </div>
                      </div>
                      {service.description && selectedService?.id === service.id && (
                        <div style={{ fontSize: '13px', color: 'var(--text-light)', borderTop: '1px solid var(--gray)', paddingTop: '12px', marginTop: '12px', lineHeight: 1.5 }}>
                          {service.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Calendar & Time (Specific to staff & service) */}
          {selectedService && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '17px', fontWeight: 700, textAlign: 'center' }}>
                3. 選擇預約日期與時段
              </h3>
              
              <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button onClick={() => { setCurrentMonth(m => m === 0 ? 11 : m - 1); if (currentMonth === 0) setCurrentYear(y => y - 1) }} className="btn-interactive" style={{ padding: '10px 16px', background: '#fff', border: '1px solid var(--gray)', borderRadius: '10px' }}>◀</button>
                  <div style={{ fontSize: '17px', fontWeight: 800 }}>{currentYear}年 {currentMonth + 1}月</div>
                  <button onClick={() => { setCurrentMonth(m => m === 11 ? 0 : m + 1); if (currentMonth === 11) setCurrentYear(y => y + 1) }} className="btn-interactive" style={{ padding: '10px 16px', background: '#fff', border: '1px solid var(--gray)', borderRadius: '10px' }}>▶</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-light)', paddingBottom: '12px', fontSize: '13px' }}>{d}</div>
                  ))}
                  {renderCalendar()}
                </div>
              </div>

              {selectedDate && (
                <div className="admin-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                    {timeSlots.map(time => {
                      let isOccupied = false;
                      if (availableSlots.length > 0) {
                        isOccupied = false
                      } else
                      if (selectedStaff === 'random') {
                        isOccupied = !staffList.some(s => {
                          const canProvide = !s.services || s.services.length === 0 || s.services.includes(selectedService.id);
                          return canProvide && isStaffWorking(s, selectedDate, time, selectedService.timeMins);
                        });
                      } else {
                        const staff = staffList.find(s => s.id.toString() === selectedStaff);
                        isOccupied = !isStaffWorking(staff, selectedDate, time, selectedService.timeMins);
                      }

                      return (
                        <div
                          key={time}
                          onClick={() => !isOccupied && setSelectedTime(time)}
                          className={!isOccupied ? "btn-interactive" : ""}
                          style={{
                            padding: '14px 10px',
                            background: selectedTime === time ? 'var(--primary)' : isOccupied ? 'var(--bg)' : '#fff',
                            color: selectedTime === time ? '#fff' : isOccupied ? '#d1d5db' : 'var(--text)',
                            border: '1px solid ' + (selectedTime === time ? 'var(--primary)' : isOccupied ? 'transparent' : 'var(--gray)'),
                            borderRadius: '12px',
                            cursor: isOccupied ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                            fontSize: '15px',
                            fontWeight: 700,
                            opacity: isOccupied ? 0.6 : 1
                          }}
                        >
                          {time}
                        </div>
                      )
                    })}
                  </div>
                  {slotsLoading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>載入可預約時段中...</p>
                  ) : (
                    timeSlots.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>該日期暫無可用時段</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: User Info */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', marginTop: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>4. 填寫資料</h3>
            
            {/* Member Login Section */}
            {!authUser ? (
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px dashed #d1d5db' }}>
                <div style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--primary)' }}>請先登入會員後再預約</div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>未登入狀態下可以瀏覽時段，但不可提交預約。</div>
                <Link
                  href={`/login?redirectTo=${encodeURIComponent('/booking')}`}
                  className="btn-interactive"
                  style={{ display: 'inline-block', padding: '10px 16px', background: 'var(--primary)', color: '#fff', borderRadius: '10px', fontWeight: 700 }}
                >
                  前往登入 / 註冊
                </Link>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontWeight: 800, color: '#166534', marginBottom: '4px' }}>已登入：{authUser.email}</div>
                <div style={{ fontSize: '12px', color: '#15803d' }}>你的預約會自動綁定會員帳戶</div>
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>姓名 *</label>
              <input type="text" placeholder="請輸入您的姓名" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>電話 *</label>
              <input type="tel" placeholder="請輸入您的電話號碼" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>優惠碼</label>
              <select 
                value={formData.coupon} 
                onChange={e => setFormData({...formData, coupon: e.target.value})} 
                style={{ width: '100%', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">請選擇優惠碼 (如有)</option>
                {coupons.map(c => (
                  <option key={c.code} value={c.code}>{c.name} - {c.desc}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleSubmit} 
              className="btn-interactive"
              disabled={!authUser}
              style={{ 
                width: '100%', 
                padding: '16px', 
                background: 'linear-gradient(135deg, #A68B6A, #8B7355)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '10px', 
                fontWeight: 700, 
                fontSize: '16px', 
                cursor: !authUser ? 'not-allowed' : 'pointer', 
                minHeight: '56px',
                boxShadow: '0 4px 15px rgba(166, 139, 106, 0.3)'
              }}
            >
              {`提交預約 ${finalPrice > 0 ? "$" + Math.round(finalPrice) : ""}`}
            </button>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#A68B6A', marginBottom: '10px' }}>預約成功！</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>預約編號：<strong>{bookingRef}</strong></p>
            <div style={{ background: '#FAF8F5', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'left' }}>
              <p><strong>服務：</strong>{selectedService?.name}</p>
              <p><strong>日期：</strong>{selectedDate}/{currentMonth + 1}/{currentYear}</p>
              <p><strong>時間：</strong>{selectedTime}</p>
              <p><strong>金額：</strong>${Math.round(finalPrice)}</p>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              我們會盡快確認您的預約，您也可以點擊下方按鈕透過 WhatsApp 與我們聯繫。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 30px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', fontSize: '15px' }}>
                🟢 WhatsApp 快速確認
              </a>
              <Link href="/" style={{ display: 'block', padding: '12px 30px', background: '#f3f4f6', color: '#666', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                返回首頁
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

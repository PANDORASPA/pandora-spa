'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase'

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
  const [staffLocked, setStaffLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shopSettings, setShopSettings] = useState({})
  const [waUrl, setWaUrl] = useState('')
  const [staffShifts, setStaffShifts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [userTickets, setUserTickets] = useState([])
  const [selectedUserTicket, setSelectedUserTicket] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [authForm, setAuthForm] = useState({ phone: '', password: '', name: '', email: '' })
  const [reviews, setReviews] = useState([])
  const [authUser, setAuthUser] = useState(null)
  const [editId, setEditId] = useState(null)
  const [originalBooking, setOriginalBooking] = useState(null)

  // Fetch services, coupons, staff, bookings and shifts from Supabase
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
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
      
      // Check for logged in user
      const savedUser = localStorage.getItem('viva_user')
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          setCurrentUser(user)
          setFormData(prev => ({ ...prev, name: user.name, phone: user.phone }))
          fetchUserTickets(user.id)
        } catch (e) {}
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

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      setAuthUser(data?.user || null)
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
    })

    return () => {
      sub?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const staffId = params.get('staffId')
      if (staffId) {
        setSelectedStaff(staffId)
        setStaffLocked(true)
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const staffId = params.get('staffId')
      if (staffId) setSelectedStaff(staffId)

      const eId = params.get('editId')
      if (eId) {
        setEditId(eId)
        supabase.from('bookings').select('*').eq('id', eId).single().then(({ data }) => {
          if (data) {
            setOriginalBooking(data)
            if (data.staff_id) {
              setSelectedStaff(data.staff_id.toString())
            }
          }
        })
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (allServices.length > 0 && originalBooking && !selectedService) {
      const svc = allServices.find(s => String(s.id) === String(originalBooking.service_id) || s.name === originalBooking.service)
      if (svc) setSelectedService(svc)
    }
  }, [allServices, originalBooking])

  const fetchUserTickets = async (userId) => {
    const { data } = await supabase
      .from('user_tickets')
      .select('*, tickets(service_id)')
      .eq('customer_id', userId)
      .gt('remaining_count', 0)
    
    if (data) setUserTickets(data)
  }

  // Refetch bookings when date changes
  useEffect(() => {
    async function refetchBookings() {
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

  const getSlotStepMin = () => {
    const v = shopSettings.slot_step_min
    const n = typeof v === 'number' ? v : Number(String(v || ''))
    return Number.isFinite(n) && n > 0 ? n : 30
  }

  const parseTimeToMinutes = (t) => {
    const s = normalizeTime(t)
    if (!s) return null
    const parts = s.split(':').map(Number)
    if (parts.length < 2) return null
    const hh = parts[0]
    const mm = parts[1]
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
    return hh * 60 + mm
  }

  const minutesToTime = (mins) => {
    if (!Number.isFinite(mins)) return ''
    const m = Math.max(0, Math.floor(mins))
    const hh = Math.floor(m / 60)
    const mm = m % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const getServiceDurationMinByBooking = (b) => {
    const n = Number(b?.duration_min)
    if (Number.isFinite(n) && n > 0) return n
    const serviceId = b?.service_id
    if (serviceId != null) {
      const svc = allServices.find(s => String(s.id) === String(serviceId))
      if (svc?.timeMins) return svc.timeMins
    }
    const svc2 = allServices.find(s => String(s.name || '') === String(b?.service || ''))
    if (svc2?.timeMins) return svc2.timeMins
    return 60
  }

  const getServiceBufferMinByBooking = (b) => {
    const n = Number(b?.buffer_min)
    if (Number.isFinite(n) && n >= 0) return n
    const serviceId = b?.service_id
    if (serviceId != null) {
      const svc = allServices.find(s => String(s.id) === String(serviceId))
      const buf = Number(svc?.buffer_min)
      if (Number.isFinite(buf) && buf >= 0) return buf
    }
    const svc2 = allServices.find(s => String(s.name || '') === String(b?.service || ''))
    const buf2 = Number(svc2?.buffer_min)
    if (Number.isFinite(buf2) && buf2 >= 0) return buf2
    return 0
  }

  // Check if a specific time slot is occupied
  const isSlotOccupied = (staffId, date, time) => {
    const dateStr = `${date}/${currentMonth + 1}/${currentYear}`
    const dateISO = formatDateKey(date, currentYear, currentMonth)
    const tMin = parseTimeToMinutes(time)
    if (tMin == null) return false

    return bookings.some(b => {
      if (editId && String(b.id) === String(editId)) return false // Ignore current booking when editing
      if (String(b.staff_id) !== String(staffId)) return false
      const onDate = String(b.date || '') === String(dateStr) || normalizeDateKey(b.appointment_date) === dateISO
      if (!onDate) return false
      if (!(b.status === 'pending' || b.status === 'confirmed')) return false

      const startRaw = b.start_time || b.time
      const startMin = parseTimeToMinutes(startRaw)
      if (startMin == null) return false

      const endRaw = b.buffer_end_time || b.end_time
      const endMinDirect = parseTimeToMinutes(endRaw)
      const durationMin = getServiceDurationMinByBooking(b)
      const bufferMin = getServiceBufferMinByBooking(b)
      const endMin = endMinDirect != null ? endMinDirect : (startMin + durationMin + bufferMin)

      return tMin >= startMin && tMin < endMin
    })
  }

  // Check if staff is working on selected date, considering service duration and breaks
  const isStaffWorking = (staff, date, time, serviceDuration) => {
    if (!staff) return false
    
    // 1. Check specific shift override
    const dateStrISO = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    const shift = staffShifts.find(s => s.staff_id === staff.id && normalizeDateKey(s.date) === dateStrISO)
    
    let workingStart, workingEnd, isOff;

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
      const stepMin = getSlotStepMin()
      while (currentTime < endTime) {
        const timeStr = currentTime.toTimeString().substring(0, 5)
        if (isSlotOccupied(staff.id, date, timeStr)) {
          return false
        }
        currentTime.setMinutes(currentTime.getMinutes() + stepMin)
      }
    }
    
    return true
  }

  const serviceBufferMin = Number(selectedService?.buffer_min)
  const effectiveServiceMin = (selectedService?.timeMins || 60) + (Number.isFinite(serviceBufferMin) && serviceBufferMin > 0 ? serviceBufferMin : 0)
  const availableStaff = staffList.filter(s => isStaffWorking(s, selectedDate, selectedTime, effectiveServiceMin))

  // Dynamically generate time slots based on business hours
  const getTimeSlots = () => {
    try {
      const bh = getBusinessHoursRange()
      let rangeStart = bh.start
      let rangeEnd = bh.end
      const bufferMin = Number(selectedService?.buffer_min)
      const duration = (selectedService?.timeMins || 60) + (Number.isFinite(bufferMin) && bufferMin > 0 ? bufferMin : 0)

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

      const slots = []
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
      
      // Safety break for infinite loops
      let count = 0
      let current = new Date(startTime.getTime())
      const stepMin = getSlotStepMin()
      while (current <= lastStart && count < 300) {
        const slotEnd = new Date(current.getTime() + duration * 60000)
        if (breakStart && breakEnd) {
          if (!(current < breakEnd && slotEnd > breakStart)) {
            slots.push(current.toTimeString().substring(0, 5))
          }
        } else {
          slots.push(current.toTimeString().substring(0, 5))
        }
        current.setMinutes(current.getMinutes() + stepMin)
        count++
      }
      return slots
    } catch (e) {
      return ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
    }
  }

  const timeSlots = getTimeSlots()

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

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!authForm.phone) return toast.error('請輸入電話號碼')
    
    // In a real app, you would verify password/OTP here. 
    // For now, we simulate login by fetching customer record by phone
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', authForm.phone)
      .single()
      
    if (error || !data) {
      toast.error('找不到此用戶，請先註冊')
      setIsLoginMode(false)
    } else {
      setCurrentUser(data)
      setFormData(prev => ({ ...prev, name: data.name, phone: data.phone }))
      localStorage.setItem('viva_user', JSON.stringify(data))
      fetchUserTickets(data.id)
      toast.success('登入成功')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!authForm.phone || !authForm.name) return toast.error('請填寫所有欄位')
    
    const { data, error } = await supabase
      .from('customers')
      .upsert({ name: authForm.name, phone: authForm.phone, email: authForm.email })
      .select()
      .single()
      
    if (error) {
      toast.error('註冊失敗: ' + error.message)
    } else {
      setCurrentUser(data)
      setFormData(prev => ({ ...prev, name: data.name, phone: data.phone }))
      localStorage.setItem('viva_user', JSON.stringify(data))
      fetchUserTickets(data.id)
      toast.success('註冊成功，已自動填寫資料')
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setFormData(prev => ({ ...prev, name: '', phone: '' }))
    localStorage.removeItem('viva_user')
    toast.success('已登出')
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !formData.name || !formData.phone) {
      toast.error('請填寫所有必填項目')
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const authUser = authData?.user
    if (!authUser) {
      toast.error('請先登入會員後再預約')
      const returnTo = window.location.pathname + window.location.search
      router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
      return
    }

    // Coupon Validation
    if (formData.coupon) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', formData.coupon)
        .eq('enabled', true)
        .single();

      if (!couponData) {
        toast.error('無效的優惠碼');
        return;
      }

      const now = new Date();
      if (couponData.start_date && new Date(couponData.start_date) > now) {
        toast.error('優惠碼尚未生效');
        return;
      }
      if (couponData.end_date && new Date(couponData.end_date) < now) {
        toast.error('優惠碼已過期');
        return;
      }

      if (couponData.usage_limit > 0) {
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('coupon', formData.coupon);
        
        if (count >= couponData.usage_limit) {
          toast.error('此優惠碼已達到使用上限');
          return;
        }
      }
    }

    // Handle Ticket Deduction
    if (selectedUserTicket) {
      const { error: ticketError } = await supabase
        .from('user_tickets')
        .update({ remaining_count: selectedUserTicket.remaining_count - 1 })
        .eq('id', selectedUserTicket.id)
      
      if (ticketError) {
        toast.error('套票扣除失敗')
        return
      }
    }

    const ref = (editId && originalBooking?.ref) ? originalBooking.ref : ('VIVA' + Date.now().toString().slice(-6))
    const dateStr = `${selectedDate}/${currentMonth + 1}/${currentYear}`
    const dateISO = formatDateKey(selectedDate, currentYear, currentMonth)
    const baseDurationMin = selectedService?.timeMins || 60
    const baseBufferMin = Number(selectedService?.buffer_min)
    const bufferMin = Number.isFinite(baseBufferMin) && baseBufferMin > 0 ? baseBufferMin : 0
    const startMin = parseTimeToMinutes(selectedTime)
    if (startMin == null) {
      toast.error('時間格式錯誤')
      return
    }
    const endMin = startMin + baseDurationMin + bufferMin
    
    // If no staff selected or random, find a free one to assign
    let assignedStaffId = selectedStaff === 'random' ? null : selectedStaff;
    let assignedStaffName = staffList.find(s => s.id.toString() === assignedStaffId)?.name || null;

    if (!assignedStaffId || selectedStaff === 'random') {
      const freeStaff = staffList.find(s => {
        const canProvide = !s.services || s.services.length === 0 || s.services.includes(selectedService.id);
        return canProvide && isStaffWorking(s, selectedDate, selectedTime, effectiveServiceMin);
      });
      if (freeStaff) {
        assignedStaffId = freeStaff.id.toString();
        assignedStaffName = freeStaff.name;
      }
    }

    if (!assignedStaffId) {
      toast.error('此時段暫無髮型師可預約')
      return
    }

    const { data: staffBookings, error: staffBookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('staff_id', Number(assignedStaffId))
      .eq('date', dateStr)
      .in('status', ['pending', 'confirmed'])

    if (staffBookingsError) {
      toast.error('讀取預約資料失敗: ' + staffBookingsError.message)
      return
    }

    const overlapped = (staffBookings || []).some(b => {
      if (editId && String(b.id) === String(editId)) return false
      const startRaw = b.start_time || b.time
      const bStartMin = parseTimeToMinutes(startRaw)
      if (bStartMin == null) return false
      const bEndRaw = b.buffer_end_time || b.end_time
      const bEndMinDirect = parseTimeToMinutes(bEndRaw)
      const bDurationMin = getServiceDurationMinByBooking(b)
      const bBufferMin = getServiceBufferMinByBooking(b)
      const bEndMin = bEndMinDirect != null ? bEndMinDirect : (bStartMin + bDurationMin + bBufferMin)
      return startMin < bEndMin && endMin > bStartMin
    })

    if (overlapped) {
      toast.error('此時間段已被預約，請選擇其他時間')
      return
    }

    const booking = {
      ref,
      service: selectedService.name,
      service_price: selectedService.price,
      staff_id: assignedStaffId || null,
      staff_name: assignedStaffName,
      user_id: authUser.id,
      customer_email: authUser.email,
      customer_name: formData.name,
      customer_phone: formData.phone,
      date: dateStr,
      time: selectedTime,
      name: formData.name,
      phone: formData.phone,
      coupon: formData.coupon || null,
      final_price: selectedUserTicket ? 0 : finalPrice, // 0 if ticket used
      status: 'pending',
      created_at: new Date().toISOString()
    }

    const endTimeStr = minutesToTime(startMin + baseDurationMin)
    const bufferEndTimeStr = minutesToTime(endMin)
    const bookingExtended = {
      ...booking,
      appointment_date: dateISO,
      start_time: selectedTime,
      end_time: endTimeStr,
      buffer_end_time: bufferEndTimeStr,
      duration_min: baseDurationMin,
      buffer_min: bufferMin,
      service_id: selectedService.id,
    }

    let insertRes
    if (editId) {
      insertRes = await supabase.from('bookings').update(bookingExtended).eq('id', editId).select()
      if (insertRes.error && (insertRes.error.code === 'PGRST204' || String(insertRes.error.message || '').includes('schema cache'))) {
        insertRes = await supabase.from('bookings').update(booking).eq('id', editId).select()
      }
    } else {
      insertRes = await supabase.from('bookings').insert([bookingExtended]).select()
      if (insertRes.error && (insertRes.error.code === 'PGRST204' || String(insertRes.error.message || '').includes('schema cache'))) {
        insertRes = await supabase.from('bookings').insert([booking]).select()
      }
    }

    const data = insertRes.data
    const error = insertRes.error

    if (error) {
      toast.error('錯誤: ' + JSON.stringify(error))
      return
    }

    // Update bookings state for blocking
    if (data && data[0]) {
      if (editId) {
        setBookings(bookings.map(b => b.id === editId ? data[0] : b))
      } else {
        setBookings([...bookings, data[0]])
      }
    }

    // WhatsApp Notification Link
    const shopPhone = shopSettings.phone || '85212345678'
    const waMsg = `您好，我想確認${editId ? '更改後的' : ''}預約：\n編號：${editId && originalBooking ? originalBooking.ref : ref}\n服務：${selectedService.name}\n日期：${selectedDate}/${currentMonth + 1}/${currentYear}\n時間：${selectedTime}\n姓名：${formData.name}`
    const waUrl = `https://wa.me/${shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`
    setWaUrl(waUrl)

    toast.success(editId ? '預約更改成功！' : '預約成功！')
    setBookingRef(editId && originalBooking ? originalBooking.ref : ref)
    setShowModal(true)
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
            {staffLocked && selectedStaff && selectedStaff !== 'random' ? (
              <div style={{ maxWidth: '520px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '18px', border: '2px solid var(--primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: 'var(--bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {staffList.find(s => s.id?.toString() === selectedStaff?.toString())?.photo_url ? (
                      <img src={staffList.find(s => s.id?.toString() === selectedStaff?.toString())?.photo_url} alt="staff" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '28px' }}>💇</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '16px', marginBottom: '4px' }}>
                      已選擇：{staffList.find(s => s.id?.toString() === selectedStaff?.toString())?.name || `#${selectedStaff}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>如要更改髮型師，可返回選擇頁面</div>
                  </div>
                  <Link href="/booking-collection" className="btn-interactive" style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    更改
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                <div
                  onClick={() => { setSelectedStaff('random'); setStaffLocked(false) }}
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
                    onClick={() => { setSelectedStaff(s.id.toString()); setStaffLocked(false) }}
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
                      return <div style={{ height: '20px', marginBottom: '8px' }}></div>;
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
            )}
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
                      if (selectedStaff === 'random') {
                        isOccupied = !staffList.some(s => {
                          const canProvide = !s.services || s.services.length === 0 || s.services.includes(selectedService.id);
                          return canProvide && isStaffWorking(s, selectedDate, time, effectiveServiceMin);
                        });
                      } else {
                        const staff = staffList.find(s => s.id.toString() === selectedStaff);
                        isOccupied = !isStaffWorking(staff, selectedDate, time, effectiveServiceMin);
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
                  {timeSlots.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px' }}>該日期暫無可用時段</p>}
                </div>
              )}
            </div>
          )}

          {/* Step 4: User Info */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', marginTop: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>4. 填寫資料</h3>
            
            {/* Member Login Section */}
            {authUser ? null : (
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px dashed #d1d5db' }}>
                <div style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--primary)' }}>請先登入會員後再預約</div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>登入後即可用電郵會員系統管理預約。</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/booking')}`}
                    className="btn-interactive"
                    style={{ padding: '10px 16px', background: 'var(--primary)', color: '#fff', borderRadius: '10px', fontWeight: 800, textDecoration: 'none' }}
                  >
                    登入
                  </Link>
                  <Link
                    href={`/register?redirectTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/booking')}`}
                    className="btn-interactive"
                    style={{ padding: '10px 16px', background: '#fff', color: 'var(--primary)', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', border: '1px solid var(--primary)' }}
                  >
                    註冊
                  </Link>
                </div>
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
                disabled={!!selectedUserTicket}
              >
                <option value="">請選擇優惠碼 (如有)</option>
                {coupons.map(c => (
                  <option key={c.code} value={c.code}>{c.name} - {c.desc}</option>
                ))}
              </select>
            </div>

            {/* Ticket Selection */}
            {userTickets.some(t => t.tickets?.service_id === selectedService?.id) && (
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '14px', color: '#166534' }}>
                  🎫 您有可用的套票
                </label>
                {userTickets.filter(t => t.tickets?.service_id === selectedService?.id).map(t => (
                  <div 
                    key={t.id}
                    onClick={() => {
                      if (selectedUserTicket?.id === t.id) {
                        setSelectedUserTicket(null)
                      } else {
                        setSelectedUserTicket(t)
                        setFormData({...formData, coupon: ''}) // Clear coupon if ticket used
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '10px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: selectedUserTicket?.id === t.id ? '2px solid #166534' : '1px solid #ddd'
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedUserTicket?.id === t.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#166534' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.ticket_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>剩餘 {t.remaining_count} 次</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={handleSubmit} 
              className="btn-interactive"
              style={{ 
                width: '100%', 
                padding: '16px', 
                background: selectedUserTicket ? 'linear-gradient(135deg, #166534, #15803d)' : 'linear-gradient(135deg, #A68B6A, #8B7355)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '10px', 
                fontWeight: 700, 
                fontSize: '16px', 
                cursor: 'pointer', 
                minHeight: '56px',
                boxShadow: '0 4px 15px rgba(166, 139, 106, 0.3)'
              }}
            >
              {selectedUserTicket ? `使用套票預約 (扣除 1 次)` : `提交預約 ${finalPrice > 0 ? "$" + Math.round(finalPrice) : ""}`}
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import ServicesTab from '../components/admin/ServicesTab'
import CustomersTab from '../components/admin/CustomersTab'
import SettingsTab from '../components/admin/SettingsTab'
import CouponsTab from '../components/admin/CouponsTab'
import InventoryTab from '../components/admin/InventoryTab'
import OrdersTab from '../components/admin/OrdersTab'
import AnalyticsTab from '../components/admin/AnalyticsTab'
import ArticlesTab from '../components/admin/ArticlesTab'
import FaqsTab from '../components/admin/FaqsTab'
import StaffTab from '../components/admin/StaffTab'
import BookingsTab from '../components/admin/BookingsTab'

const tabGroups = [
  { name: 'Overview', tabs: [{ id: 'dashboard', name: 'Dashboard' }, { id: 'analytics', name: 'Analytics' }, { id: 'bookings', name: 'Bookings' }, { id: 'orders', name: 'Orders' }] },
  { name: 'Services', tabs: [{ id: 'staff', name: 'Staff' }, { id: 'services', name: 'Services' }, { id: 'inventory', name: 'Inventory' }] },
  { name: 'Content', tabs: [{ id: 'coupons', name: 'Coupons' }, { id: 'articles', name: 'Articles' }, { id: 'faqs', name: 'FAQs' }] },
  { name: 'Members', tabs: [{ id: 'customers', name: 'Customers' }] },
  { name: 'System', tabs: [{ id: 'settings', name: 'Settings' }] },
]

export default function Admin() {
  const router = useRouter()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bookings, setBookings] = useState([])
  const [orders, setOrders] = useState([])
  const [services, setServices] = useState([])
  const [servicePackages, setServicePackages] = useState([])
  const [products, setProducts] = useState([])
  const [tickets, setTickets] = useState([])
  const [staff, setStaff] = useState([])
  const [coupons, setCoupons] = useState([])
  const [users, setUsers] = useState([])
  const [articles, setArticles] = useState([])
  const [faqs, setFaqs] = useState([])
  const [staffShifts, setStaffShifts] = useState([])
  const [staffBreaks, setStaffBreaks] = useState([])
  const [staffTimeOff, setStaffTimeOff] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [reviews, setReviews] = useState([])
  const [settings, setSettings] = useState({})
  const [selectedBooking, setSelectedBooking] = useState(null)

  const normalizeStaffRow = (row) => ({
    ...row,
    daysOff: Array.isArray(row?.daysOff)
      ? row.daysOff
      : Array.isArray(row?.daysoff)
        ? row.daysoff
        : [],
  })

  const normalizeScheduleRow = (row) => ({
    ...row,
    date: row?.date ? String(row.date).substring(0, 10) : '',
    start_time: row?.start_time ? String(row.start_time).substring(0, 5) : '',
    end_time: row?.end_time ? String(row.end_time).substring(0, 5) : '',
  })

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/admin/login?redirectTo=/admin')
          return
        }

        const { data: profile } = await supabase
          .from('member_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile?.is_admin) {
          await supabase.auth.signOut()
          router.replace('/admin/login?redirectTo=/admin')
          return
        }

        setIsAuthenticated(true)
        await fetchData()
      } finally {
        setAuthChecked(true)
      }
    }

    checkAdmin()
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    const [b, o, s, sp, p, t, c, cust, st, setRows, art, f, sh, br, to, bs, r] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('service_packages').select('*'),
      supabase.from('products').select('*'),
      supabase.from('tickets').select('*'),
      supabase.from('coupons').select('*'),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('staff').select('*').order('id'),
      supabase.from('settings').select('*'),
      supabase.from('articles').select('*').order('sort_order'),
      supabase.from('faqs').select('*').order('sort_order'),
      supabase.from('staff_shifts').select('*'),
      supabase.from('staff_breaks').select('*').order('staff_id').order('day_of_week'),
      supabase.from('staff_time_off').select('*').order('date'),
      supabase.from('blocked_slots').select('*').order('date'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ])

    if (b.data) setBookings(b.data)
    if (o.data) setOrders(o.data)
    if (s.data) setServices(s.data)
    if (sp.data) setServicePackages(sp.data)
    if (p.data) setProducts(p.data)
    if (t.data) setTickets(t.data)
    if (c.data) setCoupons(c.data)
    if (cust.data) setUsers(cust.data)
    if (st.data) setStaff(st.data.map(normalizeStaffRow))
    if (art.data) setArticles(art.data)
    if (f.data) setFaqs(f.data)
    if (sh.data) setStaffShifts(sh.data.map(normalizeScheduleRow))
    if (br.data) setStaffBreaks(br.data)
    if (to.data) setStaffTimeOff(to.data.map(normalizeScheduleRow))
    if (bs.data) setBlockedSlots(bs.data.map(normalizeScheduleRow))
    if (r.data) setReviews(r.data)
    if (setRows.data) {
      const nextSettings = setRows.data.reduce((acc, item) => {
        acc[item.key] = item.value
        return acc
      }, {})
      setSettings(nextSettings)
    }

    setLoading(false)
  }

  const stripTransientFields = (row) => {
    const payload = { ...row }
    delete payload.__isNew
    delete payload.__deleted
    return payload
  }

  const saveCollection = async (table, rows = [], deletedIds = []) => {
    for (const row of rows) {
      if (row?.__deleted) continue
      const payload = stripTransientFields(row)
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      const { error } = await supabase.from(table).upsert(payload)
      if (error) throw error
    }

    if (deletedIds.length > 0) {
      const { error } = await supabase.from(table).delete().in('id', deletedIds)
      if (error) throw error
    }
  }

  const saveShifts = async (shifts) => {
    setSaving(true)
    try {
      const existingIds = (staffShifts || []).map((s) => Number(s.id)).filter((n) => Number.isFinite(n))
      let nextId = (existingIds.length ? Math.max(...existingIds) : 0) + 1

      const payload = (shifts || []).map((shift) => {
        const row = { ...shift }
        row.date = row.date ? String(row.date).substring(0, 10) : row.date
        if (!row.id) {
          row.id = nextId
          nextId += 1
        }
        if (row.start_time) row.start_time = String(row.start_time).substring(0, 5)
        if (row.end_time) row.end_time = String(row.end_time).substring(0, 5)
        return row
      })

      const { error } = await supabase.from('staff_shifts').upsert(payload, { onConflict: 'staff_id, date' })
      if (error) throw error

      toast.success('Saved')
      const { data } = await supabase.from('staff_shifts').select('*')
      if (data) setStaffShifts(data)
    } catch (error) {
      toast.error('Shift save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const saveScheduleTable = async ({ table, rows = [], deletedIds = [], onConflict }) => {
    setSaving(true)
    try {
      const normalizedRows = (rows || [])
        .filter((row) => !row?.__deleted)
        .map((row) => {
          const payload = stripTransientFields({ ...row })
          if (payload.date) payload.date = String(payload.date).substring(0, 10)
          if (payload.start_time) payload.start_time = String(payload.start_time).substring(0, 5)
          if (payload.end_time) payload.end_time = String(payload.end_time).substring(0, 5)
          if (payload.day_of_week != null && payload.day_of_week !== '') payload.day_of_week = Number(payload.day_of_week)
          if (payload.is_all_day == null) delete payload.is_all_day
          if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
          return payload
        })

      if (normalizedRows.length > 0) {
        const query = onConflict
          ? supabase.from(table).upsert(normalizedRows, { onConflict })
          : supabase.from(table).upsert(normalizedRows)
        const { error } = await query
        if (error) throw error
      }

      if (deletedIds.length > 0) {
        const { error } = await supabase.from(table).delete().in('id', deletedIds)
        if (error) throw error
      }

      await fetchData()
      toast.success('Saved')
    } catch (error) {
      toast.error(`${table} save failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const saveStaffBreaks = async (payloadOrRows) => {
    const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
    const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
    await saveScheduleTable({ table: 'staff_breaks', rows, deletedIds })
  }

  const saveStaffTimeOff = async (payloadOrRows) => {
    const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
    const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
    await saveScheduleTable({ table: 'staff_time_off', rows, deletedIds })
  }

  const saveBlockedSlots = async (payloadOrRows) => {
    const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.rows || []
    const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
    await saveScheduleTable({ table: 'blocked_slots', rows, deletedIds })
  }

  const saveStaff = async () => {
    setSaving(true)
    try {
      for (const item of staff) {
        const payload = { ...item }
        payload.daysoff = Array.isArray(item.daysOff) ? item.daysOff : []
        delete payload.daysOff
        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
        const { error } = await supabase.from('staff').upsert(payload)
        if (error) throw error
      }
      await fetchData()
      toast.success('Saved')
    } catch (error) {
      toast.error('Staff save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const saveServices = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.services || []
      const deletedIds = Array.isArray(payloadOrRows?.deletedIds) ? payloadOrRows.deletedIds : []
      await saveCollection('services', rows, deletedIds)
      await fetchData()
      toast.success('Saved')
    } catch (error) {
      toast.error('Service save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const saveInventory = async ({ kind, items = [], deletedIds = [] }) => {
    const table = { products: 'products', packages: 'service_packages', tickets: 'tickets' }[kind]
    if (!table) throw new Error('Unknown inventory kind')

    setSaving(true)
    try {
      await saveCollection(table, items, deletedIds)
      await fetchData()
      toast.success('Saved')
    } catch (error) {
      toast.error('Inventory save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const saveCoupons = async (payloadOrRows) => {
    setSaving(true)
    try {
      const rows = Array.isArray(payloadOrRows) ? payloadOrRows : payloadOrRows?.coupons || []
      await saveCollection('coupons', rows)
      await fetchData()
      toast.success('Saved')
    } catch (error) {
      toast.error('Coupon save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (newSettings) => {
    setSaving(true)
    try {
      const updates = Object.keys(newSettings).map((key) => supabase.from('settings').upsert({ key, value: newSettings[key] }))
      await Promise.all(updates)
      setSettings(newSettings)
      toast.success('Saved')
    } catch (error) {
      toast.error('Settings save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)))
    toast.success('Saved')
  }

  const updateBookingStaff = async (id, staffId) => {
    const matchedStaff = staff.find((item) => item.id.toString() === String(staffId))
    await supabase
      .from('bookings')
      .update({
        staff_id: parseInt(staffId),
        staff_name: matchedStaff ? matchedStaff.name : null,
      })
      .eq('id', id)
    setBookings((current) =>
      current.map((booking) =>
        booking.id === id ? { ...booking, staff_id: parseInt(staffId), staff_name: matchedStaff ? matchedStaff.name : null } : booking
      )
    )
    toast.success('Saved')
  }

  const addStaff = () => {
    const newId = Math.max(...staff.map((item) => item.id), 0) + 1
    setStaff([
      ...staff,
      {
        id: newId,
        name: 'New Staff',
        role: 'Stylist',
        phone: '',
        enabled: true,
        schedule: {},
        services: [],
        daysOff: [],
        daysoff: [],
        photo_url: '',
        bio: '',
        break_start: '15:00',
        break_end: '16:00',
      },
    ])
  }

  const deleteStaff = async (id) => {
    if (!confirm('Delete this staff member?')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff((current) => current.filter((item) => item.id !== id))
  }

  const updateStaffField = (id, field, value) => {
    setStaff((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const toggleStaffService = (staffId, serviceId) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const servicesList = item.services || []
        const hasService = servicesList.includes(serviceId)
        return {
          ...item,
          services: hasService ? servicesList.filter((id) => id !== serviceId) : [...servicesList, serviceId],
        }
      })
    )
  }

  const toggleDailyOff = (staffId, dayKey) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const daysOff = item.daysOff || []
        const hasDay = daysOff.includes(dayKey)
        return {
          ...item,
          daysOff: hasDay ? daysOff.filter((day) => day !== dayKey) : [...daysOff, dayKey],
        }
      })
    )
  }

  const updateStaffSchedule = (staffId, day, field, value) => {
    setStaff((current) =>
      current.map((item) => {
        if (item.id !== staffId) return item
        const schedule = item.schedule || {}
        return { ...item, schedule: { ...schedule, [day]: { ...schedule[day], [field]: value } } }
      })
    )
  }

  const updateCustomer = async (id, updates) => {
    await supabase.from('customers').update(updates).eq('id', id)
    setUsers((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    toast.success('Saved')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    router.push('/admin/login')
  }

  const today = new Date().toLocaleDateString('zh-HK')
  const stats = {
    todayBookings: bookings.filter((booking) => booking.date === today).length,
    todayRevenue: bookings.filter((booking) => booking.date === today).reduce((sum, booking) => sum + (booking.final_price || 0), 0),
    totalUsers: users.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
  }

  const popularServices = Object.entries(
    bookings.reduce((acc, booking) => {
      acc[booking.service] = (acc[booking.service] || 0) + 1
      return acc
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  if (!authChecked || loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading...</div>
  if (!isAuthenticated) return <div style={{ padding: '100px', textAlign: 'center' }}>Checking admin access...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ background: '#3D3D3D', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>VIVA SALON Admin</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ padding: '6px 12px', background: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Refresh
          </button>
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '6px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ background: '#fff', borderBottom: '1px solid #eee', overflowX: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '1200px', margin: '0 auto' }}>
          {tabGroups.map((group) => (
            <div key={group.name} style={{ display: 'flex', gap: '4px', paddingRight: '12px', borderRight: '1px solid #eee' }}>
              {group.tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  style={{
                    padding: '10px 16px',
                    background: activeTab === tab.id ? '#A68B6A' : 'transparent',
                    color: activeTab === tab.id ? '#fff' : '#666',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="admin-card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px' }}>Today Bookings</div>
                <div style={{ fontSize: '32px', fontWeight: 800 }}>{stats.todayBookings}</div>
              </div>
              <div className="admin-card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px' }}>Today Revenue</div>
                <div style={{ fontSize: '32px', fontWeight: 800 }}>${stats.todayRevenue.toLocaleString()}</div>
              </div>
              <div className="admin-card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px' }}>Pending</div>
                <div style={{ fontSize: '32px', fontWeight: 800 }}>{stats.pending}</div>
              </div>
              <div className="admin-card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px' }}>Members</div>
                <div style={{ fontSize: '32px', fontWeight: 800 }}>{stats.totalUsers}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
              <div className="admin-card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 700 }}>Today's Bookings</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {bookings.filter((booking) => booking.date === today).length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fafafa', borderRadius: '12px' }}>No bookings today</div>
                  ) : (
                    bookings
                      .filter((booking) => booking.date === today)
                      .map((booking) => (
                        <div key={booking.id} style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid var(--gray)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '60px', textAlign: 'center', paddingRight: '16px', borderRight: '1px solid var(--gray)' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{booking.time}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{booking.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{booking.service} - {booking.staff_name || 'Unassigned'}</div>
                          </div>
                          <button type="button" onClick={() => setSelectedBooking(booking)} style={{ border: 'none', background: 'transparent', color: '#A68B6A', cursor: 'pointer', fontWeight: 700 }}>
                            View
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div className="admin-card" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700 }}>Popular Services</h3>
                  {popularServices.map(([name, count], idx) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: idx === popularServices.length - 1 ? 'none' : '1px solid #f9f9f9' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>{idx + 1}</div>
                      <div style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>{count}</div>
                    </div>
                  ))}
                </div>

                <div className="admin-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700, color: '#fff' }}>Quick Actions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={() => setActiveTab('bookings')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      Bookings
                    </button>
                    <button onClick={() => setActiveTab('inventory')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      Inventory
                    </button>
                    <button onClick={() => setActiveTab('staff')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      Staff
                    </button>
                    <button onClick={() => setActiveTab('settings')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsTab bookings={bookings} orders={orders} reviews={reviews} />}
        {activeTab === 'orders' && <OrdersTab orders={orders} />}
        {activeTab === 'bookings' && <BookingsTab bookings={bookings} staff={staff} onUpdateStatus={updateStatus} onUpdateBookingStaff={updateBookingStaff} onViewDetail={(booking) => setSelectedBooking(booking)} />}
        {activeTab === 'staff' && (
          <StaffTab
            staff={staff}
            services={services}
            staffShifts={staffShifts}
            staffBreaks={staffBreaks}
            staffTimeOff={staffTimeOff}
            blockedSlots={blockedSlots}
            onAddStaff={addStaff}
            onDeleteStaff={deleteStaff}
            onUpdateField={updateStaffField}
            onToggleService={toggleStaffService}
            onToggleDailyOff={toggleDailyOff}
            onUpdateSchedule={updateStaffSchedule}
            onSave={saveStaff}
            onSaveShifts={saveShifts}
            onSaveBreaks={saveStaffBreaks}
            onSaveTimeOff={saveStaffTimeOff}
            onSaveBlockedSlots={saveBlockedSlots}
            saving={saving}
          />
        )}
        {activeTab === 'services' && <ServicesTab services={services} saveServices={saveServices} />}
        {activeTab === 'inventory' && <InventoryTab products={products} packages={servicePackages} tickets={tickets} services={services} fetchData={fetchData} saveInventory={saveInventory} />}
        {activeTab === 'coupons' && <CouponsTab coupons={coupons} saveCoupons={saveCoupons} />}
        {activeTab === 'articles' && <ArticlesTab articles={articles} />}
        {activeTab === 'faqs' && <FaqsTab faqs={faqs} />}
        {activeTab === 'customers' && <CustomersTab users={users} bookings={bookings} onUpdateCustomer={updateCustomer} />}
        {activeTab === 'settings' && <SettingsTab settings={settings} saveSettings={saveSettings} saving={saving} />}
      </main>

      {selectedBooking && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}
          onClick={() => setSelectedBooking(null)}
        >
          <div
            style={{ background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ padding: '20px 25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#A68B6A' }}>Booking Detail</h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>
                x
              </button>
            </div>
            <div style={{ padding: '25px' }}>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong style={{ color: '#666' }}>Date:</strong> {selectedBooking.date} {selectedBooking.time}</div>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong style={{ color: '#666' }}>Service:</strong> {selectedBooking.service}</div>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong style={{ color: '#666' }}>Customer:</strong> {selectedBooking.name}</div>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong style={{ color: '#666' }}>Phone:</strong> {selectedBooking.phone}</div>
                <div style={{ marginBottom: '15px', fontSize: '15px' }}>
                  <strong style={{ color: '#666' }}>Staff:</strong>
                  <select
                    value={selectedBooking.staff_id || ''}
                    onChange={async (event) => {
                      await updateBookingStaff(selectedBooking.id, event.target.value)
                      const matchedStaff = staff.find((item) => item.id.toString() === event.target.value)
                      setSelectedBooking({ ...selectedBooking, staff_id: parseInt(event.target.value), staff_name: matchedStaff ? matchedStaff.name : null })
                    }}
                    style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((item) => (
                      <option key={item.id} value={item.id.toString()}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <div style={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#666' }}>Status:</strong>
                    <select
                      value={selectedBooking.status}
                      onChange={async (event) => {
                        await updateStatus(selectedBooking.id, event.target.value)
                        setSelectedBooking({ ...selectedBooking, status: event.target.value })
                      }}
                      style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

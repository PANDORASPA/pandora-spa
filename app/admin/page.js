'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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

const TAB_GROUPS = [
  ['dashboard', 'Dashboard'],
  ['analytics', '分析'],
  ['bookings', '預約'],
  ['orders', '訂單'],
  ['staff', '員工'],
  ['services', '服務'],
  ['inventory', '產品/套票'],
  ['coupons', '優惠券'],
  ['articles', '文章'],
  ['faqs', 'FAQ'],
  ['customers', '客戶'],
  ['settings', '設定'],
]

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)

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
  const [reviews, setReviews] = useState([])
  const [settings, setSettings] = useState({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const tab = new URLSearchParams(window.location.search).get('tab')
    const allowedTabs = new Set(TAB_GROUPS.map(([id]) => id))
    if (tab && allowedTabs.has(tab)) {
      setActiveTab(tab)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [b, o, s, sp, p, t, c, cust, st, setRows, art, faqRows, sh, reviewRows] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('sort_order').order('id'),
        supabase.from('service_packages').select('*').order('id'),
        supabase.from('products').select('*').order('sort_order').order('id'),
        supabase.from('tickets').select('*').order('id'),
        supabase.from('coupons').select('*').order('id'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('staff').select('*').order('id'),
        supabase.from('settings').select('*'),
        supabase.from('articles').select('*').order('sort_order').order('id'),
        supabase.from('faqs').select('*').order('sort_order').order('id'),
        supabase.from('staff_shifts').select('*'),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      ])

      const allResults = [b, o, s, sp, p, t, c, cust, st, setRows, art, faqRows, sh, reviewRows]
      const firstError = allResults.find((item) => item.error)?.error
      if (firstError) throw firstError

      setBookings(b.data || [])
      setOrders(o.data || [])
      setServices(s.data || [])
      setServicePackages(sp.data || [])
      setProducts(p.data || [])
      setTickets(t.data || [])
      setCoupons(c.data || [])
      setUsers(cust.data || [])
      setStaff(st.data || [])
      setArticles(art.data || [])
      setFaqs(faqRows.data || [])
      setStaffShifts(sh.data || [])
      setReviews(reviewRows.data || [])
      setSettings(
        (setRows.data || []).reduce((acc, item) => {
          acc[item.key] = item.value
          return acc
        }, {})
      )
    } catch (error) {
      toast.error(error?.message || '讀取後台資料失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function checkAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setCurrentUser(user || null)

        if (!user) {
          setAuthChecked(true)
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('member_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (error) throw error

        const allowed = Boolean(profile?.is_admin)
        setIsAdmin(allowed)
        setAuthChecked(true)

        if (allowed) {
          await fetchData()
        } else {
          setLoading(false)
        }
      } catch (error) {
        toast.error(error?.message || '檢查後台權限失敗')
        setAuthChecked(true)
        setLoading(false)
      }
    }

    checkAccess()
  }, [])

  const saveShifts = async (shifts) => {
    setSaving(true)
    try {
      const payload = (shifts || [])
        .filter((row) => row && row.staff_id != null && row.date)
        .map((row) => {
          const nextRow = { ...row }
          delete nextRow.id
          delete nextRow.created_at
          if (nextRow.start_time === '') nextRow.start_time = null
          if (nextRow.end_time === '') nextRow.end_time = null
          return nextRow
        })

      const { error } = await supabase.from('staff_shifts').upsert(payload, { onConflict: 'staff_id,date' })
      if (error) throw error
      toast.success('排班已儲存')
      await fetchData()
    } catch (error) {
      toast.error(error?.message || '儲存排班失敗')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setBookings((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const updateBookingStaff = async (id, staffId) => {
    const staffMember = staff.find((item) => String(item.id) === String(staffId))
    const payload = {
      staff_id: staffId ? Number(staffId) : null,
      staff_name: staffMember?.name || null,
    }
    const { error } = await supabase.from('bookings').update(payload).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setBookings((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)))
  }

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setOrders((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const addStaff = () => {
    const newId = Math.max(...staff.map((item) => Number(item.id) || 0), 0) + 1
    setStaff((prev) => [
      ...prev,
      {
        id: newId,
        name: '新員工',
        role: '髮型師',
        phone: '',
        enabled: true,
        schedule: {},
        services: [],
        daysOff: [],
        photo_url: '',
        bio: '',
        break_start: '15:00',
        break_end: '16:00',
      },
    ])
  }

  const deleteStaff = async (id) => {
    if (!confirm('確定刪除此員工？')) return
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setStaff((prev) => prev.filter((item) => item.id !== id))
  }

  const updateStaffField = (id, field, value) => {
    setStaff((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const toggleStaffService = (staffId, serviceId) => {
    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== staffId) return item
        const currentServices = Array.isArray(item.services) ? item.services : []
        const exists = currentServices.includes(serviceId)
        return {
          ...item,
          services: exists ? currentServices.filter((id) => id !== serviceId) : [...currentServices, serviceId],
        }
      })
    )
  }

  const toggleDailyOff = (staffId, dayKey) => {
    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== staffId) return item
        const daysOff = Array.isArray(item.daysOff) ? item.daysOff : []
        const exists = daysOff.includes(dayKey)
        return {
          ...item,
          daysOff: exists ? daysOff.filter((id) => id !== dayKey) : [...daysOff, dayKey],
        }
      })
    )
  }

  const updateStaffSchedule = (staffId, day, field, value) => {
    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== staffId) return item
        const schedule = item.schedule || {}
        return {
          ...item,
          schedule: {
            ...schedule,
            [day]: {
              ...(schedule[day] || {}),
              [field]: value,
            },
          },
        }
      })
    )
  }

  const saveStaff = async (onlyStaffId) => {
    setSaving(true)
    try {
      const list = onlyStaffId ? staff.filter((item) => item.id === onlyStaffId) : staff
      for (const item of list) {
        const payload = { ...item }
        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
        const { error } = await supabase.from('staff').upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }
      await fetchData()
      toast.success('員工資料已儲存')
    } catch (error) {
      toast.error(error?.message || '儲存員工資料失敗')
    } finally {
      setSaving(false)
    }
  }

  const saveServices = async (nextServices) => {
    setSaving(true)
    try {
      const existingIds = services.map((item) => item.id).filter(Boolean)
      const nextIds = nextServices.map((item) => item.id).filter((id) => typeof id === 'number')
      const deletedIds = existingIds.filter((id) => !nextIds.includes(id))

      if (deletedIds.length > 0) {
        const { error } = await supabase.from('services').delete().in('id', deletedIds)
        if (error) throw error
      }

      for (const item of nextServices) {
        const payload = { ...item }
        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
        const { error } = await supabase.from('services').upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }

      await fetchData()
      toast.success('服務已儲存')
    } catch (error) {
      toast.error(error?.message || '儲存服務失敗')
    } finally {
      setSaving(false)
    }
  }

  const saveCoupons = async (nextCoupons) => {
    setSaving(true)
    try {
      const existingIds = coupons.map((item) => item.id).filter(Boolean)
      const nextIds = nextCoupons.map((item) => item.id).filter((id) => typeof id === 'number')
      const deletedIds = existingIds.filter((id) => !nextIds.includes(id))

      if (deletedIds.length > 0) {
        const { error } = await supabase.from('coupons').delete().in('id', deletedIds)
        if (error) throw error
      }

      for (const item of nextCoupons) {
        const payload = { ...item }
        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
        const { error } = await supabase.from('coupons').upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }

      await fetchData()
      toast.success('優惠券已儲存')
    } catch (error) {
      toast.error(error?.message || '儲存優惠券失敗')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (nextSettings) => {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(nextSettings || {})) {
        const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
        if (error) throw error
      }
      await fetchData()
      toast.success('設定已儲存')
    } catch (error) {
      toast.error(error?.message || '儲存設定失敗')
    } finally {
      setSaving(false)
    }
  }

  const updateCustomer = async (id, updates) => {
    const { error } = await supabase.from('customers').update(updates).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('zh-HK')
    return {
      todayBookings: bookings.filter((item) => item.date === today).length,
      todayRevenue: bookings
        .filter((item) => item.date === today)
        .reduce((sum, item) => sum + Number(item.final_price || item.service_price || 0), 0),
      totalUsers: users.length,
      pending: bookings.filter((item) => item.status === 'pending').length,
    }
  }, [bookings, users.length])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (!authChecked || loading) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>載入後台中...</div>
  }

  if (!currentUser) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1>管理後台</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>請先使用管理帳號登入。</p>
        <Link href="/admin/login?redirectTo=%2Fadmin" style={{ display: 'inline-block', padding: '12px 20px', background: '#A68B6A', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
          前往後台登入
        </Link>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1>管理後台</h1>
        <p style={{ color: '#666', marginBottom: '12px' }}>你的帳號已登入，但沒有管理後台權限。</p>
        <p style={{ color: '#999', marginBottom: '20px' }}>請確認 `member_profiles.is_admin = true` 後再登入。</p>
        <button onClick={handleLogout} style={{ padding: '12px 20px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
          登出
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ background: '#3D3D3D', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '18px', margin: 0 }}>VIVA HAIR 後台管理</h2>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{currentUser.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ padding: '6px 12px', background: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            重新整理
          </button>
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '6px', cursor: 'pointer' }}>
            登出
          </button>
        </div>
      </header>

      <div style={{ background: '#fff', borderBottom: '1px solid #eee', overflowX: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap' }}>
          {TAB_GROUPS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: '10px 16px',
                background: activeTab === id ? '#A68B6A' : 'transparent',
                color: activeTab === id ? '#fff' : '#666',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'dashboard' ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {[
                ['今日預約', stats.todayBookings],
                ['今日收入', `$${stats.todayRevenue}`],
                ['待處理預約', stats.pending],
                ['客戶總數', stats.totalUsers],
              ].map(([label, value]) => (
                <div key={label} className="admin-card" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
                  <div style={{ fontSize: '30px', fontWeight: 800 }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="admin-card" style={{ padding: '24px' }}>
              <h3 style={{ marginTop: 0 }}>最近預約</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {bookings.slice(0, 8).map((item) => (
                  <div key={item.id} style={{ padding: '14px', border: '1px solid var(--gray)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>{item.service}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.time}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{item.status}</div>
                    </div>
                  </div>
                ))}
                {bookings.length === 0 ? <div style={{ color: '#666' }}>目前沒有預約資料。</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'analytics' ? <AnalyticsTab bookings={bookings} orders={orders} reviews={reviews} /> : null}
        {activeTab === 'bookings' ? (
          <BookingsTab
            bookings={bookings}
            staff={staff}
            onUpdateStatus={updateStatus}
            onUpdateBookingStaff={updateBookingStaff}
            onViewDetail={(booking) => setSelectedBooking(booking)}
          />
        ) : null}
        {activeTab === 'orders' ? <OrdersTab orders={orders} onUpdateOrderStatus={updateOrderStatus} /> : null}
        {activeTab === 'staff' ? (
          <StaffTab
            staff={staff}
            services={services}
            staffShifts={staffShifts}
            onAddStaff={addStaff}
            onDeleteStaff={deleteStaff}
            onUpdateField={updateStaffField}
            onToggleService={toggleStaffService}
            onToggleDailyOff={toggleDailyOff}
            onUpdateSchedule={updateStaffSchedule}
            onSave={saveStaff}
            onSaveShifts={saveShifts}
            saving={saving}
          />
        ) : null}
        {activeTab === 'services' ? <ServicesTab services={services} saveServices={saveServices} /> : null}
        {activeTab === 'inventory' ? (
          <InventoryTab
            products={products}
            packages={servicePackages}
            tickets={tickets}
            services={services}
            fetchData={fetchData}
          />
        ) : null}
        {activeTab === 'coupons' ? <CouponsTab coupons={coupons} saveCoupons={saveCoupons} /> : null}
        {activeTab === 'articles' ? <ArticlesTab articles={articles} /> : null}
        {activeTab === 'faqs' ? <FaqsTab faqs={faqs} /> : null}
        {activeTab === 'customers' ? <CustomersTab users={users} bookings={bookings} onUpdateCustomer={updateCustomer} /> : null}
        {activeTab === 'settings' ? <SettingsTab settings={settings} saveSettings={saveSettings} /> : null}
      </main>

      {selectedBooking ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setSelectedBooking(null)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '460px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#A68B6A' }}>
                預約詳情 <span style={{ fontSize: '13px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>#{selectedBooking.ref}</span>
              </h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>
                ×
              </button>
            </div>
            <div style={{ padding: '25px' }}>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong>日期時間:</strong> {selectedBooking.date} {selectedBooking.time}</div>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong>服務:</strong> {selectedBooking.service}</div>
                <div style={{ marginBottom: '15px', fontSize: '15px' }}>
                  <strong>設計師:</strong>
                  <select
                    value={selectedBooking.staff_id || ''}
                    onChange={async (event) => {
                      await updateBookingStaff(selectedBooking.id, event.target.value)
                      const staffMember = staff.find((item) => String(item.id) === String(event.target.value))
                      setSelectedBooking({ ...selectedBooking, staff_id: event.target.value ? Number(event.target.value) : null, staff_name: staffMember?.name || null })
                    }}
                    style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">未分配</option>
                    {staff.map((item) => (
                      <option key={item.id} value={item.id.toString()}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '15px' }}><strong>客戶:</strong> {selectedBooking.name}</div>
                  <div style={{ marginBottom: '15px', fontSize: '15px' }}><strong>電話:</strong> {selectedBooking.phone}</div>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <div style={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}>
                    <strong>狀態</strong>
                    <select
                      value={selectedBooking.status}
                      onChange={async (event) => {
                        await updateStatus(selectedBooking.id, event.target.value)
                        setSelectedBooking({ ...selectedBooking, status: event.target.value })
                      }}
                      style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                    >
                      <option value="pending">待確認</option>
                      <option value="confirmed">已確認</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>
                關閉
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

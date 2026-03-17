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
  {
    name: '營運',
    tabs: [
      ['dashboard', '總覽'],
      ['analytics', '分析'],
      ['bookings', '預約'],
      ['orders', '訂單'],
    ],
  },
  {
    name: '服務',
    tabs: [
      ['staff', '員工'],
      ['services', '服務'],
      ['inventory', '產品/套票'],
    ],
  },
  {
    name: '內容',
    tabs: [
      ['coupons', '優惠券'],
      ['articles', '文章'],
      ['faqs', 'FAQ'],
    ],
  },
  {
    name: '會員',
    tabs: [['customers', '客戶']],
  },
  {
    name: '系統',
    tabs: [['settings', '設定']],
  },
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
          .select('is_admin, full_name, email')
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
        toast.error(error?.message || '檢查管理員權限失敗')
        setAuthChecked(true)
        setLoading(false)
      }
    }

    checkAccess()
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

      const settingsMap = (setRows.data || []).reduce((acc, item) => {
        acc[item.key] = item.value
        return acc
      }, {})
      setSettings(settingsMap)
    } catch (error) {
      toast.error(error?.message || '讀取後台資料失敗')
    } finally {
      setLoading(false)
    }
  }

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
      toast.success('排班已保存')
      await fetchData()
    } catch (error) {
      toast.error(`排班保存失敗: ${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
      if (error) throw error
      setBookings((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
      toast.success('預約狀態已更新')
    } catch (error) {
      toast.error(`更新失敗: ${error?.message || '未知錯誤'}`)
    }
  }

  const updateBookingStaff = async (id, staffId) => {
    try {
      const staffMember = staff.find((item) => String(item.id) === String(staffId))
      const payload = {
        staff_id: staffId ? Number(staffId) : null,
        staff_name: staffMember?.name || null,
      }
      const { error } = await supabase.from('bookings').update(payload).eq('id', id)
      if (error) throw error
      setBookings((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)))
      toast.success('預約員工已更新')
    } catch (error) {
      toast.error(`更新失敗: ${error?.message || '未知錯誤'}`)
    }
  }

  const updateOrderStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
      setOrders((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
      toast.success('訂單狀態已更新')
    } catch (error) {
      toast.error(`更新失敗: ${error?.message || '未知錯誤'}`)
    }
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
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id)
      if (error) throw error
      setStaff((prev) => prev.filter((item) => item.id !== id))
      toast.success('員工已刪除')
    } catch (error) {
      toast.error(`刪除失敗: ${error?.message || '未知錯誤'}`)
    }
  }

  const updateStaffField = (id, field, value) => {
    setStaff((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const toggleStaffService = (staffId, serviceId) => {
    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== staffId) return item
        const nextServices = Array.isArray(item.services) ? item.services : []
        const exists = nextServices.includes(serviceId)
        return {
          ...item,
          services: exists ? nextServices.filter((id) => id !== serviceId) : [...nextServices, serviceId],
        }
      })
    )
  }

  const toggleDailyOff = (staffId, dayKey) => {
    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== staffId) return item
        const nextDaysOff = Array.isArray(item.daysOff) ? item.daysOff : []
        const exists = nextDaysOff.includes(dayKey)
        return {
          ...item,
          daysOff: exists ? nextDaysOff.filter((id) => id !== dayKey) : [...nextDaysOff, dayKey],
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
      toast.success('員工資料已保存')
    } catch (error) {
      toast.error(`保存失敗: ${error?.message || '未知錯誤'}`)
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
      toast.success('服務已保存')
    } catch (error) {
      toast.error(`保存失敗: ${error?.message || '未知錯誤'}`)
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
      toast.success('優惠券已保存')
    } catch (error) {
      toast.error(`保存失敗: ${error?.message || '未知錯誤'}`)
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
      toast.success('設定已保存')
    } catch (error) {
      toast.error(`設定保存失敗: ${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const updateCustomer = async (id, updates) => {
    try {
      const { error } = await supabase.from('customers').update(updates).eq('id', id)
      if (error) throw error
      setUsers((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
      toast.success('客戶資料已更新')
    } catch (error) {
      toast.error(`更新失敗: ${error?.message || '未知錯誤'}`)
    }
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
      completed: bookings.filter((item) => item.status === 'completed').length,
      cancelled: bookings.filter((item) => item.status === 'cancelled').length,
    }
  }, [bookings, users.length])

  const popularServices = useMemo(() => {
    const counts = bookings.reduce((acc, item) => {
      const key = item.service || '未命名服務'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [bookings])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!authChecked || loading) {
    return <div style={{ padding: '100px', textAlign: 'center' }}>載入中...</div>
  }

  if (!currentUser) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1>管理後台</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>請先登入會員帳號。</p>
        <Link href="/login?redirectTo=/admin" style={{ display: 'inline-block', padding: '12px 20px', background: '#A68B6A', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
          前往登入
        </Link>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1>管理後台</h1>
        <p style={{ color: '#666', marginBottom: '12px' }}>你的帳號已登入，但未有管理員權限。</p>
        <p style={{ color: '#999', marginBottom: '20px' }}>請把 `member_profiles.is_admin` 設為 `true` 後再進入。</p>
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
          <h2 style={{ fontSize: '18px', margin: 0 }}>VIVA SALON 後台管理</h2>
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
        <div style={{ display: 'flex', gap: '12px', maxWidth: '1200px', margin: '0 auto', flexWrap: 'wrap' }}>
          {TAB_GROUPS.map((group) => (
            <div key={group.name} style={{ display: 'flex', gap: '6px', paddingRight: '12px', borderRight: '1px solid #eee' }}>
              {group.tabs.map(([id, label]) => (
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
          ))}
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {[
                ['今日預約', stats.todayBookings],
                ['今日收入', `$${stats.todayRevenue}`],
                ['待確認', stats.pending],
                ['客戶總數', stats.totalUsers],
              ].map(([label, value]) => (
                <div key={label} className="admin-card" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
                  <div style={{ fontSize: '30px', fontWeight: 800 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
              <div className="admin-card" style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0 }}>今日預約</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {bookings.filter((item) => item.date === new Date().toLocaleDateString('zh-HK')).slice(0, 8).map((item) => (
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
                  {bookings.filter((item) => item.date === new Date().toLocaleDateString('zh-HK')).length === 0 && (
                    <div style={{ color: '#666' }}>今日暫時沒有預約。</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div className="admin-card" style={{ padding: '24px' }}>
                  <h3 style={{ marginTop: 0 }}>熱門服務</h3>
                  {popularServices.map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span>{name}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>

                <div className="admin-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff' }}>
                  <h3 style={{ marginTop: 0, color: '#fff' }}>快速入口</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      ['bookings', '處理預約'],
                      ['orders', '查看訂單'],
                      ['staff', '管理員工'],
                      ['settings', '網站設定'],
                    ].map(([id, label]) => (
                      <button key={id} onClick={() => setActiveTab(id)} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsTab bookings={bookings} orders={orders} reviews={reviews} />}
        {activeTab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            staff={staff}
            onUpdateStatus={updateStatus}
            onUpdateBookingStaff={updateBookingStaff}
            onViewDetail={(booking) => setSelectedBooking(booking)}
          />
        )}
        {activeTab === 'orders' && <OrdersTab orders={orders} onUpdateOrderStatus={updateOrderStatus} />}
        {activeTab === 'staff' && (
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
        )}
        {activeTab === 'services' && <ServicesTab services={services} saveServices={saveServices} />}
        {activeTab === 'inventory' && (
          <InventoryTab
            products={products}
            packages={servicePackages}
            tickets={tickets}
            services={services}
            fetchData={fetchData}
          />
        )}
        {activeTab === 'coupons' && <CouponsTab coupons={coupons} saveCoupons={saveCoupons} />}
        {activeTab === 'articles' && <ArticlesTab articles={articles} />}
        {activeTab === 'faqs' && <FaqsTab faqs={faqs} />}
        {activeTab === 'customers' && <CustomersTab users={users} bookings={bookings} onUpdateCustomer={updateCustomer} />}
        {activeTab === 'settings' && <SettingsTab settings={settings} saveSettings={saveSettings} />}
      </main>

      {selectedBooking && (
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
                  <strong>員工:</strong>
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
                  <div style={{ marginBottom: '10px', fontSize: '15px' }}><strong>顧客:</strong> {selectedBooking.name}</div>
                  <div style={{ marginBottom: '15px', fontSize: '15px' }}><strong>電話:</strong> {selectedBooking.phone}</div>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <div style={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}>
                    <strong>狀態:</strong>
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
      )}
    </div>
  )
}

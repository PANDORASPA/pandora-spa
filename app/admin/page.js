'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase'
import ServicesTab from '../components/admin/ServicesTab'
import CustomersTab from '../components/admin/CustomersTab';
import SettingsTab from '../components/admin/SettingsTab'
import CouponsTab from '../components/admin/CouponsTab'
import InventoryTab from '../components/admin/InventoryTab'
import OrdersTab from '../components/admin/OrdersTab'
import AnalyticsTab from '../components/admin/AnalyticsTab'
import ArticlesTab from '../components/admin/ArticlesTab'
import FaqsTab from '../components/admin/FaqsTab'
import StaffTab from '../components/admin/StaffTab'
import BookingsTab from '../components/admin/BookingsTab'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const ADMIN_PASSWORD = 'viva2026'

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
  const [selectedBooking, setSelectedBooking] = useState(null)

  const tabGroups = [
    { name: '營運', tabs: [
      { id: 'dashboard', name: '📊 概覽' },
      { id: 'analytics', name: '📈 分析' },
      { id: 'bookings', name: '📅 預約' },
      { id: 'orders', name: '🛒 訂單' },
    ]},
    { name: '服務', tabs: [
      { id: 'staff', name: '💇 員工' },
      { id: 'services', name: '✂️ 服務' },
      { id: 'inventory', name: '📦 庫存/套餐' },
    ]},
    { name: '推廣', tabs: [
      { id: 'coupons', name: '🏷️ 優惠碼' },
      { id: 'articles', name: '📝 文章' },
      { id: 'faqs', name: '❓ FAQ' },
    ]},
    { name: '會員', tabs: [
      { id: 'customers', name: '👥 客戶' },
    ]},
    { name: '系統', tabs: [
      { id: 'settings', name: '⚙️ 設定' },
    ]},
  ]

  useEffect(() => {
    const auth = localStorage.getItem('viva_admin_auth')
    if (auth === 'true') { setIsAuthenticated(true); fetchData() } 
    else setLoading(false)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [b, o, s, sp, p, t, c, cust, st, set, art, f, sh, r] = await Promise.all([
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
    if (st.data) setStaff(st.data)
    if (art.data) setArticles(art.data)
    if (f.data) setFaqs(f.data)
    if (sh.data) setStaffShifts(sh.data)
    if (r.data) setReviews(r.data)
    if (set.data) {
      const settingsData = set.data.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setSettings(settingsData);
    }
    setLoading(false)
  }

  const saveShifts = async (shifts) => {
    setSaving(true)
    const { error } = await supabase.from('staff_shifts').upsert(shifts, { onConflict: 'staff_id, date' })
    if (error) toast.error('排班儲存失敗: ' + error.message)
    else {
      toast.success('排班已儲存')
      setStaffShifts(shifts)
    }
    setSaving(false)
  }

  const handleLogin = (e) => { 
    if (e) e.preventDefault(); 
    if (password === ADMIN_PASSWORD) { 
      localStorage.setItem('viva_admin_auth', 'true'); 
      setIsAuthenticated(true); 
      setLoginError('');
      fetchData(); 
    } else {
      setLoginError('密碼不正確');
      toast.error('密碼不正確');
    }
  }
  const handleLogout = () => { localStorage.removeItem('viva_admin_auth'); setIsAuthenticated(false); router.push('/') }

  const updateStatus = async (id, status) => { 
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(bookings.map(b => b.id === id ? { ...b, status } : b))
    toast.success('狀態已更新')
  }

  const updateBookingStaff = async (id, staffId) => {
    const s = staff.find(st => st.id.toString() === staffId)
    await supabase.from('bookings').update({ 
      staff_id: parseInt(staffId),
      staff_name: s ? s.name : null
    }).eq('id', id)
    setBookings(bookings.map(b => b.id === id ? { ...b, staff_id: parseInt(staffId), staff_name: s ? s.name : null } : b))
    toast.success('髮型師已更換')
  }

  const addStaff = () => {
    const newId = Math.max(...staff.map(s => s.id), 0) + 1
    setStaff([...staff, { 
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
      break_end: '16:00'
    }])
    // selectedStaffId is managed in StaffTab, not here
  }

  const deleteStaff = async (id) => {
    if (!confirm('確定刪除此員工？')) return
    await supabase.from('staff').delete().eq('id', id)
    setStaff(staff.filter(s => s.id !== id))
    // selectedStaffId is managed in StaffTab, not here
  }

  const updateStaffField = (id, field, value) => {
    setStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const toggleStaffService = (staffId, serviceId) => {
    setStaff(staff.map(s => {
      if (s.id === staffId) {
        const svcs = s.services || []
        const has = svcs.includes(serviceId)
        return { ...s, services: has ? svcs.filter(id => id !== serviceId) : [...svcs, serviceId] }
      }
      return s
    }))
  }

  const toggleDailyOff = (staffId, dayKey) => {
    setStaff(staff.map(s => {
      if (s.id === staffId) {
        const daysOff = s.daysOff || []
        const has = daysOff.includes(dayKey)
        return { ...s, daysOff: has ? daysOff.filter(d => d !== dayKey) : [...daysOff, dayKey] }
      }
      return s
    }))
  }

  const updateStaffSchedule = (staffId, day, field, value) => {
    setStaff(staff.map(s => {
      if (s.id === staffId) {
        const schedule = s.schedule || {}
        return { ...s, schedule: { ...schedule, [day]: { ...schedule[day], [field]: value } } }
      }
      return s
    }))
  }

  const saveStaff = async () => {
    setSaving(true)
    for (const s of staff) {
      const payload = { ...s }
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      await supabase.from('staff').upsert(payload)
    }
    await fetchData()
    toast.success('已保存')
    setSaving(false)
  }

  const saveServices = async (newServices) => {
    setSaving(true)
    for (const s of newServices) {
      const payload = { ...s }
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      await supabase.from('services').upsert(payload)
    }
    await fetchData()
    toast.success('已保存')
    setSaving(false)
  }

  const saveCoupons = async (newCoupons) => {
    setSaving(true)
    for (const c of newCoupons) {
      const payload = { ...c }
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      await supabase.from('coupons').upsert(payload)
    }
    await fetchData()
    toast.success('已保存')
    setSaving(false)
  }

  const saveSettings = async (newSettings) => {
    setSaving(true);
    const updates = Object.keys(newSettings).map(key => (
      supabase.from('settings').upsert({ key, value: newSettings[key] })
    ));
    await Promise.all(updates);
    setSettings(newSettings);
    toast.success('設定已保存');
    setSaving(false);
  };

  const updateCustomer = async (id, updates) => {
    await supabase.from('customers').update(updates).eq('id', id)
    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u))
    toast.success('客戶資料已更新')
  }

  const today = new Date().toLocaleDateString('zh-HK')
  const stats = {
    todayBookings: bookings.filter(b => b.date === today).length,
    todayRevenue: bookings.filter(b => b.date === today).reduce((sum, b) => sum + (b.final_price || 0), 0),
    totalUsers: users.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const serviceStats = bookings.reduce((acc, b) => {
    acc[b.service] = (acc[b.service] || 0) + 1;
    return acc;
  }, {});
  const popularServices = Object.entries(serviceStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (!isAuthenticated) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <h1>管理<span style={{ color: '#A68B6A' }}>後台</span></h1>
      <form 
        onSubmit={handleLogin}
        style={{ maxWidth: '300px', margin: '30px auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      >
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="請輸入密碼" 
          style={{ width: '100%', padding: '12px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none' }} 
        />
        {loginError && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '15px' }}>{loginError}</div>}
        <button 
          type="submit"
          style={{ width: '100%', padding: '12px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          登入
        </button>
      </form>
    </div>
  )

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>載入中...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ background: '#3D3D3D', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>VIVA SALON <span style={{ color: '#A68B6A' }}>後台管理</span></h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={fetchData} style={{ padding: '6px 12px', background: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🔄 重新整理</button>
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '6px', cursor: 'pointer' }}>登出</button>
        </div>
      </header>
      
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', overflowX: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '1200px', margin: '0 auto' }}>
          {tabGroups.map(group => (
            <div key={group.name} style={{ display: 'flex', gap: '4px', paddingRight: '12px', borderRight: '1px solid #eee' }}>
              {group.tabs.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id)} 
                  className={`admin-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                  style={{ 
                    padding: '10px 16px', 
                    background: activeTab === t.id ? '#A68B6A' : 'transparent', 
                    color: activeTab === t.id ? '#fff' : '#666', 
                    borderRadius: '8px', 
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {/* Header Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid var(--primary)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>今日預約</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text)' }}>{stats.todayBookings}</div>
                  <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 600 }}>組客戶</div>
                </div>
              </div>
              <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #10b981' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>今日預計營收</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>${stats.todayRevenue.toLocaleString()}</div>
                </div>
              </div>
              <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #f59e0b' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>待確認預約</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>{stats.pending}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 600 }}>需處理</div>
                </div>
              </div>
              <div className="admin-card" style={{ padding: '24px', borderLeft: '5px solid #3b82f6' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>註冊會員總數</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>{stats.totalUsers}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 600 }}>位會員</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
              {/* Today's Agenda */}
              <div className="admin-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📅</span> 今日預約清單
                  </h3>
                  <button 
                    onClick={() => setActiveTab('bookings')} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                  >
                    查看全部 →
                  </button>
                </div>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  {bookings.filter(b => b.date === today).length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fafafa', borderRadius: '12px', border: '2px dashed var(--gray)' }}>
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>☕</div>
                      <p style={{ color: 'var(--text-light)', margin: 0 }}>今天暫無預約，可以稍微放鬆一下！</p>
                    </div>
                  ) : (
                    bookings.filter(b => b.date === today).map(b => (
                      <div 
                        key={b.id} 
                        className="admin-table-row" 
                        style={{ 
                          padding: '16px', 
                          background: '#fff', 
                          borderRadius: '12px', 
                          border: '1px solid var(--gray)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px'
                        }}
                      >
                        <div style={{ width: '60px', textAlign: 'center', paddingRight: '16px', borderRight: '1px solid var(--gray)' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{b.time}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{b.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{b.service} - {b.staff_name || '未指定'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${b.status === 'confirmed' ? 'badge-success' : 'badge-outline'}`} style={{ fontSize: '11px' }}>
                            {b.status === 'confirmed' ? '已確認' : '待確認'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Insights Column */}
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Popular Services */}
                <div className="admin-card" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🔥</span> 熱門服務排行
                  </h3>
                  {popularServices.map(([name, count], idx) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: idx === popularServices.length - 1 ? 'none' : '1px solid #f9f9f9' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--text-light)' }}>{idx + 1}</div>
                      <div style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>{count} 次</div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="admin-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700, color: '#fff' }}>⚡ 快速操作</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={() => setActiveTab('bookings')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      新增預約
                    </button>
                    <button onClick={() => setActiveTab('inventory')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      管理庫存
                    </button>
                    <button onClick={() => setActiveTab('staff')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      更換班表
                    </button>
                    <button onClick={() => setActiveTab('settings')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      修改公告
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsTab bookings={bookings} orders={orders} reviews={reviews} />}

        {activeTab === 'orders' && <OrdersTab orders={orders} />}

        {activeTab === 'bookings' && (
          <BookingsTab 
            bookings={bookings} 
            staff={staff} 
            onUpdateStatus={updateStatus} 
            onUpdateBookingStaff={updateBookingStaff}
            onViewDetail={(b) => setSelectedBooking(b)}
          />
        )}

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

      {/* Global Booking Detail Modal */}
      {selectedBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setSelectedBooking(null)}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#A68B6A' }}>預約詳情 <span style={{ fontSize: '13px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>#{selectedBooking.ref}</span></h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            <div style={{ padding: '25px' }}>
              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong style={{ color: '#666' }}>📅 日期時間：</strong>{selectedBooking.date} {selectedBooking.time}</div>
                <div style={{ marginBottom: '12px', fontSize: '15px' }}><strong style={{ color: '#666' }}>✂️ 服務項目：</strong>{selectedBooking.service}</div>
                <div style={{ marginBottom: '15px', fontSize: '15px' }}>
                  <strong style={{ color: '#666' }}>💇 負責髮型師：</strong>
                  <select 
                    value={selectedBooking.staff_id || ''} 
                    onChange={async (e) => { 
                      await updateBookingStaff(selectedBooking.id, e.target.value); 
                      const s = staff.find(st => st.id.toString() === e.target.value);
                      setSelectedBooking({...selectedBooking, staff_id: parseInt(e.target.value), staff_name: s ? s.name : null}) 
                    }} 
                    style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">未分配</option>
                    {staff.map(s => <option key={s.id} value={s.id.toString()}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '15px' }}><strong style={{ color: '#666' }}>👤 客戶姓名：</strong>{selectedBooking.name}</div>
                  <div style={{ marginBottom: '15px', fontSize: '15px' }}><strong style={{ color: '#666' }}>📱 聯絡電話：</strong>{selectedBooking.phone}</div>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <div style={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#666' }}>🚩 預約狀態：</strong>
                    <select value={selectedBooking.status} onChange={async (e) => { await updateStatus(selectedBooking.id, e.target.value); setSelectedBooking({...selectedBooking, status: e.target.value}) }} style={{ marginLeft: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}>
                      <option value="pending">⏳ 待確認</option>
                      <option value="confirmed">✅ 已確認</option>
                      <option value="completed">🏆 已完成</option>
                      <option value="cancelled">❌ 已取消</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedBooking(null)} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', transition: 'all 0.2s' }}>關閉視窗</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

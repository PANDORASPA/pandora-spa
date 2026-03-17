'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState(null)
  const [userBookings, setUserBookings] = useState([])
  const [userOrders, setUserOrders] = useState([])

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const currentUser = localStorage.getItem('viva_current_user')
    if (currentUser) {
      const userData = JSON.parse(currentUser)
      setUser(userData)
      await fetchUserData(userData.id, userData.phone)
    }
  }

  const fetchUserData = async (userId, userPhone) => {
    // Fetch user's bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('phone', userPhone)
      .order('created_at', { ascending: false })
    
    if (bookings) setUserBookings(bookings)

    // Fetch user's orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (orders) setUserOrders(orders)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Check if email exists
    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existing) {
      setError('此電郵已註冊')
      setLoading(false)
      return
    }

    // Create new user
    const { data, error: insertError } = await supabase
      .from('users')
      .insert([{
        name,
        phone,
        email,
        password,
        points: 100,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) {
      setError('註冊失敗: ' + insertError.message)
      setLoading(false)
      return
    }

    // Auto login
    localStorage.setItem('viva_current_user', JSON.stringify(data))
    setUser(data)
    setSuccess('註冊成功！歡迎加入 VIVA HAIR！')
    setLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (error || !data) {
      setError('電郵或密碼錯誤')
      setLoading(false)
      return
    }

    localStorage.setItem('viva_current_user', JSON.stringify(data))
    setUser(data)
    await fetchUserData(data.id, data.phone)
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('viva_current_user')
    setUser(null)
    setUserBookings([])
    setUserOrders([])
    window.location.href = '/'
  }

  // Show user dashboard if logged in
  if (user) {
    return (
      <>
        <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px' }}>會員<span style={{ color: '#A68B6A' }}>中心</span></h1>
        </section>

        <section style={{ padding: '24px 16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* User Card */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#fff', margin: '0 auto 15px' }}>
                {user.name?.charAt(0) || '會員'}
              </div>
              <h2 style={{ marginBottom: '5px' }}>{user.name}</h2>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>{user.email}</p>
              <span style={{ display: 'inline-block', padding: '6px 16px', background: '#A68B6A', color: '#fff', borderRadius: '20px', fontSize: '14px' }}>
                💎 {user.points || 0} 積分
              </span>
            </div>

            {/* My Bookings */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>📅 我的預約</h3>
              {userBookings.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>暫時沒有預約記錄</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {userBookings.slice(0, 5).map(b => (
                    <div key={b.id} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{b.service}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{b.date} {b.time}</div>
                      </div>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: b.status === 'confirmed' ? '#dcfce7' : '#fef3c7', color: b.status === 'confirmed' ? '#16a34a' : '#d97706' }}>
                        {b.status === 'confirmed' ? '已確認' : '待確認'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {userBookings.length > 5 && (
                <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#666' }}>仲有 {userBookings.length - 5} 項記錄...</p>
              )}
            </div>

            {/* My Orders */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>🛍️ 我的訂單</h3>
              {userOrders.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>暫時沒有訂單記錄</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {userOrders.slice(0, 5).map(o => (
                    <div key={o.id} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{o.ref}</span>
                        <span style={{ color: '#A68B6A', fontWeight: 600 }}>${o.total}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{o.created_at?.split('T')[0]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logout */}
            <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#666', cursor: 'pointer', fontSize: '15px' }}>
              登出
            </button>
          </div>
        </section>
      </>
    )
  }

  // Login/Register form
  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>{isLogin ? '登入' : '註冊'}<span style={{ color: '#A68B6A' }}>帳戶</span></h1>
      </section>

      <section style={{ padding: '24px 16px' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          {success && <div style={{ padding: '12px', background: '#dcfce7', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>{success}</div>}
          {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

          {/* Toggle */}
          <div style={{ display: 'flex', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <button onClick={() => { setIsLogin(true); setError(''); setSuccess('') }} style={{ flex: 1, padding: '12px', background: isLogin ? '#A68B6A' : '#fff', color: isLogin ? '#fff' : '#666', border: 'none', cursor: 'pointer', fontWeight: 600 }}>登入</button>
            <button onClick={() => { setIsLogin(false); setError(''); setSuccess('') }} style={{ flex: 1, padding: '12px', background: !isLogin ? '#A68B6A' : '#fff', color: !isLogin ? '#fff' : '#666', border: 'none', cursor: 'pointer', fontWeight: 600 }}>註冊</button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            {!isLogin && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>姓名 *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required={!isLogin} placeholder="請輸入姓名" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>電話 *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required={!isLogin} placeholder="請輸入電話號碼" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>電郵 *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="請輸入電郵地址" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>密碼 *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="請輸入密碼" style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              {loading ? '處理中...' : (isLogin ? '登入' : '註冊')}
            </button>
          </form>
        </div>

        {/* Benefits */}
        <div style={{ maxWidth: '400px', margin: '30px auto', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px' }}>會員專享</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>🎫</div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>套票9折</div>
            </div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>💎</div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>積分換禮</div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

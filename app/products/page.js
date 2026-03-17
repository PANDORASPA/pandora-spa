'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

const CART_KEY = 'viva_cart'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['全部'])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    delivery: '門市自取',
    payment: '現金',
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const supabase = getBrowserClient()
        const [{ data: productsData }, authResult] = await Promise.all([
          supabase.from('products').select('*').eq('enabled', true).order('sort_order').order('id'),
          supabase.auth.getUser(),
        ])

        if (productsData) {
          setProducts(productsData)
          const nextCategories = Array.from(new Set(productsData.map((item) => item.category).filter(Boolean)))
          setCategories(['全部', ...nextCategories])
        }

        const authUser = authResult?.data?.user || null
        setUser(authUser)

        if (authUser) {
          const { data: profile } = await supabase
            .from('member_profiles')
            .select('full_name, phone')
            .eq('id', authUser.id)
            .single()

          setFormData((prev) => ({
            ...prev,
            name: profile?.full_name || prev.name,
            phone: profile?.phone || prev.phone,
          }))
        }
      } catch (error) {
        toast.error(error?.message || '讀取產品失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_KEY)
    if (!savedCart) return
    try {
      const parsed = JSON.parse(savedCart)
      if (Array.isArray(parsed)) setCart(parsed)
    } catch (error) {
      localStorage.removeItem(CART_KEY)
    }
  }, [])

  const persistCart = (nextCart) => {
    setCart(nextCart)
    localStorage.setItem(CART_KEY, JSON.stringify(nextCart))
  }

  const addToCart = (product) => {
    const nextCart = [...cart, { ...product, cartId: `${product.id}-${Date.now()}` }]
    persistCart(nextCart)
    toast.success('已加入購物車')
  }

  const removeFromCart = (cartId) => {
    persistCart(cart.filter((item) => item.cartId !== cartId))
  }

  const filteredProducts =
    activeCategory === '全部' ? products : products.filter((product) => product.category === activeCategory)

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0)

  const handleCheckout = () => {
    if (!user) {
      toast.error('請先登入會員再下單')
      setShowCheckout(false)
      return
    }
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('請先填寫姓名和電話')
      return
    }
    if (cart.length === 0) {
      toast.error('購物車是空的')
      return
    }
    if (!user) {
      toast.error('請先登入會員再下單')
      return
    }
    setCheckoutStep(2)
  }

  const ensureCustomerRecord = async (supabase) => {
    const phone = formData.phone.trim()
    const email = user?.email || null

    let existing = null
    if (phone) {
      const { data } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
      existing = data
    }

    if (!existing && email) {
      const { data } = await supabase.from('customers').select('id').eq('email', email).maybeSingle()
      existing = data
    }

    if (existing?.id) return existing.id

    const payload = {
      name: formData.name.trim(),
      phone,
      email,
    }

    const { data, error } = await supabase.from('customers').insert(payload).select('id').single()
    if (error) throw error
    return data?.id || null
  }

  const handlePlaceOrder = async () => {
    if (submitting) return
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('請先填寫姓名和電話')
      return
    }
    if (cart.length === 0) {
      toast.error('購物車是空的')
      return
    }

    setSubmitting(true)
    try {
      const supabase = getBrowserClient()
      await ensureCustomerRecord(supabase)
      const ref = `ORD${Date.now().toString().slice(-8)}`
      const items = cart.map((item) => `${item.name} x1`).join(', ')

      const payload = {
        ref,
        user_name: formData.name.trim(),
        items,
        total: cartTotal,
        delivery: formData.delivery,
        payment: formData.payment,
        address: formData.delivery === '送貨上門' ? formData.address.trim() : '',
        status: 'pending',
        member_user_id: user.id,
      }

      const { error } = await supabase.from('orders').insert(payload)
      if (error) throw error

      setOrderRef(ref)
      setOrderPlaced(true)
      setShowCheckout(false)
      setShowCart(false)
      setCheckoutStep(1)
      persistCart([])
      localStorage.removeItem(CART_KEY)
      toast.success('訂單已提交')
    } catch (error) {
      toast.error(`下單失敗: ${error?.message || '未知錯誤'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>
            產品<span style={{ color: '#A68B6A' }}>目錄</span>
          </h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  padding: '10px 20px',
                  background: activeCategory === category ? '#A68B6A' : '#fff',
                  color: activeCategory === category ? '#fff' : '#666',
                  border: '1px solid #e5e5e5',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '14px',
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {filteredProducts.map((product) => (
              <div key={product.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '12px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '120px',
                    background: 'linear-gradient(135deg, #FAF8F5, #f0ebe3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                  }}
                >
                  {product.emoji || '🧴'}
                </div>
                <div style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>{product.name}</h3>
                  <p style={{ fontSize: '11px', color: '#666', marginBottom: '8px', minHeight: '32px' }}>{product.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#A68B6A' }}>${product.price}</span>
                    <button
                      onClick={() => addToCart(product)}
                      style={{ padding: '8px 12px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      加入
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有產品</p>}
        </div>
      </section>

      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <button
            onClick={() => setShowCart(true)}
            style={{ padding: '14px 20px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 600 }}
          >
            購物車 ({cart.length})
          </button>
        </div>
      )}

      {showCart && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}
          onClick={() => setShowCart(false)}
        >
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', maxWidth: '420px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>購物車 ({cart.length})</h3>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {cart.map((item) => (
              <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#A68B6A' }}>${item.price}</div>
                </div>
                <button onClick={() => removeFromCart(item.cartId)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>
                  刪除
                </button>
              </div>
            ))}

            <div style={{ fontSize: '18px', fontWeight: 700, textAlign: 'right', margin: '16px 0' }}>總計: ${cartTotal}</div>
            <button onClick={() => { if (!user) { toast.error('請先登入會員再下單'); return } setShowCart(false); setShowCheckout(true) }} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              前往結帳
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300, padding: '20px' }}
          onClick={() => setShowCheckout(false)}
        >
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '100%' }} onClick={(event) => event.stopPropagation()}>
            {checkoutStep === 1 ? (
              <>
                <h3 style={{ marginBottom: '20px' }}>結帳資料</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>姓名 *</label>
                  <input type="text" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>電話 *</label>
                  <input type="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>送貨方式</label>
                  <select value={formData.delivery} onChange={(event) => setFormData({ ...formData, delivery: event.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                    <option>門市自取</option>
                    <option>送貨上門</option>
                  </select>
                </div>
                {formData.delivery === '送貨上門' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>送貨地址</label>
                    <input type="text" value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                )}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>付款方式</label>
                  <select value={formData.payment} onChange={(event) => setFormData({ ...formData, payment: event.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                    <option>現金</option>
                    <option>信用卡</option>
                    <option>PayMe</option>
                    <option>轉數快</option>
                  </select>
                </div>
                <button onClick={handleCheckout} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  確認訂單
                </button>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>確認訂單</h3>
                <div style={{ background: '#FAF8F5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p><strong>顧客:</strong> {formData.name}</p>
                  <p><strong>電話:</strong> {formData.phone}</p>
                  <p><strong>送貨:</strong> {formData.delivery}</p>
                  {formData.address ? <p><strong>地址:</strong> {formData.address}</p> : null}
                  <p><strong>付款:</strong> {formData.payment}</p>
                  <p><strong>項目:</strong> {cart.map((item) => item.name).join(', ')}</p>
                  <p><strong>總計:</strong> ${cartTotal}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setCheckoutStep(1)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    返回
                  </button>
                  <button onClick={handlePlaceOrder} disabled={submitting} style={{ flex: 1, padding: '12px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? '提交中...' : '確認付款'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {orderPlaced && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 400, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', textAlign: 'center', maxWidth: '350px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✓</div>
            <h2 style={{ color: '#A68B6A', marginBottom: '10px' }}>訂單成功</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>訂單編號: <strong>{orderRef}</strong></p>
            <Link href="/" style={{ display: 'block', padding: '12px', background: '#A68B6A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
              返回首頁
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

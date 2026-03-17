'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['全部'])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [user, setUser] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    delivery: '門市取貨',
    payment: '現金'
  })

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      const { data } = await supabase.from('products').select('*').eq('enabled', true).order('id')
      
      if (data && data.length > 0) {
        setProducts(data)
        const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))]
        setCategories(['全部', ...uniqueCategories])
      }
      setLoading(false)
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    const savedCart = localStorage.getItem('viva_cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
    
    const currentUser = localStorage.getItem('viva_current_user')
    if (currentUser) {
      const userData = JSON.parse(currentUser)
      setUser(userData)
      setFormData(prev => ({ ...prev, name: userData.name || '', phone: userData.phone || '' }))
    }
  }, [])

  const filteredProducts = activeCategory === '全部' 
    ? products 
    : products.filter(p => p.category === activeCategory)

  const addToCart = (product) => {
    const newCart = [...cart, { ...product, cartId: Date.now() }]
    setCart(newCart)
    localStorage.setItem('viva_cart', JSON.stringify(newCart))
  }

  const removeFromCart = (cartId) => {
    const newCart = cart.filter(item => item.cartId !== cartId)
    setCart(newCart)
    localStorage.setItem('viva_cart', JSON.stringify(newCart))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0), 0)

  const handleCheckout = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('請填寫姓名和電話')
      return
    }

    setCheckoutStep(2)
  }

  const handlePlaceOrder = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('請填寫姓名和電話')
      return
    }

    const orderItems = cart.map(item => `${item.name} x1`).join(', ')
    
    const { data, error } = await supabase.from('orders').insert([{
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      delivery: formData.delivery,
      payment: formData.payment,
      product_name: orderItems,
      total: cartTotal,
      status: 'pending',
      created_at: new Date().toISOString()
    }]).select()

    if (error) {
      alert('落單失敗: ' + error.message)
      return
    }

    setOrderRef('ORD' + Date.now().toString().slice(-6))
    setOrderPlaced(true)
    setCart([])
    setShowCheckout(false)
    localStorage.removeItem('viva_cart')
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>產品<span style={{ color: '#A68B6A' }}>目錄</span></h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '10px 20px', background: activeCategory === cat ? '#A68B6A' : '#fff', color: activeCategory === cat ? '#fff' : '#666', border: '1px solid #e5e5e5', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            {filteredProducts.map(product => (
              <div key={product.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #FAF8F5, #f0ebe3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                  {product.emoji || '💄'}
                </div>
                <div style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>{product.name}</h3>
                  <p style={{ fontSize: '11px', color: '#666', marginBottom: '8px', minHeight: '32px' }}>{product.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#A68B6A' }}>${product.price}</span>
                      {product.orig > product.price && <span style={{ fontSize: '12px', color: '#999', textDecoration: 'line-through', marginLeft: '6px' }}>${product.orig}</span>}
                    </div>
                    <button onClick={() => addToCart(product)} style={{ padding: '8px 12px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>加入</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有產品</p>
          )}
        </div>
      </section>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <button onClick={() => setShowCart(true)} style={{ padding: '14px 20px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 600 }}>
            🛒 購物車 ({cart.length})
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }} onClick={() => setShowCart(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', maxWidth: '400px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>購物車 ({cart.length})</h3>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            {cart.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999' }}>購物車係空既</p>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  {cart.map(item => (
                    <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#A68B6A' }}>${item.price}</div>
                      </div>
                      <button onClick={() => removeFromCart(item.cartId)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>刪除</button>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, textAlign: 'right', marginBottom: '16px' }}>
                  總計: ${cartTotal}
                </div>
                <button onClick={() => { setShowCart(false); setShowCheckout(true) }} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  前往結帳
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300, padding: '20px' }} onClick={() => setShowCheckout(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '100%' }} onClick={e => e.stopPropagation()}>
            {checkoutStep === 1 ? (
              <>
                <h3 style={{ marginBottom: '20px' }}>結帳資料</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>姓名 *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>電話 *</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>送貨方式</label>
                  <select value={formData.delivery} onChange={e => setFormData({...formData, delivery: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                    <option>門市取貨</option>
                    <option>送貨上門</option>
                  </select>
                </div>
                {formData.delivery === '送貨上門' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>送貨地址</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                )}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>付款方式</label>
                  <select value={formData.payment} onChange={e => setFormData({...formData, payment: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}>
                    <option>現金</option>
                    <option>信用卡</option>
                    <option>PayMe</option>
                    <option>轉數快</option>
                  </select>
                </div>
                <div style={{ background: '#FAF8F5', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                    <span>貨品總數:</span>
                    <span>{cart.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
                    <span>總計:</span>
                    <span style={{ color: '#A68B6A' }}>${cartTotal}</span>
                  </div>
                </div>
                <button onClick={handleCheckout} style={{ width: '100%', padding: '14px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  確認訂單
                </button>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>確認訂單</h3>
                <div style={{ background: '#FAF8F5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ marginBottom: '8px' }}><strong>客戶:</strong> {formData.name}</p>
                  <p style={{ marginBottom: '8px' }}><strong>電話:</strong> {formData.phone}</p>
                  <p style={{ marginBottom: '8px' }}><strong>送貨:</strong> {formData.delivery}</p>
                  {formData.address && <p style={{ marginBottom: '8px' }}><strong>地址:</strong> {formData.address}</p>}
                  <p style={{ marginBottom: '8px' }}><strong>付款:</strong> {formData.payment}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setCheckoutStep(1)} style={{ flex: 1, padding: '12px', background: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>返回</button>
                  <button onClick={handlePlaceOrder} style={{ flex: 1, padding: '12px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>確認付款</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order Success */}
      {orderPlaced && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 400, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', textAlign: 'center', maxWidth: '350px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#A68B6A', marginBottom: '10px' }}>訂單成功！</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>訂單編號: <strong>{orderRef}</strong></p>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>我哋會盡快聯繫你確認訂單</p>
            <Link href="/" style={{ display: 'block', padding: '12px', background: '#A68B6A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>返回首頁</Link>
          </div>
        </div>
      )}
    </>
  )
}

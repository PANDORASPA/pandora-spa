'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const CART_KEY = 'viva_cart'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(['全部'])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderRef, setOrderRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    delivery: '門市自取',
    payment: '現金',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data }, authRes] = await Promise.all([
        supabase.from('products').select('*').eq('enabled', true).order('id'),
        supabase.auth.getUser(),
      ])

      setProducts(data || [])
      const uniqueCategories = [...new Set((data || []).map((item) => item.category).filter(Boolean))]
      setCategories(['全部', ...uniqueCategories])

      const user = authRes?.data?.user || null
      setAuthUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('member_profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle()

        setFormData((current) => ({
          ...current,
          name: profile?.full_name || current.name,
          phone: profile?.phone || current.phone,
        }))
      }

      setLoading(false)
    }

    load()

    const savedCart = localStorage.getItem(CART_KEY)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch {
        localStorage.removeItem(CART_KEY)
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null
      setAuthUser(user)

      if (!user) {
        return
      }

      const { data: profile } = await supabase
        .from('member_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      setFormData((current) => ({
        ...current,
        name: profile?.full_name || current.name,
        phone: profile?.phone || current.phone,
      }))
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  const filteredProducts = useMemo(() => {
    if (activeCategory === '全部') return products
    return products.filter((item) => item.category === activeCategory)
  }, [activeCategory, products])

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [cart]
  )

  const addToCart = (product) => {
    setCart((current) => [...current, { ...product, cartId: Date.now() + Math.random() }])
    toast.success(`${product.name} 已加入購物車`)
  }

  const removeFromCart = (cartId) => {
    setCart((current) => current.filter((item) => item.cartId !== cartId))
  }

  const handleCheckout = () => {
    if (!formData.name || !formData.phone) {
      toast.error('請先填寫姓名和電話')
      return
    }

    if (formData.delivery === '送貨上門' && !formData.address.trim()) {
      toast.error('送貨訂單需要填寫地址')
      return
    }

    setCheckoutStep(2)
  }

  const handlePlaceOrder = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('請先填寫姓名和電話')
      return
    }

    if (cart.length === 0) {
      toast.error('購物車是空的')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          delivery: formData.delivery,
          payment: formData.payment,
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price || 0),
          })),
          total: cartTotal,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Order failed')
      }

      setOrderRef(payload?.ref || '')
      setOrderPlaced(true)
      setCart([])
      setShowCheckout(false)
      setCheckoutStep(1)
      localStorage.removeItem(CART_KEY)
      toast.success('訂單已提交，我們會盡快跟進')
    } catch (error) {
      toast.error(`下單失敗: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '32px 16px', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D', marginBottom: '10px' }}>
            精選
            <span style={{ color: '#A68B6A' }}>產品</span>
          </h1>
          <p style={{ color: '#666', lineHeight: 1.7 }}>
            購物車只會暫存在你的裝置內，會員身份與聯絡資料則只會從登入帳戶和 member profile 讀取。
          </p>
        </div>
      </section>

      <section style={{ padding: '24px 12px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              overflowX: 'auto',
              paddingBottom: '10px',
            }}
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  background: '#fff',
                  border: '1px solid #E8E0D5',
                  borderRadius: '14px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '140px',
                    background: 'linear-gradient(135deg, #FAF8F5, #f0ebe3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                  }}
                >
                  {product.emoji || '🧴'}
                </div>
                <div style={{ padding: '14px' }}>
                  <h3 style={{ fontSize: '15px', marginBottom: '6px', fontWeight: 700 }}>{product.name}</h3>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px', minHeight: '36px' }}>
                    {product.description || '日常護理與造型用產品。'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#A68B6A' }}>
                        {formatCurrency(product.price)}
                      </span>
                      {Number(product.orig) > Number(product.price) && (
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#999',
                            textDecoration: 'line-through',
                            marginLeft: '6px',
                          }}
                        >
                          {formatCurrency(product.orig)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      style={{
                        padding: '8px 12px',
                        background: '#A68B6A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      加入
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有上架產品</p>
          )}
        </div>
      </section>

      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
          <button
            type="button"
            onClick={() => setShowCart(true)}
            style={{
              padding: '14px 20px',
              background: '#A68B6A',
              color: '#fff',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            購物車 ({cart.length})
          </button>
        </div>
      )}

      {showCart && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 200,
          }}
          onClick={() => setShowCart(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '420px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>購物車 ({cart.length})</h3>
              <button type="button" onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#A68B6A' }}>{formatCurrency(item.price)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.cartId)}
                    style={{
                      background: '#fef2f2',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '18px', fontWeight: 700, textAlign: 'right', marginBottom: '16px' }}>
              總計: {formatCurrency(cartTotal)}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCart(false)
                setShowCheckout(true)
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: '#A68B6A',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              前往結帳
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 220,
          }}
          onClick={() => setShowCheckout(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '92%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0 }}>購物結帳</h3>
              <button type="button" onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {checkoutStep === 1 && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  placeholder="姓名"
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <input
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="電話"
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <select
                  value={formData.delivery}
                  onChange={(event) => setFormData((current) => ({ ...current, delivery: event.target.value }))}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="門市自取">門市自取</option>
                  <option value="送貨上門">送貨上門</option>
                </select>
                {formData.delivery === '送貨上門' && (
                  <textarea
                    value={formData.address}
                    onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                    placeholder="送貨地址"
                    rows={3}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }}
                  />
                )}
                <select
                  value={formData.payment}
                  onChange={(event) => setFormData((current) => ({ ...current, payment: event.target.value }))}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="現金">現金</option>
                  <option value="FPS">FPS</option>
                  <option value="銀行轉帳">銀行轉帳</option>
                </select>
                <button
                  type="button"
                  onClick={handleCheckout}
                  style={{
                    marginTop: '8px',
                    padding: '14px',
                    background: '#A68B6A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  下一步
                </button>
              </div>
            )}

            {checkoutStep === 2 && (
              <div>
                <div style={{ background: '#FAF8F5', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
                    <div><strong>姓名:</strong> {formData.name}</div>
                    <div><strong>電話:</strong> {formData.phone}</div>
                    <div><strong>送貨方式:</strong> {formData.delivery}</div>
                    {formData.delivery === '送貨上門' && <div><strong>地址:</strong> {formData.address}</div>}
                    <div><strong>付款方式:</strong> {formData.payment}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ marginBottom: '10px' }}>訂單內容</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {cart.map((item) => (
                      <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span>{item.name}</span>
                        <strong>{formatCurrency(item.price)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', textAlign: 'right' }}>
                  總計: {formatCurrency(cartTotal)}
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    style={{
                      padding: '14px',
                      background: submitting ? '#c9b8a1' : '#A68B6A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {submitting ? '提交中...' : '確認下單'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep(1)}
                    style={{
                      padding: '12px',
                      background: '#fff',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    返回修改
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {orderPlaced && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 240,
          }}
          onClick={() => setOrderPlaced(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              padding: '28px',
              maxWidth: '420px',
              width: '92%',
              textAlign: 'center',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: '44px', marginBottom: '10px' }}>✅</div>
            <h3 style={{ marginBottom: '8px' }}>訂單已建立</h3>
            <p style={{ color: '#666', lineHeight: 1.7, marginBottom: '16px' }}>
              我們已收到你的訂單，店舖會按你選擇的送貨或自取方式跟進。
            </p>
            {orderRef && (
              <p style={{ fontWeight: 700, color: '#A68B6A', marginBottom: '18px' }}>
                訂單編號: {orderRef}
              </p>
            )}
            <div style={{ display: 'grid', gap: '10px' }}>
              <Link
                href="/account"
                style={{
                  display: 'block',
                  padding: '12px',
                  background: '#A68B6A',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                前往會員中心
              </Link>
              <button
                type="button"
                onClick={() => setOrderPlaced(false)}
                style={{
                  padding: '12px',
                  background: '#fff',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                繼續瀏覽
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

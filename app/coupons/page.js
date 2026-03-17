'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadCoupons() {
      setLoading(true)
      try {
        const supabase = getBrowserClient()
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('enabled', true)
          .order('id')

        if (error) throw error
        setCoupons(data || [])
      } catch (error) {
        toast.error(error?.message || '讀取優惠券失敗')
      } finally {
        setLoading(false)
      }
    }

    loadCoupons()
  }, [])

  const handleApply = () => {
    const code = appliedCoupon.trim().toUpperCase()
    const coupon = coupons.find((item) => item.code?.toUpperCase() === code)
    if (!coupon) {
      setMessage('優惠碼無效')
      return
    }
    setMessage(`已選擇優惠：${coupon.name || coupon.code}`)
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>
          優惠<span style={{ color: '#A68B6A' }}>Coupons</span>
        </h1>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>輸入優惠碼</h3>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <input
                type="text"
                value={appliedCoupon}
                onChange={(event) => setAppliedCoupon(event.target.value)}
                placeholder="請輸入優惠碼"
                style={{ flex: 1, padding: '14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
              />
              <button onClick={handleApply} style={{ padding: '14px 24px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
                驗證
              </button>
            </div>
            {message ? <p style={{ marginTop: '10px', color: message.includes('無效') ? '#ef4444' : '#16a34a', fontSize: '14px' }}>{message}</p> : null}
            {appliedCoupon.trim() ? (
              <Link href={`/booking?coupon=${encodeURIComponent(appliedCoupon.trim().toUpperCase())}`} style={{ display: 'inline-block', marginTop: '12px', color: '#A68B6A', fontWeight: 700 }}>
                帶著此優惠去預約
              </Link>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {coupons.map((coupon) => {
              const desc = coupon.type === 'percent' ? `${coupon.discount}% off` : `$${coupon.discount} off`
              const validUntil = coupon.end_date ? String(coupon.end_date).slice(0, 10) : '長期有效'

              return (
                <div key={coupon.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '2px dashed #A68B6A', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#A68B6A' }}>{desc}</h3>
                    <p style={{ fontWeight: 600, marginTop: '4px' }}>{coupon.name || coupon.code}</p>
                    <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>代碼: {coupon.code}</p>
                    <p style={{ color: '#999', fontSize: '11px', marginTop: '4px' }}>有效期至: {validUntil}</p>
                  </div>
                  <Link href={`/booking?coupon=${encodeURIComponent(coupon.code)}`} style={{ padding: '12px 24px', background: '#A68B6A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px', width: '100%', textAlign: 'center' }}>
                    立即使用
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('coupons').select('*').eq('enabled', true).order('id')
      setCoupons(data || [])
      setLoading(false)
    }

    load()
  }, [])

  const handleApply = () => {
    const coupon = coupons.find((item) => item.code === appliedCoupon.toUpperCase())
    if (coupon) {
      setMessage(`已找到優惠：${coupon.name}`)
    } else {
      setMessage('找不到此優惠碼')
    }
  }

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>
          優惠<span style={{ color: '#A68B6A' }}>碼</span>
        </h1>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>測試優惠碼</h3>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <input type="text" value={appliedCoupon} onChange={(e) => setAppliedCoupon(e.target.value)} placeholder="輸入優惠碼" style={{ flex: 1, padding: '14px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
              <button onClick={handleApply} style={{ padding: '14px 24px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '15px' }}>
                套用
              </button>
            </div>
            {message && <p style={{ marginTop: '10px', color: message.includes('已找到') ? '#34d399' : '#ef4444', fontSize: '14px' }}>{message}</p>}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>載入中...</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {coupons.map((coupon) => (
                <div key={coupon.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '2px dashed #A68B6A', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#A68B6A' }}>{coupon.type === 'percent' ? `${coupon.discount}%` : `$${coupon.discount}`}</h3>
                    <p style={{ fontWeight: 600, marginTop: '4px' }}>{coupon.name}</p>
                    <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{coupon.description || coupon.code}</p>
                    {coupon.end_date && <p style={{ color: '#999', fontSize: '11px', marginTop: '4px' }}>有效至：{coupon.end_date}</p>}
                  </div>
                  <button onClick={() => { setAppliedCoupon(coupon.code); setMessage(`已載入優惠碼：${coupon.code}`) }} style={{ padding: '12px 24px', background: '#A68B6A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', width: '100%' }}>
                    使用此優惠碼
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

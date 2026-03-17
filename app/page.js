'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '../lib/supabase/browser'

export default function HomePage() {
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true)

      try {
        const supabase = getBrowserClient()
        const [servicesResult, packagesResult] = await Promise.all([
          supabase.from('services').select('*').eq('enabled', true).order('sort_order').limit(3),
          supabase.from('service_packages').select('*').eq('enabled', true).order('id').limit(3),
        ])

        setServices(servicesResult.data || [])
        setPackages(packagesResult.data || [])
      } catch (error) {
        setServices([])
        setPackages([])
      } finally {
        setLoading(false)
      }
    }

    loadHomeData()
  }, [])

  return (
    <>
      <section style={{ padding: '72px 20px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '12px' }}>VIVA HAIR</h1>
        <p style={{ color: '#666', maxWidth: '620px', margin: '0 auto 24px' }}>
          預約、會員中心與管理後台已分流。前台只保留一般客人需要的操作入口。
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/booking"
            style={{ padding: '14px 26px', borderRadius: '10px', background: '#A68B6A', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
          >
            立即預約
          </Link>
          <Link
            href="/services"
            style={{ padding: '14px 26px', borderRadius: '10px', background: '#fff', color: '#333', textDecoration: 'none', fontWeight: 700, border: '1px solid #ddd' }}
          >
            查看服務
          </Link>
        </div>
      </section>

      <section style={{ padding: '40px 16px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>熱門服務</h2>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>載入中...</p>
          ) : services.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>目前沒有可顯示服務。</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              {services.map((service) => (
                <div key={service.id} className="admin-card" style={{ padding: '24px' }}>
                  <h3 style={{ marginTop: 0 }}>{service.name}</h3>
                  <div style={{ color: '#666', marginBottom: '8px' }}>{service.time || 60} 分鐘</div>
                  <div style={{ color: '#A68B6A', fontWeight: 800, marginBottom: '12px' }}>${service.price}</div>
                  <p style={{ color: '#666', lineHeight: 1.6 }}>{service.description || '專業髮型服務。'}</p>
                  <Link href={`/booking?serviceId=${service.id}`} style={{ display: 'inline-block', marginTop: '12px', color: '#A68B6A', fontWeight: 700 }}>
                    預約此服務
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: '40px 16px', background: '#fff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>服務套餐</h2>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#666' }}>載入中...</p>
          ) : packages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>目前沒有可顯示套餐。</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              {packages.map((item) => (
                <div key={item.id} className="admin-card" style={{ padding: '24px', border: '2px solid #A68B6A' }}>
                  <h3 style={{ marginTop: 0 }}>{item.name}</h3>
                  <div style={{ color: '#A68B6A', fontWeight: 800, fontSize: '26px', marginBottom: '12px' }}>${item.price}</div>
                  <p style={{ color: '#666', lineHeight: 1.6 }}>{item.description || '套餐內容請向店舖查詢。'}</p>
                  <Link href="/booking" style={{ display: 'inline-block', marginTop: '12px', color: '#A68B6A', fontWeight: 700 }}>
                    預約此套餐
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: '32px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '14px' }}>店舖資訊</h2>
          <p style={{ color: '#666', marginBottom: '8px' }}>歡迎透過會員系統預約服務，或登入會員中心查看自己的預約紀錄。</p>
          <p style={{ color: '#666' }}>如需管理後台，請直接前往獨立網址 `/admin/login`。</p>
        </div>
      </section>
    </>
  )
}

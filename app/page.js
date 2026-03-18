'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [gallery, setGallery] = useState([])
  const [settings, setSettings] = useState({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [servicesRes, packagesRes, galleryRes, settingsRes] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order').limit(6),
        supabase.from('service_packages').select('*').eq('enabled', true).order('id').limit(4),
        supabase.from('before_after').select('*').eq('enabled', true).order('created_at', { ascending: false }).limit(6),
        supabase.from('settings').select('*'),
      ])

      setServices(servicesRes.data || [])
      setPackages(packagesRes.data || [])
      setGallery(galleryRes.data || [])
      setSettings(
        (settingsRes.data || []).reduce((acc, row) => {
          acc[row.key] = row.value
          return acc
        }, {})
      )
      setLoading(false)
    }

    load()
  }, [])

  return (
    <>
      <section
        style={{
          padding: '56px 16px',
          background: 'linear-gradient(135deg, #f4efe8 0%, #efe4d5 100%)',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '999px', background: '#fff', color: '#8B7355', fontWeight: 700, marginBottom: '14px' }}>
              線上預約已全面改用會員流程
            </div>
            <h1 style={{ fontSize: '42px', lineHeight: 1.1, marginBottom: '14px', color: '#2f2a24' }}>VIVA HAIR</h1>
            <p style={{ color: '#5f584e', fontSize: '16px', lineHeight: 1.7, marginBottom: '20px' }}>
              集中處理服務選擇、預約時段、會員資料與後台設定，讓前台與營運資料都回到同一條正式流程。
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/booking" style={{ padding: '14px 22px', background: '#8B7355', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 800 }}>
                立即預約
              </Link>
              <Link href="/services" style={{ padding: '14px 22px', background: '#fff', color: '#8B7355', borderRadius: '12px', textDecoration: 'none', fontWeight: 800, border: '1px solid #d8cab6' }}>
                查看服務
              </Link>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '22px', padding: '24px', boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 800, marginBottom: '12px', color: '#2f2a24' }}>店舖資訊</div>
            <div style={{ display: 'grid', gap: '12px', color: '#5f584e', fontSize: '15px' }}>
              <div>店名：{settings.shop_name || 'VIVA HAIR'}</div>
              <div>地址：{settings.address || '請到後台設定店舖地址'}</div>
              <div>聯絡：{settings.phone || '請到後台設定聯絡電話'}</div>
              <div>營業時間：{settings.business_hours || '11:00 - 20:00'}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '32px 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '24px', margin: 0 }}>人氣服務</h2>
            <Link href="/services" style={{ color: '#8B7355', fontWeight: 700, textDecoration: 'none' }}>
              查看全部
            </Link>
          </div>

          {loading ? (
            <p style={{ color: '#777' }}>載入中...</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {services.map((service) => (
                <div key={service.id} style={{ background: '#fff', borderRadius: '18px', padding: '20px', border: '1px solid #eee' }}>
                  <div style={{ fontSize: '34px', marginBottom: '10px' }}>{service.emoji || '✂️'}</div>
                  <div style={{ fontWeight: 800, marginBottom: '6px' }}>{service.name}</div>
                  <div style={{ color: '#777', fontSize: '14px', marginBottom: '10px' }}>{service.time || 60} 分鐘</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#8B7355', marginBottom: '12px' }}>{formatCurrency(service.price)}</div>
                  <Link href="/booking" style={{ display: 'inline-block', padding: '10px 14px', background: '#8B7355', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700 }}>
                    預約
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {packages.length > 0 && (
        <section style={{ padding: '32px 16px', background: '#FAF8F5' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '18px' }}>服務套票</h2>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {packages.map((item) => (
                <div key={item.id} style={{ background: '#fff', borderRadius: '18px', padding: '20px', border: '1px solid #eadfce' }}>
                  <div style={{ fontWeight: 800, marginBottom: '8px' }}>{item.name}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#8B7355', marginBottom: '10px' }}>{formatCurrency(item.price)}</div>
                  <div style={{ color: '#666', fontSize: '14px', lineHeight: 1.6 }}>{item.description || '詳情可於預約前向店舖查詢。'}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section style={{ padding: '32px 16px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '18px' }}>作品參考</h2>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {gallery.map((item) => (
                <div key={item.id} style={{ overflow: 'hidden', borderRadius: '16px', background: '#f6f6f6' }}>
                  <img src={item.image_url} alt={item.title || '作品'} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  {item.title && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#555' }}>{item.title}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const heroStats = [
  { label: '會員預約', value: 'Online' },
  { label: '營業時段', value: '11:00-20:00' },
  { label: '流程', value: '3 Steps' },
]

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
        }, {}),
      )
      setLoading(false)
    }

    load()
  }, [])

  const businessHours = settings.business_hours || '11:00 - 20:00'

  return (
    <>
      <section className="vh-hero">
        <div className="vh-container vh-hero-grid">
          <div className="vh-hero-copy">
            <span className="vh-eyebrow">Hair care, softly arranged</span>
            <h1>以清爽節奏，安排你的髮型時光。</h1>
            <p>
              VIVA HAIR 提供線上預約、會員資料與服務時間查詢。先選服務供應者，再揀日期與可預約時段，流程簡單清楚。
            </p>
            <div className="vh-action-row">
              <Link href="/booking" className="vh-btn vh-btn-primary">
                立即預約
              </Link>
              <Link href="/services" className="vh-btn vh-btn-secondary">
                查看服務
              </Link>
            </div>
            <div className="vh-stat-row">
              {heroStats.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vh-salon-card">
            <div className="vh-card-orb" />
            <span className="vh-eyebrow">Salon information</span>
            <h2>{settings.shop_name || 'VIVA HAIR'}</h2>
            <dl>
              <div>
                <dt>地址</dt>
                <dd>{settings.address || '請於後台設定店舖地址'}</dd>
              </div>
              <div>
                <dt>電話</dt>
                <dd>{settings.phone || '請於後台設定聯絡電話'}</dd>
              </div>
              <div>
                <dt>營業時間</dt>
                <dd>{businessHours}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          <div className="vh-section-head">
            <div>
              <span className="vh-eyebrow">Services</span>
              <h2>人氣服務</h2>
            </div>
            <Link href="/services" className="vh-text-link">
              查看全部
            </Link>
          </div>

          {loading ? (
            <p className="vh-muted">載入服務中...</p>
          ) : (
            <div className="vh-card-grid">
              {services.map((service) => (
                <article key={service.id} className="vh-service-card">
                  <div className="vh-service-icon">{service.emoji || '✂'}</div>
                  <h3>{service.name}</h3>
                  <p>{service.description || '專業髮型服務，適合日常整理與造型更新。'}</p>
                  <div className="vh-service-meta">
                    <span>{service.time || 60} 分鐘</span>
                    <strong>{formatCurrency(service.price)}</strong>
                  </div>
                  <Link href="/booking" className="vh-card-cta">
                    預約
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {packages.length > 0 && (
        <section className="vh-section vh-section-tint">
          <div className="vh-container">
            <div className="vh-section-head">
              <div>
                <span className="vh-eyebrow">Packages</span>
                <h2>服務套票</h2>
              </div>
            </div>
            <div className="vh-card-grid">
              {packages.map((item) => (
                <article key={item.id} className="vh-package-card">
                  <h3>{item.name}</h3>
                  <strong>{formatCurrency(item.price)}</strong>
                  <p>{item.description || '詳情可於預約前向店舖查詢。'}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="vh-section">
          <div className="vh-container">
            <div className="vh-section-head">
              <div>
                <span className="vh-eyebrow">Gallery</span>
                <h2>作品參考</h2>
              </div>
            </div>
            <div className="vh-gallery-grid">
              {gallery.map((item) => (
                <figure key={item.id} className="vh-gallery-card">
                  <img src={item.image_url} alt={item.title || '髮型作品'} />
                  {item.title ? <figcaption>{item.title}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

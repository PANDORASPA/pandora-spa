'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('zh-HK')}`

const heroStats = [
  { label: '全自助頭皮護理', value: 'Self Care' },
  { label: '網上預約與套票', value: 'Member' },
  { label: '安靜放鬆流程', value: 'Head Spa' },
]

const flowSteps = [
  {
    title: '了解頭皮狀態',
    body: '按需要選擇頭皮檢測、深層潔淨或養護服務，讓護理節奏貼近日常狀態。',
  },
  {
    title: '自助護理體驗',
    body: '以乾淨、安靜、清晰的流程完成頭皮潔淨與放鬆，適合日常保養與定期護理。',
  },
  {
    title: '會員套票管理',
    body: '購買套票後可用 Stripe 或人工確認付款，完成後即可於預約時扣次使用。',
  },
]

const normalizePublicSettings = (payload) => payload?.settings || {}

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([])
  const [tickets, setTickets] = useState([])
  const [settings, setSettings] = useState({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [servicesRes, ticketsRes, settingsRes] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order').limit(6),
        supabase.from('tickets').select('*').eq('enabled', true).order('id').limit(3),
        fetch('/api/public/settings', { cache: 'no-store' }).then((response) => response.json()).catch(() => ({})),
      ])

      setServices(servicesRes.data || [])
      setTickets(ticketsRes.data || [])
      setSettings(normalizePublicSettings(settingsRes))
      setLoading(false)
    }

    load()
  }, [])

  const businessHours = settings.business_hours || '11:00 - 20:00'
  const shopName = settings.shop_name || 'PANDORA HEAD SPA'
  const phone = settings.whatsapp || settings.phone || ''
  const mapUrl = settings.google_map_url || ''

  return (
    <>
      <section className="vh-hero">
        <div className="vh-container vh-hero-grid">
          <div className="vh-hero-copy">
            <span className="vh-eyebrow">Pandora Head Spa</span>
            <h1>PANDORA HEAD SPA 全自助頭皮護理中心</h1>
            <p>
              以安靜、乾淨、柔和的 head spa 節奏，提供頭皮檢測、深層潔淨、放鬆養生與會員套票預約。
              客人可先購買套票，付款確認後於預約時直接扣次使用。
            </p>
            <div className="vh-action-row">
              <Link href="/booking" className="vh-btn vh-btn-primary">
                立即預約
              </Link>
              <Link href="/services" className="vh-btn vh-btn-secondary">
                查看頭皮護理服務
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

          <div className="vh-info-card vh-headspa-card">
            <span className="vh-eyebrow">Calm scalp ritual</span>
            <h2>{shopName}</h2>
            <p className="vh-muted">店舖資料、聯絡方式、營業時間與社交連結可於後台設定，即時同步到前台主要入口。</p>
            <dl>
              <div>
                <dt>地址</dt>
                <dd>{settings.address || '店舖地址待後台設定'}</dd>
              </div>
              <div>
                <dt>電話 / WhatsApp</dt>
                <dd>{phone || '聯絡電話待後台設定'}</dd>
              </div>
              <div>
                <dt>營業時間</dt>
                <dd>{businessHours}</dd>
              </div>
            </dl>
            {mapUrl ? (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="vh-text-link">
                開啟 Google Map
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          <div className="vh-section-head">
            <div>
              <span className="vh-eyebrow">How it works</span>
              <h2>頭皮護理流程</h2>
            </div>
          </div>
          <div className="vh-card-grid vh-flow-grid">
            {flowSteps.map((step, index) => (
              <article key={step.title} className="vh-service-card">
                <div className="vh-service-icon">{String(index + 1).padStart(2, '0')}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vh-section vh-section-tint">
        <div className="vh-container">
          <div className="vh-section-head">
            <div>
              <span className="vh-eyebrow">Scalp care</span>
              <h2>熱門頭皮護理服務</h2>
            </div>
            <Link href="/services" className="vh-text-link">
              查看全部
            </Link>
          </div>

          {loading ? (
            <p className="vh-muted">正在載入服務...</p>
          ) : (
            <div className="vh-card-grid">
              {services.map((service) => (
                <article key={service.id} className="vh-service-card">
                  <div className="vh-service-icon">{service.emoji || 'SP'}</div>
                  <h3>{service.name}</h3>
                  <p>{service.description || '頭皮護理服務，適合日常潔淨、放鬆與定期保養。'}</p>
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

      <section className="vh-section">
        <div className="vh-container">
          <div className="vh-section-head">
            <div>
              <span className="vh-eyebrow">Packages</span>
              <h2>會員套票</h2>
            </div>
            <Link href="/tickets" className="vh-text-link">
              購買套票
            </Link>
          </div>
          <div className="vh-card-grid">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <article key={ticket.id} className="vh-package-card">
                  <h3>{ticket.name}</h3>
                  <strong>{formatCurrency(ticket.price)}</strong>
                  <p>{ticket.description || `${ticket.count || ticket.times || 0} 次頭皮護理，可於會員預約時使用。`}</p>
                </article>
              ))
            ) : (
              <article className="vh-package-card">
                <h3>頭皮護理套票</h3>
                <strong>後台設定</strong>
                <p>管理員可於後台新增套票；會員購買並完成付款後，即可於預約時扣次使用。</p>
              </article>
            )}
          </div>
        </div>
      </section>

      <section className="vh-section vh-section-tint">
        <div className="vh-container vh-contact-band">
          <div>
            <span className="vh-eyebrow">Member booking</span>
            <h2>預約、套票、會員資料集中管理</h2>
            <p>
              會員可查看自己的套票、待付款訂單和預約紀錄；管理員可確認付款、發放套票，並用 CSV 匯入舊套票餘額。
            </p>
            {settings.checkout_notice ? <p className="vh-muted">{settings.checkout_notice}</p> : null}
          </div>
          <div className="vh-action-row">
            <Link href="/account/tickets" className="vh-btn vh-btn-secondary">
              我的套票
            </Link>
            <Link href="/booking" className="vh-btn vh-btn-primary">
              立即預約
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

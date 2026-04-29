'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const heroStats = [
  { label: '全自助頭皮護理', value: 'Self Care' },
  { label: '網上預約與套票', value: 'Member' },
  { label: '安靜放鬆流程', value: 'Head Spa' },
]

const flowSteps = [
  {
    title: '頭皮狀態了解',
    body: '先按需要選擇頭皮檢測、深層潔淨或保濕舒緩，讓護理節奏貼近當日狀態。',
  },
  {
    title: '自助護理體驗',
    body: '以乾淨、安靜、清晰的流程完成頭皮潔淨與放鬆，適合日常保養與定期調理。',
  },
  {
    title: '會員套票管理',
    body: '購買套票後由後台確認付款，會員可在預約時直接使用套票扣次。',
  },
]

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
        supabase.from('settings').select('*'),
      ])

      setServices(servicesRes.data || [])
      setTickets(ticketsRes.data || [])
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
            <span className="vh-eyebrow">Pandora Head Spa</span>
            <h1>PANDORA HEAD SPA 全自助頭皮護理中心</h1>
            <p>
              以安靜、乾淨、柔和的 head spa 節奏，提供頭皮檢測、深層潔淨、放鬆養生與會員套票預約。客人可先購買套票，確認付款後於預約時直接扣次使用。
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
            <h2>{settings.shop_name || 'PANDORA HEAD SPA'}</h2>
            <p className="vh-muted">
              全自助頭皮護理中心。未確認的地址、電話和營業時間可於管理後台更新，前台會即時讀取最新設定。
            </p>
            <dl>
              <div>
                <dt>地址</dt>
                <dd>{settings.address || '請於後台設定店舖地址'}</dd>
              </div>
              <div>
                <dt>電話 / WhatsApp</dt>
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
            <p className="vh-muted">載入服務中...</p>
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
                  <p>{ticket.description || `${ticket.count || 0} 次頭皮護理，可於會員預約時使用。`}</p>
                </article>
              ))
            ) : (
              <article className="vh-package-card">
                <h3>頭皮護理套票</h3>
                <strong>後台設定</strong>
                <p>管理員可於後台新增套票，會員購買後待付款確認，便可於預約使用。</p>
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

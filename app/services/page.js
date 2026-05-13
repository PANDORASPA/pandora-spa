'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('zh-HK')}`

const normalizeSettings = (payload) => payload?.settings || {}

const getPurchaseMessage = (response, payload, ticketName) => {
  if (payload?.paymentProvider === 'stripe' || payload?.checkoutUrl) {
    return `正在前往 Stripe 付款；付款成功後會自動加入 ${ticketName}。`
  }

  if (response.status === 202 || payload?.requiresPayment || payload?.order?.status === 'awaiting_payment') {
    const ref = payload?.ref || payload?.order?.ref
    return `已建立待付款套票訂單，確認收款後會加入「我的套票」。${ref ? `（訂單 ${ref}）` : ''}`
  }

  if (payload?.entitlementIssued === true || payload?.ticket) {
    return `已成功加入 ${ticketName}，可到會員中心查看。`
  }

  return `已送出 ${ticketName} 訂單，請到會員中心查看狀態。`
}

const buildPaymentOptions = (settings) => {
  const options = []
  if (settings.stripe_enabled !== 'false' && settings.stripe_checkout_ready === 'true') options.push({ value: 'stripe', label: 'Stripe 線上付款' })
  if (settings.manual_payment_enabled !== 'false') options.push({ value: 'manual', label: '人工確認付款' })
  if (settings.fps_enabled === 'true') options.push({ value: 'fps', label: 'FPS / 轉數快' })
  if (settings.pay_at_shop_enabled === 'true') options.push({ value: 'pay_at_shop', label: '到店付款' })
  return options.length ? options : [{ value: 'manual', label: '人工確認付款' }]
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [tickets, setTickets] = useState([])
  const [settings, setSettings] = useState({})
  const [activeTab, setActiveTab] = useState('services')
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [buyingTicketId, setBuyingTicketId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('manual')

  useEffect(() => {
    const load = async () => {
      const [servicesRes, ticketsRes, authRes, settingsRes] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('tickets').select('*').eq('enabled', true).order('id'),
        supabase.auth.getUser(),
        fetch('/api/public/settings', { cache: 'no-store' }).then((response) => response.json()).catch(() => ({})),
      ])
      const nextSettings = normalizeSettings(settingsRes)
      const nextOptions = buildPaymentOptions(nextSettings)

      setServices(servicesRes.data || [])
      setTickets(ticketsRes.data || [])
      setSettings(nextSettings)
      setPaymentMethod(nextOptions[0]?.value || 'manual')

      const user = authRes?.data?.user || null
      setAuthUser(user)

      if (user) {
        const { data } = await supabase.from('member_profiles').select('full_name, phone').eq('id', user.id).maybeSingle()
        setProfile(data || null)
      }
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null
      setAuthUser(user)

      if (!user) {
        setProfile(null)
        return
      }

      const { data } = await supabase.from('member_profiles').select('full_name, phone').eq('id', user.id).maybeSingle()
      setProfile(data || null)
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  const paymentOptions = useMemo(() => buildPaymentOptions(settings), [settings])

  const ticketHint = useMemo(() => {
    if (!authUser) return '登入會員後可購買套票；付款確認後，預約適用服務時可直接扣次使用。'
    return `目前登入會員：${profile?.full_name || authUser.email || '已登入會員'}`
  }, [authUser, profile])

  const handleBuyTicket = async (ticket) => {
    if (!authUser) {
      toast.error('請先登入會員')
      return
    }

    try {
      setBuyingTicketId(ticket.id)
      const normalizedPaymentMethod = paymentMethod === 'fps' || paymentMethod === 'pay_at_shop' ? 'manual' : paymentMethod

      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, paymentMethod: normalizedPaymentMethod }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || '套票訂單建立失敗')
      }

      toast.success(getPurchaseMessage(response, payload, ticket.name))
      if (payload?.checkoutUrl) {
        window.location.href = payload.checkoutUrl
      }
    } catch (error) {
      toast.error(`套票訂單建立失敗：${error.message}`)
    } finally {
      setBuyingTicketId(null)
    }
  }

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">Scalp care menu</span>
        <h1>
          頭皮護理
          <span>與會員套票</span>
        </h1>
        <p>集中查看 PANDORA HEAD SPA 的頭皮檢測、深層潔淨、舒緩保養和可購買套票。套票會在付款確認後加入會員帳戶。</p>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          <div className="vh-tab-row">
            {[
              { id: 'services', label: '頭皮護理服務' },
              { id: 'tickets', label: '會員套票' },
            ].map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`vh-tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'services' && (
            <div className="vh-card-grid">
              {services.map((service) => (
                <article key={service.id} className="vh-service-card">
                  <div className="vh-service-icon">{service.emoji || 'SP'}</div>
                  <h3>{service.name}</h3>
                  <p>{service.description || '頭皮護理服務，適合日常潔淨、放鬆和定期保養。'}</p>
                  <div className="vh-service-meta">
                    <span>{service.time || 60} 分鐘</span>
                    <strong>{formatCurrency(service.price)}</strong>
                  </div>
                  <Link href="/booking" className="vh-card-cta">
                    立即預約
                  </Link>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'tickets' && (
            <>
              <div className="vh-payment-choice">
                <span>付款方式</span>
                {paymentOptions.map((option) => (
                  <button key={option.value} type="button" className={paymentMethod === option.value ? 'active' : ''} onClick={() => setPaymentMethod(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
              {settings.stripe_enabled !== 'false' && settings.stripe_checkout_ready !== 'true' ? (
                <div className="vh-empty-card" style={{ textAlign: 'left' }}>Stripe 尚未完成正式金鑰設定，目前先使用人工確認付款。</div>
              ) : null}
              <div className="vh-ticket-hint">{ticketHint}</div>
              <div className="vh-card-grid">
                {tickets.map((ticket) => (
                  <article key={ticket.id} className="vh-ticket-card">
                    <div className="vh-ticket-card-head">
                      <span>PANDORA PACKAGE</span>
                      <h3>{ticket.name}</h3>
                      <div className="vh-ticket-meta">
                        <div>
                          <small>可用次數</small>
                          <strong>{ticket.count} 次</strong>
                        </div>
                        <strong>{formatCurrency(ticket.price)}</strong>
                      </div>
                    </div>
                    <div className="vh-ticket-card-body">
                      <p>{ticket.description || '付款確認後套票會存入會員帳戶，預約相關頭皮護理服務時可直接扣次。'}</p>
                      <span className="vh-average">平均每次 {formatCurrency(ticket.count ? ticket.price / ticket.count : ticket.price)}</span>
                      <button type="button" onClick={() => handleBuyTicket(ticket)} disabled={buyingTicketId === ticket.id} className="vh-btn vh-btn-primary">
                        {buyingTicketId === ticket.id ? '建立訂單中...' : '購買套票'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

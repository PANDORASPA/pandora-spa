'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('zh-HK')}`

const normalizeSettings = (payload) => payload?.settings || {}

const getPurchaseMessage = (response, payload, ticketName) => {
  if (payload?.paymentProvider === 'stripe' || payload?.checkoutUrl) {
    return `正在前往 Stripe 付款；付款成功後，${ticketName} 會自動加入你的會員帳戶。`
  }

  if (response.status === 202 || payload?.requiresPayment || payload?.order?.status === 'awaiting_payment') {
    const ref = payload?.ref || payload?.order?.ref
    return `已建立待付款套票訂單；確認收款後會加入「我的套票」。${ref ? `訂單：${ref}` : ''}`
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState(null)
  const [buyingTicketId, setBuyingTicketId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('manual')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ticketsRes, authRes, settingsRes] = await Promise.all([
        supabase.from('tickets').select('*').eq('enabled', true).order('id'),
        supabase.auth.getUser(),
        fetch('/api/public/settings', { cache: 'no-store' }).then((response) => response.json()).catch(() => ({})),
      ])
      const nextSettings = normalizeSettings(settingsRes)
      const nextOptions = buildPaymentOptions(nextSettings)
      setTickets(ticketsRes.data || [])
      setSettings(nextSettings)
      setAuthUser(authRes?.data?.user || null)
      setPaymentMethod(nextOptions[0]?.value || 'manual')
      setLoading(false)
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  const paymentOptions = useMemo(() => buildPaymentOptions(settings), [settings])

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
      toast.error(`套票購買失敗：${error.message}`)
    } finally {
      setBuyingTicketId(null)
    }
  }

  if (loading) {
    return <div className="vh-loading">正在載入...</div>
  }

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">Member packages</span>
        <h1>
          會員<span>套票</span>
        </h1>
        <p>購買套票並完成付款後，套票會顯示在會員中心。預約適用服務時可扣 1 次使用，取消後會自動回補。</p>
      </section>

      <section className="vh-section">
        <div className="vh-container vh-narrow">
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
          {settings.checkout_notice ? <div className="vh-empty-card" style={{ textAlign: 'left' }}>{settings.checkout_notice}</div> : null}

          {tickets.length === 0 ? (
            <div className="vh-empty-card">暫時沒有可購買套票</div>
          ) : (
            <div className="vh-ticket-list">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="vh-ticket-row">
                  {Number(ticket.orig) > Number(ticket.price) ? <span className="vh-save-badge">節省 {formatCurrency(ticket.orig - ticket.price)}</span> : null}
                  <div className="vh-ticket-symbol">{ticket.emoji || 'SP'}</div>
                  <div className="vh-ticket-content">
                    <h3>{ticket.name}</h3>
                    <p>{ticket.count || ticket.times || 0} 次｜{ticket.description || ticket.features || '適用於指定頭皮護理服務。'}</p>
                    <div className="vh-ticket-actions">
                      <div>
                        <strong>{formatCurrency(ticket.price)}</strong>
                        {Number(ticket.orig) > Number(ticket.price) ? <span>{formatCurrency(ticket.orig)}</span> : null}
                      </div>
                      <button type="button" onClick={() => handleBuyTicket(ticket)} disabled={buyingTicketId === ticket.id} className="vh-btn vh-btn-primary">
                        {buyingTicketId === ticket.id ? '建立訂單中...' : '購買套票'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="vh-center-link">
            <Link href="/account/tickets">查看我的套票與待付款訂單</Link>
          </div>
          {settings.fulfillment_note ? <p className="vh-muted" style={{ marginTop: '18px', textAlign: 'center' }}>{settings.fulfillment_note}</p> : null}
        </div>
      </section>
    </>
  )
}

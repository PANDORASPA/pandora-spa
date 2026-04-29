'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const getPurchaseMessage = (response, payload, ticketName) => {
  if (response.status === 202 || payload?.requiresPayment || payload?.order?.status === 'awaiting_payment') {
    const ref = payload?.ref || payload?.order?.ref
    return `已建立待付款套票訂單，確認收款後會加入「我的套票」${ref ? `（訂單 ${ref}）` : ''}`
  }

  if (payload?.entitlementIssued === true || payload?.ticket) {
    return `已成功加入 ${ticketName}，可到會員中心查看`
  }

  return `已送出 ${ticketName} 訂單，請到會員中心查看狀態`
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('services')
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [buyingTicketId, setBuyingTicketId] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [servicesRes, ticketsRes, authRes] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('tickets').select('*').eq('enabled', true).order('id'),
        supabase.auth.getUser(),
      ])

      setServices(servicesRes.data || [])
      setTickets(ticketsRes.data || [])

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

  const ticketHint = useMemo(() => {
    if (!authUser) return '登入會員後可購買套票，付款確認後便可於預約時扣次使用。'
    return `目前登入會員：${profile?.full_name || authUser.email || '已登入會員'}`
  }, [authUser, profile])

  const handleBuyTicket = async (ticket) => {
    if (!authUser) {
      toast.error('請先登入會員')
      return
    }

    try {
      setBuyingTicketId(ticket.id)

      const response = await fetch('/api/tickets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Ticket purchase failed')
      }

      toast.success(getPurchaseMessage(response, payload, ticket.name))
    } catch (error) {
      toast.error(`套票訂單建立失敗: ${error.message}`)
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
        <p>集中查看 PANDORA HEAD SPA 的頭皮檢測、深層潔淨、舒緩保養與可購買套票。套票不會即時發放，需由管理員確認付款後才加入會員帳戶。</p>
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

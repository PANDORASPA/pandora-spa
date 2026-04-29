'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const getPurchaseMessage = (response, payload, ticketName) => {
  if (response.status === 202 || payload?.requiresPayment || payload?.order?.status === 'awaiting_payment') {
    const ref = payload?.ref || payload?.order?.ref
    return `訂單已建立，待付款確認後會加入「我的套票」${ref ? `（訂單 ${ref}）` : ''}`
  }

  if (payload?.entitlementIssued === true || payload?.ticket) {
    return `已成功加入 ${ticketName}，可到會員中心查看`
  }

  return `已送出 ${ticketName} 訂單，請到會員中心查看狀態`
}

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('services')
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [buyingTicketId, setBuyingTicketId] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [servicesRes, packagesRes, ticketsRes, authRes] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('service_packages').select('*').eq('enabled', true).order('id'),
        supabase.from('tickets').select('*').eq('enabled', true).order('id'),
        supabase.auth.getUser(),
      ])

      setServices(servicesRes.data || [])
      setPackages(packagesRes.data || [])
      setTickets(ticketsRes.data || [])

      const user = authRes?.data?.user || null
      setAuthUser(user)

      if (user) {
        const { data } = await supabase
          .from('member_profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle()

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

      const { data } = await supabase
        .from('member_profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      setProfile(data || null)
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  const ticketHint = useMemo(() => {
    if (!authUser) return '登入會員後即可購買套票，並在預約時使用。'
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
      toast.error(`套票購買失敗: ${error.message}`)
    } finally {
      setBuyingTicketId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', paddingBottom: '60px' }}>
      <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', color: '#3D3D3D', marginBottom: '16px' }}>
          服務與
          <span style={{ color: '#A68B6A' }}>套票</span>
        </h1>
        <p style={{ color: '#666', maxWidth: '680px', margin: '0 auto', lineHeight: 1.7 }}>
          集中查看單次服務與套票。登入後購買套票會先建立待付款訂單，付款確認後即可在預約時使用。
        </p>
      </div>

      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { id: 'services', label: '單次服務' },
            { id: 'packages', label: '服務套票' },
            { id: 'tickets', label: '套票' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="btn-interactive"
              style={{
                padding: '12px 30px',
                background: activeTab === tab.id ? '#A68B6A' : '#fff',
                color: activeTab === tab.id ? '#fff' : '#666',
                border: activeTab === tab.id ? 'none' : '1px solid #e5e5e5',
                borderRadius: '30px',
                fontWeight: 700,
                fontSize: '15px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {services.map((service) => (
              <div key={service.id} className="admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px' }}>{service.emoji || '✂️'}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#A68B6A' }}>{formatCurrency(service.price)}</div>
                    <div style={{ fontSize: '13px', color: '#999' }}>{service.time || 60} 分鐘</div>
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{service.name}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, flex: 1, marginBottom: '20px' }}>
                  {service.description || '由專業髮型師提供洗剪吹和造型建議。'}
                </p>
                <Link href="/booking" className="btn btn-interactive" style={{ textAlign: 'center', padding: '12px', background: '#f3f4f6', color: '#333', fontWeight: 600 }}>
                  立即預約
                </Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'packages' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {packages.map((pkg) => (
              <div key={pkg.id} className="admin-card" style={{ padding: '30px', border: '2px solid #A68B6A', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '20px', right: '-30px', background: '#A68B6A', color: '#fff', padding: '5px 40px', transform: 'rotate(45deg)', fontSize: '12px', fontWeight: 700 }}>
                  PACKAGE
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#3D3D3D' }}>{pkg.name}</h3>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#A68B6A', marginBottom: '20px' }}>{formatCurrency(pkg.price)}</div>
                <div style={{ background: '#FAF8F5', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>
                    {pkg.description || '服務套票詳情可於預約前向店舖查詢。'}
                  </p>
                </div>
                <Link href="/booking" className="btn btn-interactive" style={{ display: 'block', textAlign: 'center', padding: '14px', background: '#A68B6A', color: '#fff', fontWeight: 700 }}>
                  預約此套票
                </Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tickets' && (
          <>
            <div style={{ marginBottom: '16px', textAlign: 'center', color: '#666', fontSize: '14px' }}>{ticketHint}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} className="admin-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'linear-gradient(135deg, #3D3D3D, #1a1a1a)', padding: '30px 24px', color: '#fff', position: 'relative' }}>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', letterSpacing: '1px' }}>VIVA PACKAGE</div>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>{ticket.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>可用次數</div>
                        <div style={{ fontSize: '24px', fontWeight: 700 }}>{ticket.count} 次</div>
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#A68B6A' }}>{formatCurrency(ticket.price)}</div>
                    </div>
                  </div>
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                        送出後會先建立待付款訂單；付款確認後套票會存入會員帳戶，預約相關服務時可直接扣減次數。
                      </p>
                      <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 600, display: 'inline-block' }}>
                        平均每次 {formatCurrency(ticket.count ? ticket.price / ticket.count : ticket.price)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuyTicket(ticket)}
                      disabled={buyingTicketId === ticket.id}
                      className="btn btn-interactive"
                      style={{ width: '100%', padding: '12px', background: '#3D3D3D', color: '#fff', border: 'none', borderRadius: '8px', cursor: buyingTicketId === ticket.id ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600 }}
                    >
                      {buyingTicketId === ticket.id ? '建立訂單中...' : '購買套票'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState(null)
  const [buyingTicketId, setBuyingTicketId] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ticketsRes, authRes] = await Promise.all([
        supabase.from('tickets').select('*').eq('enabled', true).order('id'),
        supabase.auth.getUser(),
      ])
      setTickets(ticketsRes.data || [])
      setAuthUser(authRes?.data?.user || null)
      setLoading(false)
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

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
        throw new Error(payload?.error || '套票訂單建立失敗')
      }

      toast.success(getPurchaseMessage(response, payload, ticket.name))
    } catch (error) {
      toast.error(`套票購買失敗: ${error.message}`)
    } finally {
      setBuyingTicketId(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>
            會員<span style={{ color: '#A68B6A' }}>套票</span>
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>送出購買後會建立待付款訂單，付款確認後即可在預約流程使用套票。</p>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {tickets.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有套票</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                  {ticket.orig > ticket.price && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      省 {formatCurrency(ticket.orig - ticket.price)}
                    </div>
                  )}
                  <div style={{ padding: '24px', display: 'flex', gap: '16px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #3D3D3D, #6B6B6B)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
                      {ticket.emoji || '🎟️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{ticket.name}</h3>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                        {ticket.count || ticket.times || 0} 次 · {ticket.features || '適用於指定服務項目'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: '#A68B6A' }}>{formatCurrency(ticket.price)}</span>
                          {ticket.orig > ticket.price && <span style={{ fontSize: '14px', color: '#999', textDecoration: 'line-through', marginLeft: '8px' }}>{formatCurrency(ticket.orig)}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBuyTicket(ticket)}
                          disabled={buyingTicketId === ticket.id}
                          style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #A68B6A, #8B7355)',
                            color: '#fff',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: buyingTicketId === ticket.id ? 'not-allowed' : 'pointer',
                            opacity: buyingTicketId === ticket.id ? 0.75 : 1,
                          }}
                        >
                          {buyingTicketId === ticket.id ? '建立訂單中...' : '購買套票'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link href="/account/tickets" style={{ color: '#A68B6A', fontWeight: 800 }}>
              查看我的套票與待付款訂單
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

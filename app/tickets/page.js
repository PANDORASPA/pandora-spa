'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true)
      try {
        const supabase = getBrowserClient()
        const { data } = await supabase.from('tickets').select('*').eq('enabled', true).order('id')
        if (data) setTickets(data)
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>
            Tickets<span style={{ color: '#A68B6A' }}> and Passes</span>
          </h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {tickets.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>No tickets available right now.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ padding: '24px', display: 'flex', gap: '16px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #3D3D3D, #6B6B6B)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
                      {ticket.emoji || '🎫'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{ticket.name}</h3>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                        {ticket.count || 0} sessions
                        {ticket.service_id ? ' for a selected service' : ''}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: '#A68B6A' }}>${ticket.price}</span>
                        </div>
                        <Link href="/services" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

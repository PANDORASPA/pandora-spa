'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true)
      const { data } = await supabase.from('tickets').select('*').eq('enabled', true).order('id')
      if (data) setTickets(data)
      setLoading(false)
    }
    fetchTickets()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>套票<span style={{ color: '#A68B6A' }}>優惠</span></h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {tickets.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有套票</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {tickets.map(ticket => (
                <div key={ticket.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                  {ticket.orig > ticket.price && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      慳${ticket.orig - ticket.price}
                    </div>
                  )}
                  <div style={{ padding: '24px', display: 'flex', gap: '16px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #3D3D3D, #6B6B6B)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 }}>
                      {ticket.emoji || '🎁'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{ticket.name}</h3>
                      <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{ticket.times}次 {ticket.features}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: '#A68B6A' }}>${ticket.price}</span>
                          {ticket.orig > ticket.price && <span style={{ fontSize: '14px', color: '#999', textDecoration: 'line-through', marginLeft: '8px' }}>${ticket.orig}</span>}
                        </div>
                        <Link href="/login" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
                          購買套票
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

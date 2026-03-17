'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function Services() {
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('services')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const [servicesData, packagesData, ticketsData] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('service_packages').select('*').eq('enabled', true),
        supabase.from('tickets').select('*').eq('enabled', true)
      ])
      
      if (servicesData.data) setServices(servicesData.data)
      if (packagesData.data) setPackages(packagesData.data)
      if (ticketsData.data) setTickets(ticketsData.data)
        
      const savedUser = localStorage.getItem('viva_user')
      if (savedUser) setCurrentUser(JSON.parse(savedUser))
    }
    fetchData()
  }, [])

  const handleBuyTicket = async (ticket) => {
    if (!currentUser) {
      toast.error('請先登入會員')
      // Redirect or show login modal (simplified here)
      return
    }

    // Simulate Purchase: Add directly to user_tickets
    const { error } = await supabase.from('user_tickets').insert({
      customer_id: currentUser.id,
      ticket_id: ticket.id,
      ticket_name: ticket.name,
      remaining_count: ticket.count,
      expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 year expiry
    })

    if (error) {
      toast.error('購買失敗: ' + error.message)
    } else {
      toast.success(`成功購買 ${ticket.name}！已存入您的帳戶`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', paddingBottom: '60px' }}>
      <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', color: '#3D3D3D', marginBottom: '16px' }}>服務<span style={{ color: '#A68B6A' }}>價目表</span></h1>
        <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto' }}>透明公開的價格，專業細緻的服務。我們提供單次服務、超值套餐以及會員專屬套票。</p>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
          <button 
            onClick={() => setActiveTab('services')}
            className="btn-interactive"
            style={{ 
              padding: '12px 30px', 
              background: activeTab === 'services' ? '#A68B6A' : '#fff', 
              color: activeTab === 'services' ? '#fff' : '#666', 
              border: activeTab === 'services' ? 'none' : '1px solid #e5e5e5',
              borderRadius: '30px', 
              fontWeight: 700,
              fontSize: '15px'
            }}
          >
            單次服務
          </button>
          <button 
            onClick={() => setActiveTab('packages')}
            className="btn-interactive"
            style={{ 
              padding: '12px 30px', 
              background: activeTab === 'packages' ? '#A68B6A' : '#fff', 
              color: activeTab === 'packages' ? '#fff' : '#666', 
              border: activeTab === 'packages' ? 'none' : '1px solid #e5e5e5',
              borderRadius: '30px', 
              fontWeight: 700,
              fontSize: '15px'
            }}
          >
            精選套餐
          </button>
          <button 
            onClick={() => setActiveTab('tickets')}
            className="btn-interactive"
            style={{ 
              padding: '12px 30px', 
              background: activeTab === 'tickets' ? '#A68B6A' : '#fff', 
              color: activeTab === 'tickets' ? '#fff' : '#666', 
              border: activeTab === 'tickets' ? 'none' : '1px solid #e5e5e5',
              borderRadius: '30px', 
              fontWeight: 700,
              fontSize: '15px'
            }}
          >
            儲值套票
          </button>
        </div>

        {/* Services List */}
        {activeTab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {services.map(s => (
              <div key={s.id} className="admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px' }}>{s.emoji || '✂️'}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#A68B6A' }}>${s.price}</div>
                    <div style={{ fontSize: '13px', color: '#999' }}>{s.time} 分鐘</div>
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{s.name}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, flex: 1, marginBottom: '20px' }}>
                  {s.description || '由資深髮型師為您提供專業服務，包含洗髮與造型吹整。'}
                </p>
                <Link href="/booking" className="btn btn-interactive" style={{ textAlign: 'center', padding: '12px', background: '#f3f4f6', color: '#333', fontWeight: 600 }}>
                  立即預約
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Packages List */}
        {activeTab === 'packages' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {packages.map(p => (
              <div key={p.id} className="admin-card" style={{ padding: '30px', border: '2px solid #A68B6A', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '20px', right: '-30px', background: '#A68B6A', color: '#fff', padding: '5px 40px', transform: 'rotate(45deg)', fontSize: '12px', fontWeight: 700 }}>HOT</div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#3D3D3D' }}>{p.name}</h3>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#A68B6A', marginBottom: '20px' }}>
                  ${p.price}
                </div>
                <div style={{ background: '#FAF8F5', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>
                    {p.description || '包含洗剪吹及深層護理服務'}
                  </p>
                </div>
                <Link href="/booking" className="btn btn-interactive" style={{ display: 'block', textAlign: 'center', padding: '14px', background: '#A68B6A', color: '#fff', fontWeight: 700 }}>
                  預約此套餐
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Tickets List */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {tickets.map(t => (
              <div key={t.id} className="admin-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'linear-gradient(135deg, #3D3D3D, #1a1a1a)', padding: '30px 24px', color: '#fff', position: 'relative' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', letterSpacing: '1px' }}>VIVA SALON MEMBER</div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>{t.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.6 }}>包含次數</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>{t.count} 次</div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#A68B6A' }}>${t.price}</div>
                  </div>
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                      購買此套票可享受更優惠的價格。適用於指定服務項目，有效期一年。
                    </p>
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 600, display: 'inline-block' }}>
                      平均每次僅需 ${Math.round(t.price / t.count)}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleBuyTicket(t)}
                    className="btn btn-interactive" 
                    style={{ width: '100%', padding: '12px', background: '#3D3D3D', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    購買套票 (模擬)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

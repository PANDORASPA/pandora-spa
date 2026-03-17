'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState('services')
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getBrowserClient()
        const [{ data: servicesData }, { data: packagesData }, { data: ticketsData }, authResult] = await Promise.all([
          supabase.from('services').select('*').eq('enabled', true).order('sort_order').order('id'),
          supabase.from('service_packages').select('*').eq('enabled', true).order('id'),
          supabase.from('tickets').select('*').eq('enabled', true).order('id'),
          supabase.auth.getUser(),
        ])

        setServices(servicesData || [])
        setPackages(packagesData || [])
        setTickets(ticketsData || [])
        setUser(authResult?.data?.user || null)
      } catch (error) {
        toast.error(error?.message || '讀取服務資料失敗')
      }
    }

    loadData()
  }, [])

  const ensureCustomerRecord = async (supabase, authUser) => {
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('full_name, phone, email')
      .eq('id', authUser.id)
      .single()

    const phone = profile?.phone || ''
    const email = profile?.email || authUser.email || ''
    const name = profile?.full_name || authUser.email || '會員'

    let existing = null
    if (phone) {
      const { data } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
      existing = data
    }

    if (!existing && email) {
      const { data } = await supabase.from('customers').select('id').eq('email', email).maybeSingle()
      existing = data
    }

    if (existing?.id) return existing.id

    const insertPayload = {
      name,
      phone: phone || `member-${authUser.id}`,
      email,
    }

    const { data, error } = await supabase.from('customers').insert(insertPayload).select('id').single()
    if (error) throw error
    return data?.id
  }

  const handleBuyTicket = async (ticket) => {
    try {
      const supabase = getBrowserClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        toast.error('請先登入會員')
        router.push('/login?redirectTo=/services')
        return
      }

      const customerId = await ensureCustomerRecord(supabase, authUser)
      const expiry = new Date()
      expiry.setFullYear(expiry.getFullYear() + 1)

      const { error } = await supabase.from('user_tickets').insert({
        customer_id: customerId,
        member_user_id: authUser.id,
        ticket_id: ticket.id,
        ticket_name: ticket.name,
        remaining_count: ticket.count,
        expiry_date: expiry.toISOString().slice(0, 10),
      })

      if (error) throw error
      toast.success(`已成功購買 ${ticket.name}`)
    } catch (error) {
      toast.error(`購買失敗: ${error?.message || '未知錯誤'}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', paddingBottom: '60px' }}>
      <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', color: '#3D3D3D', marginBottom: '16px' }}>
          服務<span style={{ color: '#A68B6A' }}>價目表</span>
        </h1>
        <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto' }}>
          所有內容都會直接讀取後台資料，服務、套票和次數卡會保持同步。
        </p>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
          {[
            ['services', '單次服務'],
            ['packages', '套餐'],
            ['tickets', '套票'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '12px 30px',
                background: activeTab === key ? '#A68B6A' : '#fff',
                color: activeTab === key ? '#fff' : '#666',
                border: activeTab === key ? 'none' : '1px solid #e5e5e5',
                borderRadius: '30px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {services.map((service) => (
              <div key={service.id} className="admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px' }}>{service.emoji || '✂️'}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#A68B6A' }}>${service.price}</div>
                    <div style={{ fontSize: '13px', color: '#999' }}>{service.time} 分鐘</div>
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{service.name}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, flex: 1, marginBottom: '20px' }}>{service.description || '專業服務項目'}</p>
                <Link href="/booking" style={{ textAlign: 'center', padding: '12px', background: '#f3f4f6', color: '#333', fontWeight: 600, textDecoration: 'none', borderRadius: '10px' }}>
                  立即預約
                </Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'packages' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {packages.map((item) => (
              <div key={item.id} className="admin-card" style={{ padding: '24px', border: '2px solid #A68B6A' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>{item.name}</h3>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#A68B6A', marginBottom: '16px' }}>${item.price}</div>
                <p style={{ whiteSpace: 'pre-line', color: '#555', lineHeight: 1.8, marginBottom: '20px' }}>{item.description || '套餐內容請向店舖查詢'}</p>
                <Link href="/booking" style={{ display: 'block', textAlign: 'center', padding: '14px', background: '#A68B6A', color: '#fff', fontWeight: 700, textDecoration: 'none', borderRadius: '10px' }}>
                  預約此套餐
                </Link>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tickets' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {tickets.map((ticket) => (
              <div key={ticket.id} className="admin-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'linear-gradient(135deg, #3D3D3D, #1a1a1a)', padding: '30px 24px', color: '#fff' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', letterSpacing: '1px' }}>VIVA SALON MEMBER</div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>{ticket.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.6 }}>次數</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>{ticket.count} 次</div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#A68B6A' }}>${ticket.price}</div>
                  </div>
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
                    {ticket.service_id ? '可用於指定服務項目。' : '可於店內使用。'} 有效期預設一年。
                  </p>
                  <button
                    onClick={() => handleBuyTicket(ticket)}
                    style={{ width: '100%', padding: '12px', background: '#3D3D3D', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {user ? '立即購買套票' : '登入後購買'}
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

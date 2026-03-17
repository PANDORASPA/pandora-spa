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
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const supabase = getBrowserClient()
        const [servicesResult, packagesResult, ticketsResult, authResult] = await Promise.all([
          supabase.from('services').select('*').eq('enabled', true).order('sort_order').order('id'),
          supabase.from('service_packages').select('*').eq('enabled', true).order('id'),
          supabase.from('tickets').select('*').eq('enabled', true).order('id'),
          supabase.auth.getUser(),
        ])

        setServices(servicesResult.data || [])
        setPackages(packagesResult.data || [])
        setTickets(ticketsResult.data || [])
        setUser(authResult?.data?.user || null)
      } catch (error) {
        toast.error(error?.message || '載入服務資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const ensureCustomerRecord = async (supabase, authUser) => {
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('full_name, phone, email')
      .eq('id', authUser.id)
      .maybeSingle()

    const phone = profile?.phone || `member-${authUser.id}`
    const email = profile?.email || authUser.email || ''
    const name = profile?.full_name || authUser.email || '會員'

    const { data: existingByPhone } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
    if (existingByPhone?.id) return existingByPhone.id

    const { data: existingByEmail } = await supabase.from('customers').select('id').eq('email', email).maybeSingle()
    if (existingByEmail?.id) return existingByEmail.id

    const { data, error } = await supabase.from('customers').insert({ name, phone, email }).select('id').single()
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
        router.push('/login?redirectTo=/services')
        return
      }

      const customerId = await ensureCustomerRecord(supabase, authUser)
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)

      const { error } = await supabase.from('user_tickets').insert({
        customer_id: customerId,
        member_user_id: authUser.id,
        ticket_id: ticket.id,
        ticket_name: ticket.name,
        remaining_count: ticket.count,
        expiry_date: expiryDate.toISOString().slice(0, 10),
      })

      if (error) throw error
      toast.success('套票購買成功')
    } catch (error) {
      toast.error(error?.message || '套票購買失敗')
    }
  }

  const renderEmpty = (message) => <p style={{ textAlign: 'center', color: '#666' }}>{message}</p>

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', paddingBottom: '80px' }}>
      <section style={{ background: '#fff', padding: '56px 20px', textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>服務價目</h1>
        <p style={{ color: '#666', maxWidth: '620px', margin: '0 auto' }}>
          前台只顯示一般客人需要的服務、套餐與套票內容。
        </p>
      </section>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            ['services', '服務'],
            ['packages', '套餐'],
            ['tickets', '套票'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '12px 24px',
                borderRadius: '999px',
                border: activeTab === key ? 'none' : '1px solid #ddd',
                background: activeTab === key ? '#A68B6A' : '#fff',
                color: activeTab === key ? '#fff' : '#444',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? <p style={{ textAlign: 'center' }}>載入中...</p> : null}

        {!loading && activeTab === 'services' ? (
          services.length === 0 ? (
            renderEmpty('目前沒有可用服務。')
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {services.map((service) => (
                <div key={service.id} className="admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px' }}>{service.name}</h3>
                      <div style={{ color: '#666', marginTop: '4px' }}>{service.time || 60} 分鐘</div>
                    </div>
                    <div style={{ color: '#A68B6A', fontWeight: 800 }}>${service.price}</div>
                  </div>
                  <p style={{ color: '#666', lineHeight: 1.6, flex: 1 }}>{service.description || '專業髮型與護理服務。'}</p>
                  <Link
                    href={`/booking?serviceId=${service.id}`}
                    style={{ marginTop: '16px', textAlign: 'center', padding: '12px', borderRadius: '10px', background: '#A68B6A', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
                  >
                    立即預約
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : null}

        {!loading && activeTab === 'packages' ? (
          packages.length === 0 ? (
            renderEmpty('目前沒有可用套餐。')
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {packages.map((item) => (
                <div key={item.id} className="admin-card" style={{ padding: '24px', border: '2px solid #A68B6A' }}>
                  <h3 style={{ marginTop: 0 }}>{item.name}</h3>
                  <div style={{ color: '#A68B6A', fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>${item.price}</div>
                  <p style={{ color: '#666', lineHeight: 1.7 }}>{item.description || '詳情請向店舖查詢。'}</p>
                  <Link
                    href="/booking"
                    style={{ display: 'block', marginTop: '16px', textAlign: 'center', padding: '12px', borderRadius: '10px', background: '#A68B6A', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
                  >
                    預約此套餐
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : null}

        {!loading && activeTab === 'tickets' ? (
          tickets.length === 0 ? (
            renderEmpty('目前沒有可購買套票。')
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {tickets.map((ticket) => (
                <div key={ticket.id} className="admin-card" style={{ overflow: 'hidden' }}>
                  <div style={{ background: '#3D3D3D', color: '#fff', padding: '24px' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8, letterSpacing: '1px', marginBottom: '8px' }}>VIVA MEMBER TICKET</div>
                    <h3 style={{ margin: 0, fontSize: '22px' }}>{ticket.name}</h3>
                  </div>
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span>{ticket.count} 次</span>
                      <strong style={{ color: '#A68B6A', fontSize: '24px' }}>${ticket.price}</strong>
                    </div>
                    <p style={{ color: '#666', lineHeight: 1.6 }}>
                      {ticket.service_id ? '此套票適用於指定服務。' : '此套票可在店內使用。'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleBuyTicket(ticket)}
                      style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', border: 'none', background: '#A68B6A', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {user ? '立即購買套票' : '登入後購買'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}

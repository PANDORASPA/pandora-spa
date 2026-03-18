'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const getServiceEmoji = (name) => {
  if (!name) return '✂️'
  if (name.includes('染')) return '🎨'
  if (name.includes('電') || name.includes('燙')) return '🌀'
  if (name.includes('護')) return '✨'
  if (name.includes('頭皮')) return '🧴'
  return '✂️'
}

export default function TeamPage() {
  const [staff, setStaff] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [staffRes, servicesRes] = await Promise.all([
        supabase.from('staff').select('*').eq('enabled', true).order('id'),
        supabase.from('services').select('*').eq('enabled', true).order('sort_order'),
      ])

      setStaff(staffRes.data || [])
      setServices(servicesRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const getStaffServices = (serviceIds) => {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) return []
    return services.filter((service) => serviceIds.includes(service.id))
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '36px 16px', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '30px', color: '#3D3D3D', marginBottom: '10px' }}>
            我們的
            <span style={{ color: '#A68B6A' }}>團隊</span>
          </h1>
          <p style={{ color: '#666', lineHeight: 1.7 }}>
            認識店內髮型師和擅長服務，之後可直接帶著指定髮型師進入預約流程。
          </p>
        </div>
      </section>

      <section style={{ padding: '28px 12px 48px' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
          {staff.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '12px' }}>暫時未有公開團隊資料。</p>
              <Link href="/booking" className="btn" style={{ display: 'inline-block' }}>
                前往預約
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {staff.map((member) => {
                const memberServices = getStaffServices(member.services)

                return (
                  <article key={member.id} style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr' }}>
                      <div
                        style={{
                          minHeight: '220px',
                          background: member.photo_url
                            ? `url(${member.photo_url}) center/cover`
                            : 'linear-gradient(135deg, #A68B6A, #8B7355)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '72px',
                          fontWeight: 700,
                        }}
                      >
                        {!member.photo_url ? member.name?.charAt(0) || '?' : null}
                      </div>

                      <div style={{ padding: '22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <h2 style={{ fontSize: '22px', margin: 0 }}>{member.name}</h2>
                          {member.role && (
                            <span style={{ background: '#A68B6A', color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '12px' }}>
                              {member.role}
                            </span>
                          )}
                        </div>

                        {member.phone && (
                          <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>聯絡電話: {member.phone}</p>
                        )}

                        <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
                          {member.bio || '專注剪裁、護理和整體造型建議。'}
                        </p>

                        <div style={{ marginBottom: '18px' }}>
                          <p style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: 600 }}>擅長服務</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {memberServices.length > 0 ? (
                              memberServices.map((service) => (
                                <span
                                  key={service.id}
                                  style={{
                                    background: '#FAF8F5',
                                    color: '#666',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                  }}
                                >
                                  {getServiceEmoji(service.name)} {service.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#999', fontSize: '12px' }}>服務資料整理中</span>
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/booking?staffId=${member.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #A68B6A, #8B7355)',
                            color: '#fff',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                          }}
                        >
                          預約 {member.name}
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

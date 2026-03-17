'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Team() {
  const [staff, setStaff] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [staffData, servicesData] = await Promise.all([
        supabase.from('staff').select('*').eq('enabled', true).order('id'),
        supabase.from('services').select('*').eq('enabled', true)
      ])
      
      if (staffData.data) setStaff(staffData.data)
      if (servicesData.data) setServices(servicesData.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const getStaffServices = (serviceIds) => {
    if (!serviceIds || serviceIds.length === 0) return []
    return services.filter(s => serviceIds.includes(s.id))
  }

  const getServiceEmoji = (name) => {
    if (!name) return '✂️'
    if (name.includes('剪')) return '✂️'
    if (name.includes('染')) return '🎨'
    if (name.includes('燙')) return '💇'
    if (name.includes('護')) return '💆'
    if (name.includes('头皮')) return '🧴'
    return '✂️'
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>我們的<span style={{ color: '#A68B6A' }}>髮型師</span></h1>
          <p style={{ color: '#666', marginTop: '8px' }}>專業團隊，為您打造完美造型</p>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {staff.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有髮型師資料</p>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {staff.map(member => {
                const memberServices = getStaffServices(member.services)
                return (
                  <div key={member.id} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', md: { flexDirection: 'row' } }}>
                      {/* Photo */}
                      <div style={{ 
                        width: '100%', 
                        md: { width: '280px' },
                        minHeight: '200px',
                        background: member.photo_url ? `url(${member.photo_url}) center/cover` : 'linear-gradient(135deg, #A68B6A, #8B7355)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {!member.photo_url && (
                          <span style={{ fontSize: '80px', color: 'rgba(255,255,255,0.3)' }}>
                            {member.name?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div style={{ padding: '20px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{member.name}</h3>
                          <span style={{ background: '#A68B6A', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' }}>
                            {member.role}
                          </span>
                        </div>
                        
                        {member.phone && (
                          <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>📞 {member.phone}</p>
                        )}
                        
                        {member.bio && (
                          <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
                            {member.bio}
                          </p>
                        )}
                        
                        {/* Services */}
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: 500 }}>專長項目：</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {memberServices.length > 0 ? (
                              memberServices.map(sv => (
                                <span key={sv.id} style={{ 
                                  background: '#FAF8F5', 
                                  color: '#666', 
                                  padding: '6px 12px', 
                                  borderRadius: '20px', 
                                  fontSize: '12px' 
                                }}>
                                  {getServiceEmoji(sv.name)} {sv.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#999', fontSize: '12px' }}>暫無設定</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Booking Button */}
                        <Link 
                          href={`/booking?staff=${member.id}`}
                          style={{ 
                            display: 'inline-block', 
                            padding: '12px 24px', 
                            background: 'linear-gradient(135deg, #A68B6A, #8B7355)', 
                            color: '#fff', 
                            borderRadius: '8px', 
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 600
                          }}
                        >
                          預約 {member.name}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

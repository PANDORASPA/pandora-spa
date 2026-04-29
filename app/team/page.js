'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const getServiceMark = (name) => {
  if (!name) return 'SP'
  if (name.includes('檢測')) return 'CHECK'
  if (name.includes('潔淨') || name.includes('清潔')) return 'CLEAN'
  if (name.includes('舒緩') || name.includes('放鬆')) return 'CALM'
  return 'SPA'
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
    return <div className="vh-loading">載入中...</div>
  }

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">Care team</span>
        <h1>
          頭皮護理<span>團隊</span>
        </h1>
        <p>認識 PANDORA HEAD SPA 的護理師與服務人員。每位成員可在後台設定可提供服務和預約時段。</p>
      </section>

      <section className="vh-section">
        <div className="vh-container vh-narrow">
          {staff.length === 0 ? (
            <div className="vh-empty-card">
              <p>暫時未有公開團隊資料。</p>
              <Link href="/booking" className="vh-btn vh-btn-primary">
                前往預約
              </Link>
            </div>
          ) : (
            <div className="vh-team-list">
              {staff.map((member) => {
                const memberServices = getStaffServices(member.services)

                return (
                  <article key={member.id} className="vh-team-card">
                    <div className="vh-team-photo" style={member.photo_url ? { backgroundImage: `url(${member.photo_url})` } : undefined}>
                      {!member.photo_url ? member.name?.charAt(0) || 'P' : null}
                    </div>
                    <div className="vh-team-body">
                      <div className="vh-team-title">
                        <h2>{member.name}</h2>
                        <span>{member.role || '頭皮護理師'}</span>
                      </div>
                      {member.phone ? <p className="vh-muted">聯絡電話: {member.phone}</p> : null}
                      <p>{member.bio || '專注頭皮潔淨、舒緩護理和日常保養建議，協助客人建立穩定的頭皮護理節奏。'}</p>

                      <div className="vh-chip-row">
                        {memberServices.length > 0 ? (
                          memberServices.map((service) => (
                            <span key={service.id} className="vh-chip">
                              {getServiceMark(service.name)} · {service.name}
                            </span>
                          ))
                        ) : (
                          <span className="vh-chip">服務資料整理中</span>
                        )}
                      </div>

                      <Link href={`/booking?staffId=${member.id}`} className="vh-btn vh-btn-primary">
                        預約 {member.name}
                      </Link>
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

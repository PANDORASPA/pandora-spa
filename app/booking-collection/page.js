'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function BookingCollection() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let supabase
      try {
        supabase = getBrowserClient()
      } catch (e) {
        setLoading(false)
        return
      }
      const { data } = await supabase.from('staff').select('*').eq('enabled', true).order('name')
      setStaff(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const items = useMemo(() => {
    return (staff || []).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      bio: s.bio,
      photo_url: s.photo_url,
    }))
  }, [staff])

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>選擇<span style={{ color: '#A68B6A' }}>髮型師</span></h1>
          <p style={{ color: '#666', marginTop: '8px' }}>先揀髮型師，再進入預約時間選擇</p>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <Link
              href="/booking?staffId=random"
              className="btn btn-interactive"
              style={{ display: 'inline-block', padding: '12px 18px' }}
            >
              不指定髮型師（最早可約）
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>載入中...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>暫時沒有髮型師資料</div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {items.map((s) => (
                <Link
                  key={s.id}
                  href={`/booking?staffId=${encodeURIComponent(String(s.id))}`}
                  style={{ textDecoration: 'none' }}
                  className="btn-interactive"
                >
                  <div style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#FAF8F5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '28px' }}>💇</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#3D3D3D', fontSize: '16px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 700, marginBottom: '6px' }}>{s.role || '髮型師'}</div>
                      {s.bio ? (
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {s.bio}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#999' }}>查看可預約時間 →</div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

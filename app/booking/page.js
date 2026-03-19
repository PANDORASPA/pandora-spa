'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

const T = {
  title: '\u9078\u64c7\u8a2d\u8a08\u5e2b',
  intro: '\u5148\u9078\u64c7\u8a2d\u8a08\u5e2b\uff0c\u518d\u9032\u5165\u9810\u7d04\u9801\u9762\u9078\u64c7\u670d\u52d9\u3001\u65e5\u671f\u8207\u6642\u9593\u3002',
  loading: '\u8f09\u5165\u53ef\u9810\u7d04\u8a2d\u8a08\u5e2b\u4e2d...',
  redirecting: '\u6b63\u5728\u8f09\u5165\u9810\u7d04\u8cc7\u6599...',
  loadFailed: '\u7121\u6cd5\u8f09\u5165\u9810\u7d04\u5165\u53e3',
  noStaff: '\u76ee\u524d\u6c92\u6709\u53ef\u9810\u7d04\u7684\u8a2d\u8a08\u5e2b',
  roleFallback: 'Stylist',
  cta: '\u9810\u7d04',
  editFallback: '\u7121\u6cd5\u8f09\u5165\u539f\u9810\u7d04\uff0c\u8acb\u5f9e\u300c\u6211\u7684\u9810\u7d04\u300d\u91cd\u65b0\u9032\u5165\u3002',
}

export default function BookingPage() {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState({ staffId: '', editId: '', raw: '' })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setQuery({
      staffId: params.get('staffId') || '',
      editId: params.get('editId') || '',
      raw: params.toString(),
    })
  }, [])

  const staffId = query.staffId
  const editId = query.editId

  useEffect(() => {
    if (!query.raw && typeof window !== 'undefined' && window.location.search) return
    if (staffId && staffId !== 'random') {
      const params = new URLSearchParams(query.raw)
      params.delete('staffId')
      const query = params.toString()
      router.replace(`/booking/${encodeURIComponent(staffId)}${query ? `?${query}` : ''}`)
      return
    }

    if (editId) {
      setRedirecting(true)
      fetch(`/api/account/bookings/${editId}`)
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(payload?.error || T.editFallback)
          return payload?.booking
        })
        .then((booking) => {
          const targetStaffId = booking?.staff_id ? String(booking.staff_id) : ''
          if (!targetStaffId) throw new Error(T.editFallback)
          router.replace(`/booking/${encodeURIComponent(targetStaffId)}?editId=${encodeURIComponent(editId)}`)
        })
        .catch((fetchError) => {
          toast.error(fetchError?.message || T.editFallback)
          setError(fetchError?.message || T.editFallback)
          setRedirecting(false)
        })
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    fetch('/api/public/booking-bootstrap')
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || T.loadFailed)
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        setStaff(Array.isArray(payload?.staff) ? payload.staff : [])
      })
      .catch((fetchError) => {
        if (cancelled) return
        setError(fetchError?.message || T.loadFailed)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [editId, query.raw, router, staffId])

  const items = useMemo(
    () =>
      (staff || []).map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        bio: member.bio,
        photoUrl: member.photo_url,
      })),
    [staff],
  )

  if (redirecting) {
    return (
      <section style={{ padding: '48px 16px', textAlign: 'center' }}>
        <p>{T.redirecting}</p>
      </section>
    )
  }

  return (
    <>
      <section style={{ padding: '32px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>{T.title}</h1>
        <p style={{ color: '#666', maxWidth: '720px', margin: '0 auto' }}>{T.intro}</p>
      </section>

      <section style={{ padding: '24px 16px 40px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          {error && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '16px', padding: '16px 18px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} style={{ background: '#fff', borderRadius: '20px', padding: '18px', border: '1px solid #eee', minHeight: '220px' }}>
                  <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: '16px', background: '#f3f4f6', marginBottom: '14px' }} />
                  <div style={{ width: '60%', height: '16px', background: '#f3f4f6', borderRadius: '999px', marginBottom: '10px' }} />
                  <div style={{ width: '35%', height: '12px', background: '#f3f4f6', borderRadius: '999px', marginBottom: '14px' }} />
                  <div style={{ width: '100%', height: '40px', background: '#f3f4f6', borderRadius: '12px' }} />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '18px', padding: '32px', textAlign: 'center', color: '#666' }}>{T.noStaff}</div>
          ) : (
            <div style={{ display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {items.map((member) => (
                <Link key={member.id} href={`/booking/${encodeURIComponent(String(member.id))}`} style={{ textDecoration: 'none' }} className="btn-interactive">
                  <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #E8E0D5', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', height: '100%' }}>
                    <div style={{ aspectRatio: '4 / 3', background: 'linear-gradient(135deg, #f6efe4, #faf8f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ fontSize: '56px' }}>✂</div>
                      )}
                    </div>
                    <div style={{ padding: '18px' }}>
                      <div style={{ fontWeight: 800, color: '#3D3D3D', fontSize: '18px', marginBottom: '6px' }}>{member.name}</div>
                      <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {member.role || T.roleFallback}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, minHeight: '42px' }}>
                        {member.bio || '\u9032\u5165\u8a73\u60c5\u9801\u9762\u9078\u64c7\u670d\u52d9\u3001\u65e5\u671f\u8207\u9810\u7d04\u6642\u6bb5\u3002'}
                      </div>
                      <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', background: '#3D3D3D', color: '#fff', fontWeight: 800, textAlign: 'center' }}>
                        {T.cta}
                      </div>
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

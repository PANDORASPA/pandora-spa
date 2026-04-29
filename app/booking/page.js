'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { bookingOpsCopy } from '../components/admin/opsUi'

const T = {
  title: '選擇頭皮護理師',
  intro: '先選擇服務人員，再進入預約流程選擇頭皮護理服務、日期和可預約時段。',
  loading: bookingOpsCopy.loading || '載入中...',
  redirecting: '正在載入預約資料...',
  loadFailed: '無法載入預約入口',
  noStaff: '目前沒有可預約的頭皮護理師。',
  roleFallback: '頭皮護理師',
  cta: '開始預約',
  editFallback: '無法載入原預約，請到「我的預約」重新進入。',
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
      const nextQuery = params.toString()
      router.replace(`/booking/${encodeURIComponent(staffId)}${nextQuery ? `?${nextQuery}` : ''}`)
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
      <section className="vh-page-hero">
        <p className="vh-muted">{T.redirecting}</p>
      </section>
    )
  }

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">Online booking</span>
        <h1>{T.title}</h1>
        <p>{T.intro}</p>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          {error ? <div className="vh-alert vh-alert-error">{error}</div> : null}

          {loading ? (
            <div className="vh-staff-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="vh-staff-card vh-skeleton-card">
                  <div />
                  <span />
                  <span />
                  <button type="button" disabled>
                    {T.loading}
                  </button>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="vh-empty-card">{T.noStaff}</div>
          ) : (
            <div className="vh-staff-grid">
              {items.map((member) => (
                <Link key={member.id} href={`/booking/${encodeURIComponent(String(member.id))}`} className="vh-staff-card">
                  <div className="vh-staff-photo">
                    {member.photoUrl ? <img src={member.photoUrl} alt={member.name} /> : <span>HS</span>}
                  </div>
                  <div className="vh-staff-body">
                    <span className="vh-eyebrow">{member.role || T.roleFallback}</span>
                    <h2>{member.name}</h2>
                    <p>{member.bio || '進入詳情選擇頭皮護理服務、日期和預約時段。'}</p>
                    <span className="vh-card-cta">{T.cta}</span>
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

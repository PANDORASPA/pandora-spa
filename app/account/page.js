import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../lib/supabase/server'
import SignOutButton from './SignOutButton'

export default async function Account({ searchParams }) {
  const supabase = getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/account')
  }

  const { data: profile } = await supabase.from('member_profiles').select('*').eq('id', user.id).single()
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || '會員'
  const displayEmail = profile?.email || user.email || '-'
  const displayPhone = profile?.phone || user.user_metadata?.phone || ''
  const message = searchParams?.message || ''

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>
          會員<span style={{ color: '#A68B6A' }}>中心</span>
        </h1>
      </section>

      <section style={{ padding: '24px 16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {message === 'profile_incomplete' ? (
            <div
              style={{
                marginBottom: '16px',
                border: '1px solid #F59E0B',
                background: '#FFF7ED',
                color: '#92400E',
                borderRadius: '14px',
                padding: '14px 16px',
                lineHeight: 1.7,
              }}
            >
              你的會員資料尚未完全同步，但帳號已成功確認。請檢查姓名與電話是否完整。
            </div>
          ) : null}

          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #A68B6A, #8B7355)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                color: '#fff',
                margin: '0 auto 15px',
                fontWeight: 800,
              }}
            >
              {String(displayName).charAt(0)}
            </div>
            <h2 style={{ marginBottom: '5px' }}>{displayName}</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '6px' }}>{displayEmail}</p>
            {displayPhone ? <p style={{ color: '#999', fontSize: '13px' }}>{displayPhone}</p> : null}
          </div>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <Link
              href="/account/bookings"
              className="btn btn-interactive"
              style={{ background: '#A68B6A', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 700, textAlign: 'center' }}
            >
              我的預約
            </Link>
            <Link
              href="/services"
              className="btn btn-interactive"
              style={{
                background: '#fff',
                color: '#333',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: 700,
                textAlign: 'center',
                border: '1px solid #e5e7eb',
              }}
            >
              查看服務與套票
            </Link>
          </div>

          <SignOutButton />
        </div>
      </section>
    </>
  )
}

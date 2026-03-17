import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../lib/supabase/server'
import SignOutButton from './SignOutButton'

export default async function AccountPage({ searchParams }) {
  const supabase = getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/account')
  }

  const { data: profile } = await supabase.from('member_profiles').select('*').eq('id', user.id).maybeSingle()
  const denied = searchParams?.denied === 'admin'

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>會員中心</h1>
        <p style={{ color: '#666' }}>管理你的會員資料與個人預約紀錄。</p>
      </section>

      <section style={{ padding: '32px 16px 80px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gap: '18px' }}>
          {denied ? (
            <div className="admin-card" style={{ padding: '18px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>無法進入管理後台</strong>
              <span style={{ color: '#7C2D12' }}>這個帳號沒有 admin 權限，已帶你返回會員中心。</span>
            </div>
          ) : null}

          <div className="admin-card" style={{ padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #A68B6A, #8B7355)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#fff',
                fontSize: '28px',
                fontWeight: 700,
              }}
            >
              {(profile?.full_name || profile?.email || user.email || 'M').charAt(0).toUpperCase()}
            </div>
            <h2 style={{ marginBottom: '6px' }}>{profile?.full_name || '會員'}</h2>
            <p style={{ color: '#666', marginBottom: '4px' }}>{profile?.email || user.email}</p>
            <p style={{ color: '#666' }}>{profile?.phone || '尚未填寫電話'}</p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <Link
              href="/account/bookings"
              className="btn btn-interactive"
              style={{ background: '#A68B6A', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 700, textAlign: 'center' }}
            >
              我的預約
            </Link>
            <Link
              href="/booking"
              className="btn btn-interactive"
              style={{ background: '#fff', color: '#333', padding: '14px', borderRadius: '12px', fontWeight: 700, textAlign: 'center', border: '1px solid #ddd' }}
            >
              再次預約服務
            </Link>
          </div>

          <SignOutButton />
        </div>
      </section>
    </>
  )
}

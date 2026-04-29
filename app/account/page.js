import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../lib/supabase/server'
import SignOutButton from './SignOutButton'
import ProfileForm from './ProfileForm'

const shellStyle = {
  padding: '20px 16px max(36px, env(safe-area-inset-bottom))',
}

const cardStyle = {
  background: '#fff',
  borderRadius: '20px',
  padding: 'clamp(18px, 4vw, 28px)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
}

export default async function Account({ searchParams }) {
  const supabase = getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/account')
  }

  const { data: profile } = await supabase.from('member_profiles').select('*').eq('id', user.id).single()
  const [{ data: packageRows }, { data: pendingOrderRows }] = await Promise.all([
    supabase.from('user_tickets').select('id,remaining_count').eq('member_user_id', user.id).gt('remaining_count', 0),
    supabase.from('orders').select('id').eq('member_user_id', user.id).eq('status', 'awaiting_payment'),
  ])
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || '會員'
  const displayEmail = profile?.email || user.email || '-'
  const displayPhone = profile?.phone || user.user_metadata?.phone || ''
  const message = searchParams?.message || ''
  const profileIncomplete = !profile?.full_name || !profile?.phone
  const activePackageCount = packageRows?.length || 0
  const pendingOrderCount = pendingOrderRows?.length || 0

  return (
    <section style={shellStyle}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <div style={{ marginBottom: '18px' }}>
          <h1 style={{ fontSize: 'clamp(26px, 6vw, 32px)', fontWeight: 800, lineHeight: 1.2, marginBottom: '10px' }}>
            會員
            <span style={{ color: '#8BA58B' }}>中心</span>
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: 1.7 }}>在這裡查看會員資料、我的套票、待付款套票訂單和頭皮護理預約。</p>
        </div>

        {message === 'profile_incomplete' || profileIncomplete ? (
          <div
            style={{
              marginBottom: '16px',
              border: '1px solid #D8B26E',
              background: '#FFF8E8',
              color: '#75531E',
              borderRadius: '14px',
              padding: '14px 16px',
              lineHeight: 1.7,
            }}
          >
            你的會員資料尚未完整。請先補回姓名和電話，之後便可用會員資料提交預約。
          </div>
        ) : null}

        <div style={{ ...cardStyle, textAlign: 'center', marginBottom: '18px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8BA58B, #6F5942)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#fff',
              margin: '0 auto 15px',
              fontWeight: 800,
            }}
          >
            {String(displayName).charAt(0).toUpperCase()}
          </div>
          <h2 style={{ marginBottom: '6px' }}>{displayName}</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '6px' }}>{displayEmail}</p>
          {displayPhone ? <p style={{ color: '#999', fontSize: '13px' }}>{displayPhone}</p> : null}
        </div>

        {profileIncomplete ? (
          <div style={{ ...cardStyle, marginBottom: '18px' }}>
            <h3 style={{ marginBottom: '10px' }}>完成會員資料</h3>
            <ProfileForm initialName={profile?.full_name || ''} initialPhone={profile?.phone || ''} />
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
          <Link
            href="/account/tickets"
            className="btn btn-interactive"
            style={{
              background: '#fff',
              color: '#333',
              padding: '14px',
              borderRadius: '14px',
              fontWeight: 700,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}
          >
            我的套票 · {activePackageCount} 個可用{pendingOrderCount ? ` · ${pendingOrderCount} 張待付款訂單` : ''}
          </Link>
          <Link
            href="/account/bookings"
            className="btn btn-interactive"
            style={{ background: '#8BA58B', color: '#fff', padding: '14px', borderRadius: '14px', fontWeight: 700, textAlign: 'center' }}
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
              borderRadius: '14px',
              fontWeight: 700,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}
          >
            查看頭皮護理服務及套票
          </Link>
        </div>

        <SignOutButton />
      </div>
    </section>
  )
}

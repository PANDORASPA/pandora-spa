import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerClient } from '../../lib/supabase/server'
import SignOutButton from './SignOutButton'

export default async function Account() {
  const supabase = getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/account')
  }

  const { data: profile } = await supabase.from('member_profiles').select('*').eq('id', user.id).single()

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>會員<span style={{ color: '#A68B6A' }}>中心</span></h1>
      </section>

      <section style={{ padding: '24px 16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#fff', margin: '0 auto 15px' }}>
              {(profile?.full_name || profile?.email || user.email || '會員').toString().charAt(0)}
            </div>
            <h2 style={{ marginBottom: '5px' }}>{profile?.full_name || '會員'}</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>{profile?.email || user.email}</p>
          </div>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <Link href="/account/bookings" className="btn btn-interactive" style={{ background: '#A68B6A', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 700, textAlign: 'center' }}>
              📅 我的預約
            </Link>
          </div>

          <SignOutButton />
        </div>
      </section>
    </>
  )
}


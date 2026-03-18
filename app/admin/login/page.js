'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../../lib/supabase/browser'

function AdminLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = useMemo(() => searchParams.get('redirectTo') || '/admin', [searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getBrowserClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user
      if (!user) return

      const { data: profile } = await supabase.from('member_profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (profile?.is_admin) {
        router.replace(redirectTo)
      }
    })
  }, [redirectTo, router])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const supabase = getBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('member_profiles').select('is_admin').eq('id', user.id).maybeSingle()

      if (!profile?.is_admin) {
        await supabase.auth.signOut()
        throw new Error('這個帳戶沒有後台權限')
      }

      toast.success('後台登入成功')
      router.replace(redirectTo)
    } catch (error) {
      toast.error('登入失敗: ' + (error?.message || '請稍後再試'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#F4EFE8', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>管理後台登入</h1>
        <p style={{ color: '#666' }}>只提供已授權的管理帳戶使用。</p>
      </section>

      <section style={{ padding: '32px 16px' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>管理帳戶電郵</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>密碼</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-interactive" style={{ width: '100%', background: '#3D3D3D', color: '#fff', padding: '12px', borderRadius: '12px', fontWeight: 700 }}>
              {loading ? '登入中...' : '登入後台'}
            </button>
          </form>

          <div style={{ marginTop: '18px', fontSize: '14px' }}>
            <Link href="/login" style={{ color: '#777' }}>
              返回會員登入
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginInner />
    </Suspense>
  )
}

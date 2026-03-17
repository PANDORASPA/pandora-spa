'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectToParam = searchParams.get('redirectTo') || '/account'
  const redirectTo = useMemo(
    () => (redirectToParam.startsWith('/admin') ? '/account' : redirectToParam),
    [redirectToParam]
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
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

      if (error) {
        throw error
      }

      toast.success('會員登入成功')
      router.replace(redirectTo)
    } catch (error) {
      toast.error(`登入失敗: ${error?.message || '請稍後再試'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>會員登入</h1>
        <p style={{ color: '#666' }}>登入後可查看預約、管理個人資料與完成預約流程。</p>
      </section>

      <section style={{ padding: '32px 16px' }}>
        <div
          style={{
            maxWidth: '420px',
            margin: '0 auto',
            background: '#fff',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>電郵</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>密碼</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="請輸入密碼"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-interactive"
              style={{ width: '100%', background: '#A68B6A', color: '#fff', padding: '12px', borderRadius: '12px', fontWeight: 700 }}
            >
              {loading ? '登入中...' : '登入會員'}
            </button>
          </form>

          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '14px' }}>
            <Link href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ color: '#A68B6A', fontWeight: 700 }}>
              建立會員帳戶
            </Link>
            <Link href="/admin/login" style={{ color: '#777' }}>
              管理後台登入
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

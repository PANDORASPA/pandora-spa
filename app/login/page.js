'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/account'
  const message = searchParams.get('message') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let supabase
    try {
      supabase = getBrowserClient()
    } catch {
      return
    }

    if (message === 'confirm_failed') {
      toast.error('電郵確認失敗，請重新開啟確認信或再次登入。')
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace(redirectTo)
    })
  }, [message, redirectTo, router])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const supabase = getBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email: String(email).trim(), password })
      if (error) throw error
      toast.success('登入成功')
      router.replace(redirectTo)
    } catch (error) {
      toast.error('登入失敗：' + (error?.message || '請稍後再試'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>
          登入<span style={{ color: '#A68B6A' }}>會員</span>
        </h1>
      </section>

      <section style={{ padding: '24px 16px' }}>
        <div
          style={{
            maxWidth: '420px',
            margin: '0 auto',
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
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
              {loading ? '登入中…' : '登入'}
            </button>
          </form>

          <div style={{ marginTop: '16px', display: 'grid', gap: '10px', fontSize: '14px' }}>
            <Link href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ color: '#A68B6A', fontWeight: 700 }}>
              註冊新帳號
            </Link>
            <span style={{ color: '#999' }}>如忘記密碼，可在 Supabase Auth 後台重設。</span>
          </div>
        </div>
      </section>
    </>
  )
}

export default function Login() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

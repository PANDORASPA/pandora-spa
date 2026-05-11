'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

const shellStyle = {
  padding: '20px 16px max(36px, env(safe-area-inset-bottom))',
}

const cardStyle = {
  maxWidth: '460px',
  margin: '0 auto',
  background: '#fff',
  borderRadius: '20px',
  padding: 'clamp(18px, 4vw, 28px)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
}

const titleStyle = {
  fontSize: 'clamp(26px, 6vw, 32px)',
  fontWeight: 800,
  lineHeight: 1.2,
  marginBottom: '10px',
}

const subtitleStyle = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: 1.7,
  marginBottom: '20px',
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  background: '#fff',
  fontSize: '16px',
}

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
      toast.error('電郵確認失敗，請重新開啟確認信，或返回登入頁再試一次。')
    }

    if (message === 'profile_incomplete') {
      toast.error('會員資料尚未完全同步，請先登入會員中心檢查資料。')
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
      const { error } = await supabase.auth.signInWithPassword({
        email: String(email).trim().toLowerCase(),
        password,
      })
      if (error) throw error
      toast.success('登入成功')
      router.replace(redirectTo)
    } catch (error) {
      toast.error(`登入失敗：${error?.message || '請稍後再試'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={shellStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>
          會員
          <span style={{ color: '#A68B6A' }}>登入</span>
        </h1>
        <p style={subtitleStyle}>登入後可查看會員資料、我的套票，以及完成確認信後的後續流程。</p>

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>電郵地址</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>密碼</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="請輸入密碼"
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-interactive"
            style={{ width: '100%', minHeight: '52px', background: '#A68B6A', color: '#fff', borderRadius: '14px', fontWeight: 700 }}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div style={{ marginTop: '16px', display: 'grid', gap: '10px', fontSize: '14px' }}>
          <Link href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ color: '#A68B6A', fontWeight: 700 }}>
            註冊新帳戶
          </Link>
          <span style={{ color: '#999' }}>如忘記密碼，請聯絡店舖協助重設。</span>
        </div>
      </div>
    </section>
  )
}

export default function Login() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

const getSiteUrl = () => {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim()
  if (configured) return configured.replace(/\/+$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

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
  display: 'grid',
  gap: '18px',
}

const titleStyle = {
  fontSize: 'clamp(26px, 6vw, 32px)',
  fontWeight: 800,
  lineHeight: 1.2,
  margin: 0,
}

const subtitleStyle = {
  color: '#6B7280',
  fontSize: '14px',
  lineHeight: 1.7,
  margin: 0,
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  background: '#fff',
  fontSize: '16px',
}

function RegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/account'

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let supabase
    try {
      supabase = getBrowserClient()
    } catch {
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace(redirectTo)
    })
  }, [redirectTo, router])

  const validateForm = () => {
    if (!String(fullName).trim()) {
      toast.error('請輸入姓名')
      return false
    }
    if (!String(phone).trim()) {
      toast.error('請輸入電話')
      return false
    }
    if (!String(email).trim()) {
      toast.error('請輸入電郵地址')
      return false
    }
    if (!String(password).trim()) {
      toast.error('請輸入密碼')
      return false
    }
    if (String(password).length < 6) {
      toast.error('密碼最少需要 6 個字元')
      return false
    }
    if (password !== confirmPassword) {
      toast.error('兩次輸入的密碼不一致')
      return false
    }
    return true
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const supabase = getBrowserClient()
      const trimmedName = String(fullName).trim()
      const trimmedPhone = String(phone).trim()
      const trimmedEmail = String(email).trim().toLowerCase()
      const siteUrl = getSiteUrl()
      const emailRedirectTo = siteUrl ? `${siteUrl}/auth/callback?next=${encodeURIComponent('/account')}` : undefined

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: trimmedName,
            phone: trimmedPhone,
          },
        },
      })

      if (error) throw error

      if (data?.session) {
        toast.success('註冊成功，正在帶你進入會員中心')
        router.replace('/account')
        return
      }

      toast.success('註冊成功，請到電郵完成確認；確認後可登入會員中心')
      router.replace(`/login?redirectTo=${encodeURIComponent('/account')}`)
    } catch (error) {
      const message = String(error?.message || '').toLowerCase()
      if (message.includes('user already registered')) {
        toast.error('這個電郵已經註冊，請直接登入')
      } else {
        toast.error(`註冊失敗：${error?.message || '請稍後再試'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <h1 style={titleStyle}>
            建立
            <span style={{ color: '#A68B6A' }}>會員帳戶</span>
          </h1>
          <p style={subtitleStyle}>完成註冊後，請到電郵完成確認。確認成功後，系統會帶你進入會員中心。</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>姓名</label>
            <input
              type="text"
              name="full_name"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="請輸入姓名"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>電話</label>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="請輸入電話"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>電郵地址</label>
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
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>密碼</label>
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="最少 6 個字元"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>確認密碼</label>
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再次輸入密碼"
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
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>

        <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#6B7280' }}>
          <div>如果你已經有帳戶，可以直接登入會員中心。</div>
          <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ color: '#A68B6A', fontWeight: 700 }}>
            返回登入
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Register() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  )
}

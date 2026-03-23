'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

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
      toast.error('請輸入姓名。')
      return false
    }
    if (!String(phone).trim()) {
      toast.error('請輸入電話。')
      return false
    }
    if (!String(email).trim()) {
      toast.error('請輸入電郵。')
      return false
    }
    if (!String(password).trim()) {
      toast.error('請輸入密碼。')
      return false
    }
    if (password !== confirmPassword) {
      toast.error('兩次輸入的密碼不一致。')
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
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const emailRedirectTo = origin ? `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` : undefined

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

      if (data?.user?.id) {
        const { error: profileError } = await supabase.from('member_profiles').upsert(
          {
            id: data.user.id,
            email: trimmedEmail,
            full_name: trimmedName,
            phone: trimmedPhone,
          },
          { onConflict: 'id' },
        )
        if (profileError) throw profileError
      }

      if (data?.session) {
        toast.success('註冊成功，正在進入會員中心。')
        router.replace(redirectTo)
      } else {
        toast.success('註冊成功，請先完成電郵確認。確認後會自動回到會員中心。')
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
      }
    } catch (error) {
      toast.error(`註冊失敗：${error?.message || '請稍後再試。'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>
          註冊<span style={{ color: '#A68B6A' }}>帳號</span>
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
          <form onSubmit={handleRegister} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>姓名</label>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="請輸入姓名"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>電話</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="請輸入電話"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>電郵地址</label>
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
                placeholder="至少 6 個字元"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>確認密碼</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="請再次輸入密碼"
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
              {loading ? '註冊中...' : '註冊'}
            </button>
          </form>

          <div style={{ marginTop: '16px', display: 'grid', gap: '10px', fontSize: '14px', color: '#6B7280' }}>
            <div>註冊成功後，請先完成電郵確認。確認後會自動返回會員中心。</div>
            <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ color: '#A68B6A', fontWeight: 700 }}>
              返回登入
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default function Register() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  )
}

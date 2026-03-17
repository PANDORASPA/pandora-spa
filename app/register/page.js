'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

function RegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectToParam = searchParams.get('redirectTo') || '/account'
  const redirectTo = useMemo(
    () => (redirectToParam.startsWith('/admin') ? '/account' : redirectToParam),
    [redirectToParam]
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        router.replace(redirectTo)
      }
    })
  }, [redirectTo, router])

  const handleRegister = async (event) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error('兩次密碼輸入不一致')
      return
    }

    setLoading(true)

    try {
      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        throw error
      }

      if (data?.session) {
        toast.success('註冊成功，已為你登入')
        router.replace(redirectTo)
        return
      }

      toast.success('註冊成功，請先到電郵完成確認')
      router.replace('/login')
    } catch (error) {
      toast.error(`註冊失敗: ${error?.message || '請稍後再試'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>建立會員帳戶</h1>
        <p style={{ color: '#666' }}>完成註冊後，你可以管理預約與查看自己的會員資料。</p>
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
          <form onSubmit={handleRegister} style={{ display: 'grid', gap: '14px' }}>
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

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>確認密碼</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次輸入密碼"
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
              {loading ? '註冊中...' : '建立會員帳戶'}
            </button>
          </form>

          <div style={{ marginTop: '18px', fontSize: '14px' }}>
            <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} style={{ color: '#A68B6A', fontWeight: 700 }}>
              返回會員登入
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  )
}

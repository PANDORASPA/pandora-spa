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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let supabase
    try {
      supabase = getBrowserClient()
    } catch (e) {
      return
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace(redirectTo)
    })
  }, [router, redirectTo])

  const handleRegister = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('兩次密碼不一致')
      return
    }
    setLoading(true)
    try {
      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data?.user) {
        toast.success('註冊成功')
      } else {
        toast.success('註冊成功，請查收電郵完成驗證')
      }
      router.replace(redirectTo)
    } catch (err) {
      toast.error('註冊失敗: ' + (err?.message || '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '30px 16px', background: '#FAF8F5', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>註冊<span style={{ color: '#A68B6A' }}>會員</span></h1>
      </section>

      <section style={{ padding: '24px 16px' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleRegister} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>電郵</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>確認密碼</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
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


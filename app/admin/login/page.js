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
    const checkExistingAdmin = async () => {
      const supabase = getBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from('member_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.is_admin) {
        router.replace(redirectTo)
      }
    }

    checkExistingAdmin()
  }, [redirectTo, router])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const supabase = getBrowserClient()
      const normalizedEmail = String(email || '').trim().toLowerCase()
      const {
        data: signInData,
        error: signInError,
      } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

      if (signInError) throw signInError

      const signedInUser = signInData?.user
      if (!signedInUser) {
        throw new Error('登入成功，但未取得有效的使用者 session。')
      }

      const { data: profile, error: profileError } = await supabase
        .from('member_profiles')
        .select('is_admin')
        .eq('id', signedInUser.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.is_admin) {
        await supabase.auth.signOut()
        if (!profile) {
          throw new Error('找不到對應的會員資料，請先確認此帳號是否已完成註冊。')
        }
        throw new Error('此帳號未開通管理員權限。')
      }

      toast.success('管理員登入成功')
      router.replace(redirectTo)
      router.refresh()
    } catch (error) {
      const message = String(error?.message || '')
      const authFailed =
        message.includes('Invalid login credentials') ||
        message.includes('Email not confirmed') ||
        message.includes('Email rate limit exceeded')
      toast.error(authFailed ? `登入失敗：${message}` : `管理員登入失敗：${message || '請稍後再試。'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#F4EFE8', textAlign: 'center' }}>
        <h1 style={{ fontSize: '30px', marginBottom: '8px' }}>管理員登入</h1>
        <p style={{ color: '#666' }}>只有已開通管理員權限的帳號才可以進入後台。</p>
      </section>

      <section style={{ padding: '32px 16px' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', background: '#fff', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>管理員電郵</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e5e5e5' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-interactive"
              style={{ width: '100%', background: '#3D3D3D', color: '#fff', padding: '12px', borderRadius: '12px', fontWeight: 700 }}
            >
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

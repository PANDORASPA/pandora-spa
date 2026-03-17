'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { getBrowserClient } from '../../lib/supabase/browser'

export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const supabase = getBrowserClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('已登出')
      router.replace('/')
    } catch (err) {
      toast.error('登出失敗: ' + (err?.message || '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      style={{ width: '100%', padding: '14px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#666', cursor: 'pointer', fontSize: '15px' }}
    >
      {loading ? '登出中...' : '登出'}
    </button>
  )
}


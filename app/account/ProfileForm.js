'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  background: '#fff',
  fontSize: '16px',
}

export default function ProfileForm({ initialName = '', initialPhone = '' }) {
  const [fullName, setFullName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [saving, setSaving] = useState(false)

  const saveProfile = async (event) => {
    event.preventDefault()
    const trimmedName = String(fullName || '').trim()
    const trimmedPhone = String(phone || '').trim()

    if (!trimmedName) {
      toast.error('請輸入姓名')
      return
    }
    if (!trimmedPhone) {
      toast.error('請輸入電話')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: trimmedName, phone: trimmedPhone }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || '會員資料儲存失敗')
      toast.success('會員資料已更新')
      window.location.reload()
    } catch (error) {
      toast.error(error?.message || '會員資料儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={saveProfile} style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
      <div>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>姓名</label>
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} style={inputStyle} placeholder="請輸入姓名" />
      </div>
      <div>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>電話</label>
        <input value={phone} onChange={(event) => setPhone(event.target.value)} style={inputStyle} placeholder="請輸入電話" inputMode="tel" />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="btn btn-interactive"
        style={{ width: '100%', minHeight: '48px', borderRadius: '14px', background: '#A68B6A', color: '#fff', fontWeight: 800 }}
      >
        {saving ? '儲存中...' : '更新會員資料'}
      </button>
    </form>
  )
}

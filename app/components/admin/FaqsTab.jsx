'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function FaqsTab({ faqs: initialFaqs }) {
  const [faqs, setFaqs] = useState(initialFaqs || [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFaqs(initialFaqs || [])
  }, [initialFaqs])

  const addFaq = () => {
    setFaqs((prev) => [...prev, { id: Date.now(), question: '新問題', answer: '', sort_order: 0, enabled: true }])
  }

  const saveFaqs = async () => {
    setSaving(true)
    try {
      const { data: existingRows, error: fetchError } = await supabase.from('faqs').select('id')
      if (fetchError) throw fetchError

      const existingIds = (existingRows || []).map((item) => item.id).filter(Boolean)
      const nextIds = faqs.map((item) => item.id).filter((id) => typeof id === 'number' && id <= 2147483647)
      const deletedIds = existingIds.filter((id) => !nextIds.includes(id))

      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase.from('faqs').delete().in('id', deletedIds)
        if (deleteError) throw deleteError
      }

      for (const faq of faqs) {
        const payload = { ...faq }
        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
        const { error } = await supabase.from('faqs').upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }

      toast.success('FAQ 已保存')
    } catch (error) {
      toast.error('FAQ 保存失敗: ' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const deleteFaq = async (id) => {
    if (!confirm('確定刪除？')) return
    setFaqs((prev) => prev.filter((item) => item.id !== id))

    if (typeof id === 'number' && id <= 2147483647) {
      const { error } = await supabase.from('faqs').delete().eq('id', id)
      if (error) {
        toast.error('刪除失敗: ' + error.message)
        return
      }
    }

    toast.success('FAQ 已刪除')
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <button onClick={addFaq} className="btn btn-small btn-interactive">+ 新增 FAQ</button>
        <button onClick={saveFaqs} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
          {saving ? '保存中...' : '保存全部'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {faqs.map((faq) => (
          <div key={faq.id} className="admin-card" style={{ padding: '24px' }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 100px', gap: '20px', marginBottom: '16px' }}>
              <div>
                <label>問題</label>
                <input value={faq.question} onChange={(event) => setFaqs(faqs.map((item) => (item.id === faq.id ? { ...item, question: event.target.value } : item)))} style={{ fontWeight: 600 }} />
              </div>
              <div>
                <label>排序</label>
                <input type="number" value={faq.sort_order || 0} onChange={(event) => setFaqs(faqs.map((item) => (item.id === faq.id ? { ...item, sort_order: parseInt(event.target.value, 10) || 0 } : item)))} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>答案</label>
              <textarea value={faq.answer || ''} onChange={(event) => setFaqs(faqs.map((item) => (item.id === faq.id ? { ...item, answer: event.target.value } : item)))} style={{ minHeight: '100px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" checked={!!faq.enabled} onChange={(event) => setFaqs(faqs.map((item) => (item.id === faq.id ? { ...item, enabled: event.target.checked } : item)))} style={{ width: 'auto' }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>啟用顯示</span>
              </label>
              <button onClick={() => deleteFaq(faq.id)} className="btn-interactive" style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                刪除
              </button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && <div className="admin-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)', borderStyle: 'dashed', background: 'transparent' }}>暫時沒有 FAQ。</div>}
      </div>
    </div>
  )
}

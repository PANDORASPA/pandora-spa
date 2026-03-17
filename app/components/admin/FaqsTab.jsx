'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function FaqsTab({ faqs: initialFaqs }) {
  const [faqs, setFaqs] = useState(initialFaqs)
  const [saving, setSaving] = useState(false)

  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now(), question: '新問題', answer: '', sort_order: 0, enabled: true }])
  }

  const saveFaqs = async () => {
    setSaving(true)
    for (const f of faqs) {
      const { id, ...data } = f
      const payload = typeof id === 'number' && id > 1000000000 ? data : f
      await supabase.from('faqs').upsert(payload)
    }
    toast.success('FAQ 已儲存')
    setSaving(false)
  }

  const deleteFaq = async (id) => {
    if (!confirm('確定刪除？')) return
    await supabase.from('faqs').delete().eq('id', id)
    setFaqs(faqs.filter(f => f.id !== id))
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <button onClick={addFaq} className="btn btn-small btn-interactive">+ 新增常見問題</button>
        <button 
          onClick={saveFaqs} 
          disabled={saving} 
          className="btn btn-small btn-interactive" 
          style={{ background: '#34D399' }}
        >
          {saving && <span className="spinner"></span>}
          {saving ? '儲存中...' : '💾 儲存所有變更'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {faqs.map(f => (
          <div key={f.id} className="admin-card" style={{ padding: '24px' }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 100px', gap: '20px', marginBottom: '16px' }}>
              <div>
                <label>問題內容</label>
                <input 
                  value={f.question} 
                  onChange={e => setFaqs(faqs.map(x => x.id === f.id ? {...x, question: e.target.value} : x))} 
                  placeholder="例如: 預約後可以更改時間嗎？"
                  style={{ fontWeight: 600 }}
                />
              </div>
              <div>
                <label>排序</label>
                <input 
                  type="number" 
                  value={f.sort_order} 
                  onChange={e => setFaqs(faqs.map(x => x.id === f.id ? {...x, sort_order: parseInt(e.target.value)} : x))} 
                />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>詳細解答</label>
              <textarea 
                value={f.answer} 
                onChange={e => setFaqs(faqs.map(x => x.id === f.id ? {...x, answer: e.target.value} : x))} 
                placeholder="輸入詳細的解答內容..."
                style={{ minHeight: '100px', resize: 'vertical' }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={f.enabled} 
                  onChange={e => setFaqs(faqs.map(x => x.id === f.id ? {...x, enabled: e.target.checked} : x))} 
                  style={{ width: 'auto' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>啟用顯示</span>
              </label>
              <button 
                onClick={() => deleteFaq(f.id)} 
                className="btn-interactive"
                style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                刪除
              </button>
            </div>
          </div>
        ))}
        {faqs.length === 0 && (
          <div className="admin-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)', borderStyle: 'dashed', background: 'transparent' }}>
            暫無常見問題，請點擊上方按鈕新增。
          </div>
        )}
      </div>
    </div>
  )
}

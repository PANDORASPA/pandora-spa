'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function ArticlesTab({ articles: initialArticles }) {
  const [articles, setArticles] = useState(initialArticles)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [saving, setSaving] = useState(false)

  const addArticle = () => {
    const newArt = {
      id: Date.now(),
      title: '新文章',
      category: '未分類',
      excerpt: '',
      content: '',
      image_url: '',
      enabled: true,
      sort_order: 0
    }
    setArticles([newArt, ...articles])
    setSelectedArticle(newArt)
  }

  const saveArticles = async () => {
    setSaving(true)
    for (const a of articles) {
      const { id, ...data } = a
      // If ID is a timestamp (new article), don't include it so Supabase generates a serial ID
      const payload = typeof id === 'number' && id > 1000000000 ? data : a
      await supabase.from('articles').upsert(payload)
    }
    toast.success('文章已儲存')
    setSaving(false)
  }

  const deleteArticle = async (id) => {
    if (!confirm('確定刪除此文章？')) return
    await supabase.from('articles').delete().eq('id', id)
    setArticles(articles.filter(a => a.id !== id))
    setSelectedArticle(null)
  }

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ width: '300px', flexShrink: 0 }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <button onClick={addArticle} className="btn btn-small btn-interactive" style={{ flex: 1 }}>+ 新增文章</button>
          <button 
            onClick={saveArticles} 
            disabled={saving} 
            className="btn btn-small btn-interactive" 
            style={{ background: '#34D399', padding: '10px 15px' }}
          >
            {saving ? <span className="spinner" style={{ margin: 0 }}></span> : '💾'}
          </button>
        </div>
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          {articles.map(a => (
            <div 
              key={a.id} 
              onClick={() => setSelectedArticle(a)} 
              className="admin-table-row"
              style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #f5f5f5', 
                cursor: 'pointer',
                background: selectedArticle?.id === a.id ? 'rgba(166, 139, 106, 0.05)' : 'transparent',
                borderLeft: selectedArticle?.id === a.id ? '4px solid var(--primary)' : '4px solid transparent'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: selectedArticle?.id === a.id ? 'var(--primary)' : 'var(--text)' }}>{a.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.category}</span>
                <span className={`badge ${a.enabled ? 'badge-success' : 'badge-outline'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {a.enabled ? '已發佈' : '草稿'}
                </span>
              </div>
            </div>
          ))}
          {articles.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>暫無文章</div>}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: '400px' }}>
        {selectedArticle ? (
          <div className="admin-card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>編輯內容</h3>
              <button 
                onClick={() => deleteArticle(selectedArticle.id)} 
                className="btn-interactive"
                style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
              >
                刪除文章
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label>文章標題</label>
                <input 
                  value={selectedArticle.title} 
                  onChange={e => { const n = {...selectedArticle, title: e.target.value}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                  placeholder="輸入吸引人的標題..."
                />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>分類標籤</label>
                  <input 
                    value={selectedArticle.category} 
                    onChange={e => { const n = {...selectedArticle, category: e.target.value}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                    placeholder="例如: 髮型趨勢"
                  />
                </div>
                <div>
                  <label>顯示排序</label>
                  <input 
                    type="number" 
                    value={selectedArticle.sort_order} 
                    onChange={e => { const n = {...selectedArticle, sort_order: parseInt(e.target.value)}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                  />
                </div>
              </div>
              <div>
                <label>封面圖片網址</label>
                <input 
                  value={selectedArticle.image_url} 
                  onChange={e => { const n = {...selectedArticle, image_url: e.target.value}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <div>
                <label>文章摘要 (顯示在列表)</label>
                <textarea 
                  value={selectedArticle.excerpt} 
                  onChange={e => { const n = {...selectedArticle, excerpt: e.target.value}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div>
                <label>正文內容</label>
                <textarea 
                  value={selectedArticle.content} 
                  onChange={e => { const n = {...selectedArticle, content: e.target.value}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                  style={{ minHeight: '300px' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: 'fit-content' }}>
                <input 
                  type="checkbox" 
                  checked={selectedArticle.enabled} 
                  onChange={e => { const n = {...selectedArticle, enabled: e.target.checked}; setSelectedArticle(n); setArticles(articles.map(x => x.id === n.id ? n : x)) }} 
                  style={{ width: 'auto' }}
                />
                <span style={{ fontWeight: 600 }}>公開發佈此文章</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-light)', borderStyle: 'dashed', background: 'transparent' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📝</div>
            <p style={{ fontSize: '16px' }}>請從左側列表選擇文章進行編輯，或點擊「新增文章」</p>
          </div>
        )}
      </div>
    </div>
  )
}

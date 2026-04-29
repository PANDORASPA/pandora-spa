'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function ArticlesTab({ articles: initialArticles }) {
  const [articles, setArticles] = useState(initialArticles)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [saving, setSaving] = useState(false)

  const updateSelectedArticle = (patch) => {
    const next = { ...selectedArticle, ...patch }
    setSelectedArticle(next)
    setArticles((current) => current.map((item) => (item.id === next.id ? next : item)))
  }

  const addArticle = () => {
    const newArticle = {
      id: Date.now(),
      title: '新文章',
      category: '頭皮護理',
      excerpt: '',
      content: '',
      image_url: '',
      enabled: true,
      sort_order: 0,
    }
    setArticles([newArticle, ...articles])
    setSelectedArticle(newArticle)
  }

  const saveArticles = async () => {
    setSaving(true)
    try {
      for (const article of articles) {
        const { id, ...data } = article
        const payload = typeof id === 'number' && id > 1000000000 ? data : article
        const { error } = await supabase.from('articles').upsert(payload)
        if (error) throw error
      }
      toast.success('文章已儲存')
    } catch (error) {
      toast.error(`文章儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteArticle = async (id) => {
    if (!confirm('確定要刪除此文章嗎？')) return
    await supabase.from('articles').delete().eq('id', id)
    setArticles(articles.filter((article) => article.id !== id))
    setSelectedArticle(null)
  }

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ width: '300px', flexShrink: 0 }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <button onClick={addArticle} className="btn btn-small btn-interactive" style={{ flex: 1 }}>+ 新增文章</button>
          <button onClick={saveArticles} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399', padding: '10px 15px' }}>
            {saving ? <span className="spinner" style={{ margin: 0 }} /> : '儲存'}
          </button>
        </div>
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="admin-table-row"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f5f5f5',
                cursor: 'pointer',
                background: selectedArticle?.id === article.id ? 'rgba(139, 165, 139, 0.08)' : 'transparent',
                borderLeft: selectedArticle?.id === article.id ? '4px solid var(--primary)' : '4px solid transparent',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: selectedArticle?.id === article.id ? 'var(--primary)' : 'var(--text)' }}>{article.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{article.category}</span>
                <span className={`badge ${article.enabled ? 'badge-success' : 'badge-outline'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {article.enabled ? '已公開' : '草稿'}
                </span>
              </div>
            </div>
          ))}
          {articles.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>暫無文章</div> : null}
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
              <label>
                文章標題
                <input value={selectedArticle.title} onChange={(event) => updateSelectedArticle({ title: event.target.value })} placeholder="輸入吸引人的文章標題..." />
              </label>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <label>
                  分類標籤
                  <input value={selectedArticle.category} onChange={(event) => updateSelectedArticle({ category: event.target.value })} placeholder="例如：頭皮護理" />
                </label>
                <label>
                  顯示排序
                  <input type="number" value={selectedArticle.sort_order} onChange={(event) => updateSelectedArticle({ sort_order: parseInt(event.target.value, 10) || 0 })} />
                </label>
              </div>
              <label>
                封面圖片網址
                <input value={selectedArticle.image_url} onChange={(event) => updateSelectedArticle({ image_url: event.target.value })} placeholder="https://images.unsplash.com/..." />
              </label>
              <label>
                文章摘要（顯示在列表）
                <textarea value={selectedArticle.excerpt} onChange={(event) => updateSelectedArticle({ excerpt: event.target.value })} style={{ minHeight: '80px' }} />
              </label>
              <label>
                正文內容
                <textarea value={selectedArticle.content} onChange={(event) => updateSelectedArticle({ content: event.target.value })} style={{ minHeight: '300px' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: 'fit-content' }}>
                <input type="checkbox" checked={selectedArticle.enabled} onChange={(event) => updateSelectedArticle({ enabled: event.target.checked })} style={{ width: 'auto' }} />
                <span style={{ fontWeight: 600 }}>公開發布此文章</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-light)', borderStyle: 'dashed', background: 'transparent' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>Article</div>
            <p style={{ fontSize: '16px' }}>請從左側列表選擇文章進行編輯，或新增一篇頭皮護理文章。</p>
          </div>
        )}
      </div>
    </div>
  )
}

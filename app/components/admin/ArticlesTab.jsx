'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function ArticlesTab({ articles: initialArticles }) {
  const [articles, setArticles] = useState(initialArticles || [])
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setArticles(initialArticles || [])
    setSelectedArticle((prev) => {
      if (!prev) return null
      return (initialArticles || []).find((item) => item.id === prev.id) || null
    })
  }, [initialArticles])

  const addArticle = () => {
    const draft = {
      id: Date.now(),
      title: '新文章',
      category: '',
      excerpt: '',
      content: '',
      image_url: '',
      enabled: true,
      sort_order: 0,
    }
    setArticles((prev) => [draft, ...prev])
    setSelectedArticle(draft)
  }

  const saveArticles = async () => {
    setSaving(true)
    try {
      const { data: existingRows, error: fetchError } = await supabase.from('articles').select('id')
      if (fetchError) throw fetchError

      const existingIds = (existingRows || []).map((item) => item.id).filter(Boolean)
      const nextIds = articles.map((item) => item.id).filter((id) => typeof id === 'number' && id <= 2147483647)
      const deletedIds = existingIds.filter((id) => !nextIds.includes(id))

      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase.from('articles').delete().in('id', deletedIds)
        if (deleteError) throw deleteError
      }

      for (const article of articles) {
        const payload = { ...article }
        if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
        const { error } = await supabase.from('articles').upsert(payload, { onConflict: 'id' })
        if (error) throw error
      }

      toast.success('文章已保存')
    } catch (error) {
      toast.error('文章保存失敗: ' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const deleteArticle = async (id) => {
    if (!confirm('確定刪除此文章？')) return
    const nextArticles = articles.filter((item) => item.id !== id)
    setArticles(nextArticles)
    setSelectedArticle((prev) => (prev?.id === id ? null : prev))

    if (typeof id === 'number' && id <= 2147483647) {
      const { error } = await supabase.from('articles').delete().eq('id', id)
      if (error) {
        toast.error('刪除失敗: ' + error.message)
        return
      }
    }

    toast.success('文章已刪除')
  }

  const updateSelectedArticle = (field, value) => {
    if (!selectedArticle) return
    const next = { ...selectedArticle, [field]: value }
    setSelectedArticle(next)
    setArticles((prev) => prev.map((item) => (item.id === next.id ? next : item)))
  }

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ width: '300px', flexShrink: 0 }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <button onClick={addArticle} className="btn btn-small btn-interactive" style={{ flex: 1 }}>
            + 新增文章
          </button>
          <button onClick={saveArticles} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399', padding: '10px 15px' }}>
            {saving ? '保存中' : '保存'}
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
                background: selectedArticle?.id === article.id ? 'rgba(166, 139, 106, 0.05)' : 'transparent',
                borderLeft: selectedArticle?.id === article.id ? '4px solid var(--primary)' : '4px solid transparent',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: selectedArticle?.id === article.id ? 'var(--primary)' : 'var(--text)' }}>{article.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{article.category || '未分類'}</span>
                <span>{article.enabled ? '已啟用' : '草稿'}</span>
              </div>
            </div>
          ))}
          {articles.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>暫時沒有文章</div>}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: '400px' }}>
        {selectedArticle ? (
          <div className="admin-card" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>編輯文章</h3>
              <button onClick={() => deleteArticle(selectedArticle.id)} className="btn-interactive" style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                刪除文章
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label>標題</label>
                <input value={selectedArticle.title} onChange={(event) => updateSelectedArticle('title', event.target.value)} />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>分類</label>
                  <input value={selectedArticle.category || ''} onChange={(event) => updateSelectedArticle('category', event.target.value)} />
                </div>
                <div>
                  <label>排序</label>
                  <input type="number" value={selectedArticle.sort_order || 0} onChange={(event) => updateSelectedArticle('sort_order', parseInt(event.target.value, 10) || 0)} />
                </div>
              </div>
              <div>
                <label>圖片網址</label>
                <input value={selectedArticle.image_url || ''} onChange={(event) => updateSelectedArticle('image_url', event.target.value)} />
              </div>
              <div>
                <label>摘要</label>
                <textarea value={selectedArticle.excerpt || ''} onChange={(event) => updateSelectedArticle('excerpt', event.target.value)} style={{ minHeight: '80px' }} />
              </div>
              <div>
                <label>內容</label>
                <textarea value={selectedArticle.content || ''} onChange={(event) => updateSelectedArticle('content', event.target.value)} style={{ minHeight: '300px' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: 'fit-content' }}>
                <input type="checkbox" checked={!!selectedArticle.enabled} onChange={(event) => updateSelectedArticle('enabled', event.target.checked)} style={{ width: 'auto' }} />
                <span style={{ fontWeight: 600 }}>公開顯示</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-light)', borderStyle: 'dashed', background: 'transparent' }}>
            請在左邊選擇文章，或者新增一篇新文章。
          </div>
        )}
      </div>
    </div>
  )
}

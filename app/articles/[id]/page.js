'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

export default function ArticleDetail() {
  const params = useParams()
  const router = useRouter()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticle() {
      if (!params.id) return
      setLoading(true)
      const { data, error } = await supabase.from('articles').select('*').eq('id', params.id).single()

      if (error || !data) {
        router.push('/articles')
        return
      }

      setArticle(data)
      setLoading(false)
    }
    fetchArticle()
  }, [params.id, router])

  if (loading) {
    return <div className="vh-loading">載入中...</div>
  }

  return (
    <>
      <section className="vh-page-hero">
        <div className="vh-container vh-narrow">
          <Link href="/articles" className="vh-text-link">
            ← 返回文章列表
          </Link>
          <div style={{ marginTop: '18px' }}>
            <span className="vh-chip">{article.category || '頭皮護理資訊'}</span>
            <h1 style={{ marginTop: '14px' }}>{article.title}</h1>
            <p>{new Date(article.created_at).toLocaleDateString('zh-HK')}</p>
          </div>
        </div>
      </section>

      <section className="vh-section">
        <div className="vh-container vh-narrow">
          {article.image_url ? <img src={article.image_url} alt={article.title} style={{ width: '100%', borderRadius: '18px', marginBottom: '28px' }} /> : null}
          <div style={{ fontSize: '17px', color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: '44px' }}>{article.content}</div>

          <div style={{ borderTop: '1px solid var(--gray)', paddingTop: '32px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px' }}>想預約頭皮護理或了解套票？</h3>
            <Link href="/booking" className="vh-btn vh-btn-primary">
              立即預約
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

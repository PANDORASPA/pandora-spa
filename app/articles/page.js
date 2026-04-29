'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true)
      const { data } = await supabase.from('articles').select('*').eq('enabled', true).order('sort_order')
      setArticles(data || [])
      setLoading(false)
    }

    fetchArticles()
  }, [])

  if (loading) {
    return <div className="vh-loading">載入中...</div>
  }

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">Care journal</span>
        <h1>
          頭皮護理<span>文章</span>
        </h1>
        <p>整理頭皮潔淨、舒緩保養、會員套票使用和店舖公告，讓客人在預約前更了解 PANDORA HEAD SPA 的護理節奏。</p>
      </section>

      <section className="vh-section">
        <div className="vh-container vh-narrow">
          {articles.length === 0 ? (
            <div className="vh-empty-card">
              <p>暫時未有公開文章。</p>
              <Link href="/services" className="vh-btn vh-btn-primary">
                查看頭皮護理服務
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {articles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`}>
                  <article className="vh-service-card">
                    <div className="vh-service-icon">READ</div>
                    <div>
                      {article.category ? <span className="vh-chip">{article.category}</span> : null}
                      <h2 style={{ fontSize: '20px', margin: '10px 0 8px' }}>{article.title}</h2>
                      <p>{article.excerpt || '店舖內容正在整理中。'}</p>
                      <span className="vh-card-cta">閱讀全文</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

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
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '36px 16px', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '30px', color: '#3D3D3D', marginBottom: '10px' }}>
            造型
            <span style={{ color: '#A68B6A' }}>專欄</span>
          </h1>
          <p style={{ color: '#666', lineHeight: 1.7 }}>
            整理髮型靈感、護理建議和店舖公告，讓內容區不再只是占位骨架。
          </p>
        </div>
      </section>

      <section style={{ padding: '28px 12px 48px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {articles.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '12px' }}>暫時未有公開文章。</p>
              <Link href="/team" className="btn" style={{ display: 'inline-block' }}>
                認識團隊
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {articles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
                  <article style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', padding: '18px 18px 20px' }}>
                    {article.category && (
                      <span style={{ display: 'inline-block', marginBottom: '10px', fontSize: '12px', color: '#A68B6A', background: '#FAF8F5', padding: '5px 10px', borderRadius: '999px' }}>
                        {article.category}
                      </span>
                    )}
                    <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '8px' }}>{article.title}</h2>
                    <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.7, marginBottom: '12px' }}>
                      {article.excerpt || '店舖內容正在整理中。'}
                    </p>
                    <div style={{ fontSize: '13px', color: '#A68B6A', fontWeight: 600 }}>閱讀全文</div>
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

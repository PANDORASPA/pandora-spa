'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true)
      const { data } = await supabase.from('articles').select('*').eq('enabled', true).order('sort_order')
      if (data) setArticles(data)
      setLoading(false)
    }
    fetchArticles()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>文章<span style={{ color: '#A68B6A' }}>資訊</span></h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {articles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有文章</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {articles.map(article => (
                <Link key={article.id} href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '12px', padding: '16px', cursor: 'pointer' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>{article.title}</h3>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{article.excerpt}</p>
                    {article.category && (
                      <span style={{ fontSize: '11px', color: '#A68B6A', background: '#FAF8F5', padding: '4px 8px', borderRadius: '4px' }}>{article.category}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

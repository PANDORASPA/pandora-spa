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
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (error || !data) {
        router.push('/articles')
        return
      }
      
      setArticle(data)
      setLoading(false)
    }
    fetchArticle()
  }, [params.id])

  if (loading) {
    return <div style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-light)' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '40px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href="/articles" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
            ← 返回文章列表
          </Link>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--primary)', background: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid var(--primary)' }}>
              {article.category || '髮型資訊'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
              {new Date(article.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1 style={{ fontSize: '32px', color: 'var(--text)', lineHeight: 1.3, marginBottom: '24px' }}>{article.title}</h1>
        </div>
      </section>

      <section style={{ padding: '40px 16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {article.image_url && (
            <img 
              src={article.image_url} 
              alt={article.title} 
              style={{ width: '100%', borderRadius: '16px', marginBottom: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} 
            />
          )}
          
          <div style={{ 
            fontSize: '17px', 
            color: '#444', 
            lineHeight: 1.8, 
            whiteSpace: 'pre-wrap',
            marginBottom: '60px'
          }}>
            {article.content}
          </div>

          <div style={{ borderTop: '1px solid var(--gray)', paddingTop: '40px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px' }}>想要專屬的髮型建議嗎？</h3>
            <Link href="/booking" className="btn btn-interactive" style={{ display: 'inline-block', padding: '14px 40px' }}>
              立即預約諮詢
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function FAQ() {
  const [faqs, setFaqs] = useState([])
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFaqs() {
      setLoading(true)
      const { data } = await supabase.from('faqs').select('*').eq('enabled', true).order('sort_order')
      if (data) setFaqs(data)
      setLoading(false)
    }
    fetchFaqs()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '30px 16px', minHeight: 'auto', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', color: '#3D3D3D' }}>常見<span style={{ color: '#A68B6A' }}>問題</span></h1>
        </div>
      </section>

      <section style={{ padding: '24px 12px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {faqs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>暫時沒有問題</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {faqs.map(faq => (
                <div key={faq.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '12px', overflow: 'hidden' }}>
                  <div 
                    onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>{faq.question}</span>
                    <span style={{ fontSize: '18px', color: '#A68B6A' }}>{openId === faq.id ? '−' : '+'}</span>
                  </div>
                  {openId === faq.id && (
                    <div style={{ padding: '0 16px 16px', fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

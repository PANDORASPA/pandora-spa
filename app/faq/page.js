'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function FAQPage() {
  const [faqs, setFaqs] = useState([])
  const [openId, setOpenId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFaqs() {
      setLoading(true)
      const { data } = await supabase.from('faqs').select('*').eq('enabled', true).order('sort_order')
      setFaqs(data || [])
      setLoading(false)
    }

    fetchFaqs()
  }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <>
      <section style={{ padding: '36px 16px', background: '#FAF8F5' }}>
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '30px', color: '#3D3D3D', marginBottom: '10px' }}>
            常見
            <span style={{ color: '#A68B6A' }}>問題</span>
          </h1>
          <p style={{ color: '#666', lineHeight: 1.7 }}>
            預約、改期、會員票券與產品訂購相關問題，都可以先在這裡快速查看。
          </p>
        </div>
      </section>

      <section style={{ padding: '28px 12px 48px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'grid', gap: '12px' }}>
          {faqs.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '12px' }}>暫時未有公開 FAQ。</p>
              <Link href="/booking" className="btn" style={{ display: 'inline-block' }}>
                前往預約
              </Link>
            </div>
          ) : (
            faqs.map((faq) => (
              <div key={faq.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '14px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  style={{
                    width: '100%',
                    padding: '18px 16px',
                    background: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#333' }}>{faq.question}</span>
                  <span style={{ fontSize: '20px', color: '#A68B6A' }}>{openId === faq.id ? '−' : '+'}</span>
                </button>
                {openId === faq.id && (
                  <div style={{ padding: '0 16px 18px', fontSize: '14px', color: '#666', lineHeight: 1.7 }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}

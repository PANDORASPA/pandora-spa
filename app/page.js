'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [services, setServices] = useState([])
  const [servicePackages, setServicePackages] = useState([])
  const [beforeAfter, setBeforeAfter] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [servicesData, pkgData, baData] = await Promise.all([
        supabase.from('services').select('*').eq('enabled', true).order('sort_order').limit(3),
        supabase.from('service_packages').select('*').eq('enabled', true).order('id'),
        supabase.from('before_after').select('*').eq('enabled', true).order('created_at', { ascending: false }).limit(6)
      ])
      
      if (servicesData.data) {
        setServices(servicesData.data.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          time: s.time ? `${s.time}分` : '60分',
          img: s.emoji || getServiceEmoji(s.name)
        })))
      }
      
      if (pkgData.data) {
        setServicePackages(pkgData.data.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          orig: p.orig,
          emoji: p.emoji || '💎'
        })))
      }
      
      if (baData.data) {
        setBeforeAfter(baData.data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const getServiceEmoji = (name) => {
    if (name.includes('剪')) return '✂️'
    if (name.includes('染')) return '🎨'
    if (name.includes('燙')) return '💇'
    if (name.includes('護')) return '💆'
    if (name.includes('头皮')) return '🧴'
    return '✂️'
  }

  const slides = [
    { title: 'VIVA HAIR', desc: '為您打造自然舒適的完美造型', bg: '#FAF8F5' },
    { title: '新客優惠', desc: '首次預約8折', bg: '#F5F0E8', badge: '限時' },
    { title: '會員積分', desc: '消費$1 = 1積分', bg: '#E8E0D5', link: '/login', linkText: '加入會員' },
  ]

  const tickets = [
    { id: 1, name: 'Basic套票', price: 680, orig: 860, times: 2, img: '🎁' },
    { id: 2, name: 'Premium套票', price: 1280, orig: 1680, times: 2, img: '💎' },
  ]

  return (
    <>
      {/* Hero Banner */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: slides[currentSlide].bg, padding: '20px' }}>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          {slides[currentSlide].badge && (
            <span style={{ background: '#A68B6A', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-block', marginBottom: '12px' }}>
              {slides[currentSlide].badge}
            </span>
          )}
          <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#3D3D3D', lineHeight: 1.2 }}>{slides[currentSlide].title}</h1>
          <p style={{ fontSize: '15px', color: '#666', marginBottom: '16px' }}>{slides[currentSlide].desc}</p>
          {slides[currentSlide].link ? (
            <Link href={slides[currentSlide].link} style={{ display: 'inline-block', padding: '14px 28px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
              {slides[currentSlide].linkText}
            </Link>
          ) : (
            <Link href="/booking" style={{ display: 'inline-block', padding: '14px 28px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
              立即預約
            </Link>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} style={{ width: '8px', height: '8px', borderRadius: '50%', border: 'none', background: currentSlide === i ? '#A68B6A' : '#ccc', cursor: 'pointer' }} />
          ))}
        </div>
      </section>

      {/* Before/After Gallery */}
      {beforeAfter.length > 0 && (
        <section style={{ padding: '32px 16px', background: '#fff' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px', color: '#3D3D3D' }}>Before / After</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {beforeAfter.map((item, idx) => (
                <div key={idx} style={{ borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                  <img src={item.image_url} alt={item.title || 'Before After'} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                  {item.title && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px', fontSize: '11px', textAlign: 'center' }}>
                      {item.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      <section style={{ padding: '32px 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px', color: '#3D3D3D' }}>熱門服務</h2>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#999' }}>載入中...</p>
          ) : services.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>暫時沒有服務</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {services.map((service) => (
                <div key={service.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: '#FAF8F5', borderRadius: '8px', marginBottom: '12px' }}>{service.img}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{service.name}</h3>
                  <p style={{ color: '#666', fontSize: '13px', marginBottom: '10px' }}>{service.time}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#A68B6A' }}>${service.price}</span>
                    <Link href="/booking" style={{ display: 'block', padding: '10px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>預約</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Service Packages */}
      {servicePackages.length > 0 && (
        <section style={{ padding: '32px 16px', background: '#FAF8F5' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px', color: '#3D3D3D' }}>💎 服務套餐</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {servicePackages.map(pkg => (
                <div key={pkg.id} style={{ background: '#fff', border: '2px solid #A68B6A', borderRadius: '16px', padding: '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#A68B6A', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                    套餐
                  </div>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>{pkg.emoji}</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{pkg.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#A68B6A' }}>${pkg.price}</span>
                    {pkg.orig > pkg.price && <span style={{ fontSize: '14px', color: '#999', textDecoration: 'line-through' }}>${pkg.orig}</span>}
                  </div>
                  <Link href="/booking" style={{ display: 'block', padding: '10px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, textAlign: 'center' }}>
                    立即預約
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Location / Google Maps */}
      <section style={{ padding: '32px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#3D3D3D' }}>📍 位置</h2>
          <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>九龍旺角彌敦道555號銀行中心A座</p>
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3610.494687583432!2d114.17319707677454!3d22.31930237459328!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x340400459e937f5d%3A0x3058e714c8536c06!2z5p6x5Lqs5aSn5riv5ZCI5ZCI6aaZ5riv!5e0!3m2!1szh-TW!2shk!4v1700000000000!5m2!1szh-TW!2shk"
              width="100%" 
              height="250" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy"
            />
          </div>
          <a 
            href="https://maps.google.com/?q=旺角彌敦道555號銀行中心" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ display: 'inline-block', padding: '10px 20px', background: '#fff', color: '#A68B6A', border: '1px solid #A68B6A', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}
          >
            Google Maps 開啟
          </a>
        </div>
      </section>

      {/* Tickets */}
      <section style={{ padding: '32px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px', color: '#3D3D3D' }}>套票優惠</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {tickets.map((ticket) => (
              <div key={ticket.id} style={{ background: '#fff', border: '1px solid #E8E0D5', borderRadius: '16px', padding: '20px', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#A68B6A', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>慳${ticket.orig - ticket.price}</span>
                <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: 'linear-gradient(135deg, #3D3D3D, #6B6B6B)', borderRadius: '8px', marginBottom: '15px', color: '#fff' }}>{ticket.img}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>{ticket.name}</h3>
                <p style={{ color: '#666', marginBottom: '15px' }}>{ticket.times}次</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#A68B6A' }}>${ticket.price}</span>
                  <Link href="/tickets" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>購買</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section style={{ padding: '24px 16px', background: '#fff' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#3D3D3D' }}>🕐 營業時間</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
            <div style={{ padding: '12px', background: '#FAF8F5', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>星期一至星期六</div>
              <div style={{ color: '#666' }}>09:00 - 19:00</div>
            </div>
            <div style={{ padding: '12px', background: '#FAF8F5', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>星期日</div>
              <div style={{ color: '#666' }}>10:00 - 18:00</div>
            </div>
          </div>
          <p style={{ marginTop: '12px', color: '#999', fontSize: '12px' }}>農曆新年及公眾假期休息</p>
        </div>
      </section>

      {/* Google Reviews */}
      <section style={{ padding: '24px 16px', background: '#FAF8F5' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#3D3D3D' }}>⭐ Google 評價</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '24px' }}>⭐</span>)}
          </div>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>4.8 分 (128 評價)</p>
          <a 
            href="https://search.google.com/local/reviews?place_id=YOUR_PLACE_ID"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#A68B6A', textDecoration: 'none', fontSize: '14px' }}
          >
            查看全部評價 →
          </a>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '32px 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#3D3D3D' }}>預約免費咨詢</h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>專業團隊為您打造完美造型</p>
          <Link href="/booking" style={{ display: 'inline-block', padding: '14px 32px', background: 'linear-gradient(135deg, #A68B6A, #8B7355)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>立即預約</Link>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/85212345678"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          width: '56px',
          height: '56px',
          background: '#25D366',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          textDecoration: 'none'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.464 1.065 2.945 1.04 3.086.034.149.269.298.596.447.151.015.342.015.465.008.121-.007.397-.026.565-.146.172-.124.435-.304.61-.45.181-.15.302-.249.434-.34.132-.091.264-.15.37-.149.108.001.37.01.569.008.199-.002.53-.002.77-.007.239-.005.475-.011.681-.001.206.009.526.053.747.301.221.249.385.571.398.649v.032c-.007.007-.019.027-.033.054-.015.028-.03.056-.046.083-.15.273-.323.545-.49.838-.181.297-.302.595-.42.908-.119.314-.084.555-.063.752-.021.196-.019.347.013.52.031.174.061.348.121.523l-.024.131c-.087.457-.264.919-.558 1.272-.295.353-.613.688-.988.918-.375.23-.775.398-1.243.496-.467.099-1.003.077-1.377.028-.375-.049-.728-.196-1.042-.436-.314-.24-.589-.539-.825-.818-.236-.279-.454-.581-.659-.879l-.137-.197c-.033-.053-.066-.106-.099-.159-.236-.376-.398-.771-.398-1.217 0-.446.116-.877.348-1.257.232-.38.581-.696 1.023-.958.442-.262.957-.398 1.481-.398.524 0 1.028.136 1.482.408.454.272.834.645 1.204 1.017.37.372.715.755 1.005 1.192.29.437.548.9.696 1.383.014.047.021.095.028.143.007.048.007.096.004.144l-.029.15z"/>
        </svg>
      </a>
    </>
  )
}

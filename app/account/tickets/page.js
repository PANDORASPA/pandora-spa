'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const formatCurrency = (value) => `$${Math.round(Number(value || 0))}`

const asArray = (value) => (Array.isArray(value) ? value : [])

const getFirstArray = (payload, keys) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key]
    if (Array.isArray(payload?.data?.[key])) return payload.data[key]
  }
  return []
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const getPackageName = (pkg) => pkg?.ticket_name || pkg?.ticket?.name || pkg?.name || pkg?.items || '套票'
const getRemaining = (pkg) => Number(pkg?.remaining_count ?? pkg?.remaining ?? pkg?.balance ?? 0)
const getInitialCount = (pkg) => Number(pkg?.initial_count ?? pkg?.total_count ?? pkg?.ticket?.count ?? pkg?.count ?? 0)

export default function AccountTicketsPage() {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/account/tickets', { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.error || '無法載入套票資料')
        }

        setPayload(data)
      } catch (loadError) {
        setError(loadError?.message || '無法載入套票資料')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const activePackages = useMemo(
    () =>
      getFirstArray(payload, ['activePackages', 'active_packages', 'userTickets', 'user_tickets', 'tickets', 'packages']).filter((pkg) => {
        const status = String(pkg?.status || '').toLowerCase()
        return (!status || status === 'active') && getRemaining(pkg) > 0
      }),
    [payload],
  )
  const pendingOrders = useMemo(
    () =>
      getFirstArray(payload, ['pendingOrders', 'pending_orders', 'orders']).filter((order) => {
        const status = String(order?.status || '').toLowerCase()
        return !status || status === 'awaiting_payment' || status === 'pending' || status === 'payment_pending'
      }),
    [payload],
  )
  const redemptionHistory = useMemo(() => getFirstArray(payload, ['redemptionHistory', 'redemption_history', 'redemptions', 'history', 'usages']), [payload])

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">My packages</span>
        <h1>
          我的<span>套票</span>
        </h1>
        <p>查看可用套票、待付款套票訂單和最近使用紀錄。預約適用頭皮護理服務時，可以選擇套票扣 1 次使用。</p>
      </section>

      <section className="vh-section">
        <div className="vh-container vh-narrow">
          <div className="vh-account-links">
            <Link href="/account">← 返回會員中心</Link>
            <Link href="/tickets">購買套票</Link>
          </div>

          {loading ? <Panel>載入套票資料中...</Panel> : null}
          {!loading && error ? (
            <Panel>
              <div style={{ color: '#B45309', fontWeight: 800, marginBottom: '8px' }}>暫時無法顯示套票</div>
              <div style={{ color: '#666', lineHeight: 1.7 }}>{error}</div>
            </Panel>
          ) : null}

          {!loading && !error ? (
            <div className="vh-account-ticket-stack">
              <Section title="可用套票" emptyText="目前沒有可用套票。">
                {activePackages.map((pkg) => {
                  const remaining = getRemaining(pkg)
                  const initialCount = getInitialCount(pkg)
                  return (
                    <article key={pkg.id || `${getPackageName(pkg)}-${pkg.created_at}`} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>{getPackageName(pkg)}</h3>
                          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                            剩餘 {remaining} 次{initialCount ? ` / 共 ${initialCount} 次` : ''}
                          </p>
                          {pkg.expiry_date ? <p style={{ margin: '8px 0 0', color: '#999', fontSize: '13px' }}>有效至 {formatDate(pkg.expiry_date)}</p> : null}
                        </div>
                        <span style={badgeStyle}>可使用</span>
                      </div>
                    </article>
                  )
                })}
              </Section>

              <Section title="待付款訂單" emptyText="目前沒有待付款訂單。">
                {pendingOrders.map((order) => (
                  <article key={order.id || order.ref} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '17px' }}>{order.items || order.ticket_name || '套票訂單'}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>訂單 {order.ref || `#${order.id}`}</p>
                        {order.created_at ? <p style={{ margin: '8px 0 0', color: '#999', fontSize: '13px' }}>{formatDate(order.created_at)}</p> : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#8BA58B', fontWeight: 800 }}>{formatCurrency(order.total)}</div>
                        <span style={{ ...badgeStyle, background: '#FEF3C7', color: '#B45309', marginTop: '8px' }}>待付款</span>
                      </div>
                    </div>
                  </article>
                ))}
              </Section>

              {asArray(redemptionHistory).length > 0 ? (
                <Section title="使用紀錄" emptyText="">
                  {redemptionHistory.map((item) => (
                    <article key={item.id || `${item.booking_id}-${item.created_at}`} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{item.ticket_name || item.package_name || '套票使用'}</h3>
                          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                            {item.service || item.service_name || item.description || item.note || '預約扣次'}
                          </p>
                          {item.delta != null ? (
                            <p style={{ margin: '6px 0 0', color: Number(item.delta) < 0 ? '#B45309' : '#15803D', fontSize: '13px', fontWeight: 800 }}>
                              {Number(item.delta) < 0 ? `已扣 ${Math.abs(Number(item.delta))} 次` : `已回補 ${Number(item.delta)} 次`}
                            </p>
                          ) : null}
                        </div>
                        <div style={{ color: '#999', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(item.created_at || item.used_at || item.date)}</div>
                      </div>
                    </article>
                  ))}
                </Section>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #E8E0D5',
  borderRadius: '16px',
  padding: '18px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
}

const badgeStyle = {
  display: 'inline-block',
  borderRadius: '999px',
  background: '#DCFCE7',
  color: '#15803D',
  fontSize: '12px',
  fontWeight: 800,
  padding: '6px 10px',
}

function Panel({ children }) {
  return <div style={{ ...cardStyle, textAlign: 'center', color: '#666', lineHeight: 1.7 }}>{children}</div>
}

function Section({ title, emptyText, children }) {
  const items = asArray(children)
  return (
    <section>
      <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>{title}</h2>
      {items.length > 0 ? <div style={{ display: 'grid', gap: '12px' }}>{items}</div> : emptyText ? <Panel>{emptyText}</Panel> : null}
    </section>
  )
}

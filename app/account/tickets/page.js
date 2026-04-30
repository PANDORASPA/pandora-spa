'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const formatCurrency = (value) => `$${Math.round(Number(value || 0)).toLocaleString('zh-HK')}`

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

const getPackageName = (pkg) => pkg?.ticket_name || pkg?.tickets?.name || pkg?.ticket?.name || pkg?.name || '套票'
const getRemaining = (pkg) => Number(pkg?.remaining_count ?? pkg?.remaining ?? pkg?.balance ?? 0)
const getInitialCount = (pkg) => Number(pkg?.initial_count ?? pkg?.total_count ?? pkg?.tickets?.count ?? pkg?.ticket?.count ?? pkg?.count ?? 0)
const getServiceName = (pkg) => pkg?.tickets?.services?.name || pkg?.service_name || pkg?.service || '適用服務依套票條款'

const getOrderStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'completed') return '已完成付款'
  if (normalized === 'payment_setup_failed') return '付款未完成'
  if (normalized === 'pending') return '付款處理中'
  return '待付款'
}

const getPaymentLabel = (order) => {
  const payment = String(order?.payment || order?.payment_method || '').toLowerCase()
  if (payment === 'stripe') return 'Stripe 線上付款'
  if (payment === 'manual') return '人工確認付款'
  return order?.payment || '待選擇付款方式'
}

const getDeltaText = (delta) => {
  const value = Number(delta || 0)
  if (value < 0) return `已扣 ${Math.abs(value)} 次`
  if (value > 0) return `已回補 ${value} 次`
  return '沒有變更次數'
}

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

  const ticketOrders = useMemo(() => getFirstArray(payload, ['ticketOrders', 'ticket_orders', 'pendingOrders', 'pending_orders', 'orders']), [payload])
  const pendingOrders = useMemo(
    () =>
      ticketOrders.filter((order) => {
        const status = String(order?.status || '').toLowerCase()
        return !status || ['awaiting_payment', 'pending', 'payment_pending', 'payment_setup_failed'].includes(status)
      }),
    [ticketOrders],
  )
  const redemptionHistory = useMemo(() => getFirstArray(payload, ['redemptionHistory', 'redemption_history', 'redemptions', 'history', 'usages']), [payload])

  return (
    <>
      <section className="vh-page-hero">
        <span className="vh-eyebrow">My packages</span>
        <h1>
          我的<span>套票</span>
        </h1>
        <p>查看可用套票、待付款訂單、Stripe 或人工付款狀態，以及每次預約扣次和取消回補紀錄。</p>
      </section>

      <section className="vh-section">
        <div className="vh-container vh-narrow">
          <div className="vh-account-links">
            <Link href="/account">← 返回會員中心</Link>
            <Link href="/tickets">購買套票</Link>
          </div>

          {loading ? <Panel>正在載入套票資料...</Panel> : null}
          {!loading && error ? (
            <Panel>
              <div style={{ color: '#B45309', fontWeight: 800, marginBottom: '8px' }}>暫時無法顯示套票</div>
              <div style={{ color: '#666', lineHeight: 1.7 }}>{error}</div>
            </Panel>
          ) : null}

          {!loading && !error ? (
            <div className="vh-account-ticket-stack">
              <TicketSection title="可用套票" emptyText="目前沒有可用套票。購買套票並完成付款後，套票會在這裡顯示。">
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
                          <p style={{ margin: '8px 0 0', color: '#666', fontSize: '13px' }}>適用：{getServiceName(pkg)}</p>
                          {pkg.expiry_date ? <p style={{ margin: '8px 0 0', color: '#999', fontSize: '13px' }}>有效至 {formatDate(pkg.expiry_date)}</p> : null}
                          {pkg.created_at ? <p style={{ margin: '8px 0 0', color: '#999', fontSize: '13px' }}>發放日期 {formatDate(pkg.created_at)}</p> : null}
                        </div>
                        <span style={badgeStyle}>可使用</span>
                      </div>
                    </article>
                  )
                })}
              </TicketSection>

              <TicketSection title="待處理付款" emptyText="目前沒有待付款套票訂單。">
                {pendingOrders.map((order) => (
                  <article key={order.id || order.ref} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '17px' }}>{order.items || order.ticket_name || '套票訂單'}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>訂單 {order.ref || `#${order.id}`}</p>
                        <p style={{ margin: '8px 0 0', color: '#666', fontSize: '13px' }}>付款方式：{getPaymentLabel(order)}</p>
                        {order.created_at ? <p style={{ margin: '8px 0 0', color: '#999', fontSize: '13px' }}>{formatDate(order.created_at)}</p> : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#8BA58B', fontWeight: 800 }}>{formatCurrency(order.total)}</div>
                        <span style={{ ...badgeStyle, background: '#FEF3C7', color: '#B45309', marginTop: '8px' }}>{getOrderStatusLabel(order.status)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </TicketSection>

              <TicketSection title="扣次與回補紀錄" emptyText="暫時沒有套票使用紀錄。">
                {redemptionHistory.map((item) => (
                  <article key={item.id || `${item.booking_id}-${item.created_at}`} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{item.ticket_name || item.package_name || '套票紀錄'}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                          {item.bookings?.service || item.service || item.service_name || item.note || item.reason || '預約套票扣次'}
                        </p>
                        {item.bookings?.ref || item.booking_id ? (
                          <p style={{ margin: '6px 0 0', color: '#999', fontSize: '13px' }}>相關預約：{item.bookings?.ref || `#${item.booking_id}`}</p>
                        ) : null}
                        <p style={{ margin: '6px 0 0', color: Number(item.delta) < 0 ? '#B45309' : '#15803D', fontSize: '13px', fontWeight: 800 }}>
                          {getDeltaText(item.delta)}
                        </p>
                      </div>
                      <div style={{ color: '#999', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(item.created_at || item.used_at || item.date)}</div>
                    </div>
                  </article>
                ))}
              </TicketSection>
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

function TicketSection({ title, emptyText, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  return (
    <section>
      <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>{title}</h2>
      {items.length > 0 ? <div style={{ display: 'grid', gap: '12px' }}>{items}</div> : emptyText ? <Panel>{emptyText}</Panel> : null}
    </section>
  )
}

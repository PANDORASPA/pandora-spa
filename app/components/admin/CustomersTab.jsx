'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const getCustomerName = (user) => user?.name || user?.full_name || user?.display_name || '會員'
const getCustomerPhone = (user) => user?.phone || user?.mobile || user?.customer_phone || '-'
const getBookingPhone = (booking) => booking?.phone || booking?.customer_phone || ''
const getBookingDate = (booking) => booking?.appointment_date || booking?.date || ''
const getBookingTime = (booking) => booking?.start_time || booking?.time || ''
const getBookingService = (booking) => booking?.service_name || booking?.service || '-'
const getOrderDate = (order) => order?.created_at || order?.ordered_at || order?.date || ''
const getOrderLabel = (order) => order?.ref || order?.order_no || order?.order_number || order?.id || '-'
const getTransactionDate = (transaction) => transaction?.occurred_at || transaction?.created_at || transaction?.date || ''
const getTransactionLabel = (transaction) => transaction?.ref || transaction?.payment_ref || transaction?.id || '-'
const getTicketLabel = (ticket, servicePackages = []) => {
  const packageName =
    ticket?.package_name ||
    ticket?.service_package_name ||
    servicePackages.find((item) => String(item?.id) === String(ticket?.service_package_id || ticket?.package_id))?.name ||
    ''
  return ticket?.name || ticket?.ticket_name || ticket?.title || packageName || `票券 #${ticket?.id || '-'}`
}

const toSortTimestamp = (value) => {
  if (!value) return 0
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

const formatActivityWhen = (value) => {
  if (!value) return '-'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return String(value)
  return new Date(timestamp).toLocaleString()
}

const getActivityKindLabel = (kind) => {
  switch (kind) {
    case 'booking':
      return '預約'
    case 'order':
      return '訂單'
    case 'transaction':
      return '交易'
    default:
      return '紀錄'
  }
}

const deriveTier = (spend) => {
  if (spend >= 10000) return 'VIP'
  if (spend >= 5000) return 'Gold'
  if (spend >= 2000) return 'Silver'
  return 'Regular'
}

const getTierLabel = (tier) =>
  ({
    VIP: 'VIP',
    Gold: '金級',
    Silver: '銀級',
    Regular: '一般',
  })[tier] || tier || '一般'

export default function CustomersTab({ users = [], bookings = [], orders = [], transactions = [], userTickets = [], servicePackages = [], onUpdateCustomer }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [notesDraft, setNotesDraft] = useState({})
  const [savingNotesId, setSavingNotesId] = useState(null)
  const [notesStatus, setNotesStatus] = useState({})

  const customerRows = useMemo(() => {
    return (users || []).map((user) => {
      const phone = getCustomerPhone(user)
      const matchedBookings = (bookings || []).filter((booking) => {
        const bookingPhone = getBookingPhone(booking)
        const userIdMatch = booking?.user_id && user?.id && String(booking.user_id) === String(user.id)
        return (bookingPhone && phone && bookingPhone === phone) || userIdMatch
      })
      const matchedOrders = (orders || []).filter((order) => {
        const userIdMatch = order?.member_user_id && user?.id && String(order.member_user_id) === String(user.id)
        const orderPhone = order?.phone || order?.user_phone || ''
        return userIdMatch || (orderPhone && phone && orderPhone === phone)
      })
      const matchedTransactions = (transactions || []).filter((transaction) => {
        const userIdMatch = transaction?.member_user_id && user?.id && String(transaction.member_user_id) === String(user.id)
        const customerIdMatch = transaction?.customer_id && user?.id && String(transaction.customer_id) === String(user.id)
        const transactionPhone = transaction?.phone || transaction?.customer_phone || ''
        const viaOrder = matchedOrders.some((order) => String(order?.id) === String(transaction?.order_id))
        const viaBooking = matchedBookings.some((booking) => String(booking?.id) === String(transaction?.booking_id))
        return userIdMatch || customerIdMatch || (transactionPhone && phone && transactionPhone === phone) || viaOrder || viaBooking
      })
      const matchedTickets = (userTickets || []).filter((ticket) => {
        const userIdMatch = ticket?.member_user_id && user?.id && String(ticket.member_user_id) === String(user.id)
        const customerIdMatch = ticket?.customer_id && user?.id && String(ticket.customer_id) === String(user.id)
        const ticketPhone = ticket?.phone || ticket?.customer_phone || ''
        return userIdMatch || customerIdMatch || (ticketPhone && phone && ticketPhone === phone)
      })
      const bookingSpend = matchedBookings.reduce((sum, booking) => sum + Number(booking.final_price || booking.service_price || 0), 0)
      const orderSpend = matchedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      const totalSpend = bookingSpend + orderSpend
      const recentActivity = [
        ...matchedBookings.map((booking) => ({
          kind: 'booking',
          when: booking.created_at || booking.updated_at || getBookingDate(booking),
          title: getBookingService(booking),
          detail: `${getBookingDate(booking)} ${getBookingTime(booking)}`.trim(),
          reference: booking.ref || booking.id || '',
          amount: booking.final_price || booking.service_price || 0,
          status: booking.status || 'pending',
        })),
        ...matchedOrders.map((order) => ({
          kind: 'order',
          when: getOrderDate(order),
          title: getOrderLabel(order),
          detail: order?.status || order?.payment_status || '訂單',
          reference: order?.ref || order?.order_no || order?.order_number || order?.id || '',
          amount: order?.total || 0,
          status: order?.status || order?.payment_status || 'pending',
        })),
        ...matchedTransactions.map((transaction) => ({
          kind: 'transaction',
          when: getTransactionDate(transaction),
          title: getTransactionLabel(transaction),
          detail: transaction?.payment_method || transaction?.kind || '交易',
          reference: transaction?.payment_ref || transaction?.ref || transaction?.id || '',
          amount: transaction?.amount || 0,
          status: transaction?.status || 'completed',
        })),
      ]
        .filter((item) => item.when)
        .sort((a, b) => toSortTimestamp(b.when) - toSortTimestamp(a.when))
        .slice(0, 4)

      return {
        ...user,
        __bookings: matchedBookings,
        __orders: matchedOrders,
        __transactions: matchedTransactions,
        __tickets: matchedTickets,
        __spend: totalSpend,
        __tier: user.membership_level || user.tier || deriveTier(totalSpend),
        __recent: recentActivity,
      }
    })
  }, [users, bookings, orders, transactions, userTickets])

  const filteredCustomers = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return customerRows.filter((user) => {
      const haystack = [
        getCustomerName(user),
        getCustomerPhone(user),
        user.__tier,
        user.notes,
        String(user.__spend || 0),
        String(user.__transactions?.length || 0),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesTier = tierFilter === 'all' || String(user.__tier || '') === tierFilter
      const matchesActivity =
        activityFilter === 'all' ||
        (activityFilter === 'bookings' && (user.__bookings?.length || 0) > 0) ||
        (activityFilter === 'orders' && (user.__orders?.length || 0) > 0) ||
        (activityFilter === 'transactions' && (user.__transactions?.length || 0) > 0) ||
        (activityFilter === 'tickets' && (user.__tickets?.length || 0) > 0)

      return (!needle || haystack.includes(needle)) && matchesTier && matchesActivity
    })
  }, [customerRows, searchTerm, tierFilter, activityFilter])

  const selectedCustomer = filteredCustomers.find((item) => item.id === selectedCustomerId) || filteredCustomers[0] || null

  useEffect(() => {
    if (!selectedCustomer) return
    setNotesDraft((current) => {
      const currentDraft = current[selectedCustomer.id]
      const nextValue = selectedCustomer.notes || ''
      if (currentDraft === nextValue) return current
      return { ...current, [selectedCustomer.id]: nextValue }
    })
  }, [selectedCustomer?.id, selectedCustomer?.notes])

  const updateCustomer = (id, patch) => {
    if (!onUpdateCustomer) return
    setSavingNotesId(id)
    setNotesStatus((current) => ({ ...current, [id]: { state: 'saving', message: '正在儲存備註...' } }))
    Promise.resolve(onUpdateCustomer(id, patch))
      .then(() => {
        const nextNotes = patch?.notes
        if (typeof nextNotes === 'string') {
          setNotesDraft((current) => ({ ...current, [id]: nextNotes }))
        }
        setNotesStatus((current) => ({ ...current, [id]: { state: 'saved', message: '備註已儲存' } }))
      })
      .catch((error) => {
        setNotesStatus((current) => ({ ...current, [id]: { state: 'error', message: error?.message || '備註儲存失敗' } }))
      })
      .finally(() => {
        setSavingNotesId((current) => (current === id ? null : current))
      })
  }

  const getNotesDraft = (customer) => notesDraft[customer.id] ?? customer.notes ?? ''
  const setNotesDraftForCustomer = (customerId, value) => {
    setNotesDraft((current) => ({ ...current, [customerId]: value }))
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="顧客"
        title="顧客檔案"
        description="從營運角度查看消費、預約、等級與備註。"
        actions={<Pill>{filteredCustomers.length} 可見</Pill>}
      />

      <RecordFilterBar columns="1.2fr repeat(2, minmax(160px, 220px))">
        <input
          type="text"
          placeholder="搜尋姓名、電話、等級、備註或消費..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={fieldStyle}
        />
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部等級</option>
                          <option value="Regular">一般</option>
                          <option value="Silver">銀級</option>
                          <option value="Gold">金級</option>
                          <option value="VIP">VIP</option>
        </select>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部紀錄</option>
          <option value="bookings">有預約</option>
          <option value="orders">有訂單</option>
          <option value="transactions">有交易</option>
          <option value="tickets">有票券</option>
        </select>
      </RecordFilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <SummaryCard label="可見顧客" value={filteredCustomers.length} />
        <SummaryCard label="可見消費" value={formatMoney(filteredCustomers.reduce((sum, user) => sum + Number(user.__spend || 0), 0), '')} />
        <SummaryCard label="預約" value={filteredCustomers.reduce((sum, user) => sum + (user.__bookings?.length || 0), 0)} />
        <SummaryCard label="訂單" value={filteredCustomers.reduce((sum, user) => sum + (user.__orders?.length || 0), 0)} />
        <SummaryCard label="交易" value={filteredCustomers.reduce((sum, user) => sum + (user.__transactions?.length || 0), 0)} />
        <SummaryCard label="票券 / 套餐" value={filteredCustomers.reduce((sum, user) => sum + (user.__tickets?.length || 0), 0)} />
      </div>
      <div style={{ marginTop: '-4px', fontSize: '12px', color: 'var(--text-light)' }}>
        可見消費目前只計算預約與訂單總額，方便同此頁營運數字保持一致。
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="admin-card" style={{ overflow: 'hidden', flex: selectedCustomer ? '1 1 660px' : '1 1 100%' }}>
          <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>顧客</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>等級</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>消費</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>預約</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>交易</th>
                  {!selectedCustomer && <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>備註</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCustomer ? 5 : 6}>
                      <EmptyState title="未找到顧客" description="可嘗試更改搜尋字詞或清除篩選。" />
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((user) => {
                    const active = selectedCustomer?.id === user.id
                    return (
                      <tr
                        key={user.id}
                        className="admin-table-row"
                        style={{
                          borderBottom: '1px solid #f6f6f6',
                          background: active ? 'rgba(166, 139, 106, 0.05)' : '#fff',
                          borderLeft: active ? '4px solid var(--primary)' : '4px solid transparent',
                        }}
                        onClick={() => setSelectedCustomerId(user.id)}
                      >
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>{getCustomerName(user)}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(user)}</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <select
                            value={user.__tier}
                            onChange={(event) => updateCustomer(user.id, { membership_level: event.target.value })}
                            onClick={(event) => event.stopPropagation()}
                            style={smallFieldStyle}
                          >
                            <option value="Regular">一般</option>
                            <option value="Silver">銀級</option>
                            <option value="Gold">金級</option>
                            <option value="VIP">VIP</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(user.__spend, '')}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{(user.__orders?.length || 0) + (user.__bookings?.length || 0)} 筆總紀錄</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800 }}>{user.__bookings?.length || 0}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>已連結預約</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800 }}>{user.__transactions?.length || 0}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>帳目紀錄</div>
                        </td>
                        {!selectedCustomer && (
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ display: 'grid', gap: '6px' }}>
                              <input
                                type="text"
                                value={getNotesDraft(user)}
                                placeholder="內部備註"
                                onChange={(event) => setNotesDraftForCustomer(user.id, event.target.value)}
                                onBlur={(event) => updateCustomer(user.id, { notes: event.target.value })}
                                onClick={(event) => event.stopPropagation()}
                                style={{ ...smallFieldStyle, background: '#f9fafb' }}
                              />
                              {notesStatus[user.id]?.message && (
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: notesStatus[user.id]?.state === 'error' ? '#DC2626' : notesStatus[user.id]?.state === 'saved' ? '#047857' : 'var(--text-light)',
                                  }}
                                >
                                  {savingNotesId === user.id ? '正在儲存備註...' : notesStatus[user.id].message}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedCustomer && (
          <div className="admin-card" style={{ flex: '1 1 360px', minWidth: '340px', padding: '24px', position: 'sticky', top: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>顧客檔案</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 0' }}>{getCustomerName(selectedCustomer)}</h3>
              </div>
              <button type="button" onClick={() => setSelectedCustomerId(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}>
                x
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 800 }}>
                {getCustomerName(selectedCustomer).charAt(0)}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>{getCustomerPhone(selectedCustomer)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>等級</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{getTierLabel(selectedCustomer.__tier)}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>消費</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(selectedCustomer.__spend, '')}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>預約</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedCustomer.__bookings?.length || 0}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>交易</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedCustomer.__transactions?.length || 0}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>加入日期</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : '-'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'block' }}>等級</label>
              <select
                value={selectedCustomer.__tier}
                onChange={(event) => updateCustomer(selectedCustomer.id, { membership_level: event.target.value })}
                style={fieldStyle}
              >
                <option value="Regular">一般</option>
                <option value="Silver">銀級</option>
                <option value="Gold">金級</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'block' }}>員工備註</label>
              <textarea
                value={getNotesDraft(selectedCustomer)}
                onChange={(event) => setNotesDraftForCustomer(selectedCustomer.id, event.target.value)}
                placeholder="輸入內部備註"
                style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: notesStatus[selectedCustomer.id]?.state === 'error' ? '#DC2626' : notesStatus[selectedCustomer.id]?.state === 'saved' ? '#047857' : 'var(--text-light)' }}>
                  {notesStatus[selectedCustomer.id]?.message || '草稿只會先保留在畫面，請按「儲存備註」。'}
                </div>
                <button
                  type="button"
                  onClick={() => updateCustomer(selectedCustomer.id, { notes: getNotesDraft(selectedCustomer) })}
                  className="btn btn-small btn-interactive"
                  disabled={savingNotesId === selectedCustomer.id}
                  style={{ minWidth: '120px' }}
                >
                  {savingNotesId === selectedCustomer.id ? '儲存中...' : '儲存備註'}
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>最近活動</h4>
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="hide-scrollbar">
                {selectedCustomer.__recent.length ? (
                  selectedCustomer.__recent.map((entry, index) => (
                    <div key={`${entry.kind}-${entry.title}-${index}`} className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700 }}>
                          <span className="badge badge-outline" style={{ marginRight: '8px', fontSize: '10px', padding: '2px 6px' }}>
                            {getActivityKindLabel(entry.kind)}
                          </span>
                          {entry.title}
                        </span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatMoney(entry.amount || 0, '')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--text-light)' }}>
                        <span style={{ display: 'grid', gap: '2px' }}>
                          <span>{entry.detail || '-'}</span>
                          <span>{formatActivityWhen(entry.when)}</span>
                          {entry.reference && <span style={{ fontSize: '11px' }}>參考編號：{entry.reference}</span>}
                        </span>
                        <span className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {entry.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="沒有最近活動" description="此顧客暫時未有預約、訂單或交易紀錄。" />
                )}
              </div>
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>票券 / 套餐</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedCustomer.__tickets.length ? (
                  selectedCustomer.__tickets.slice(0, 4).map((ticket) => (
                    <div key={ticket.id} className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, lineHeight: 1.35 }}>{getTicketLabel(ticket, servicePackages)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>
                            {ticket.code || ticket.ref || ticket.ticket_code || ticket.id ? `#${ticket.code || ticket.ref || ticket.ticket_code || ticket.id}` : '會員權益'}
                          </div>
                        </div>
                        <span style={{ color: 'var(--primary)', fontWeight: 800, whiteSpace: 'nowrap' }}>{formatMoney(ticket.price || ticket.amount || 0, '')}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {ticket.status || ticket.state || '啟用中'}
                        </span>
                        {ticket.remaining_uses != null && <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>尚餘 {ticket.remaining_uses} 次</span>}
                        {ticket.used_count != null && <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>已使用 {ticket.used_count} 次</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--text-light)', fontSize: '12px' }}>
                        <span>{ticket.expires_at ? `到期日 ${new Date(ticket.expires_at).toLocaleDateString()}` : ticket.valid_until ? `有效至 ${new Date(ticket.valid_until).toLocaleDateString()}` : '未設定到期日'}</span>
                        <span>{ticket.issued_at ? `發出日期 ${new Date(ticket.issued_at).toLocaleDateString()}` : ticket.created_at ? `建立日期 ${new Date(ticket.created_at).toLocaleDateString()}` : ''}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', color: 'var(--text-light)' }}>
                    此會員未連結任何票券或套餐紀錄。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="admin-card" style={{ padding: '14px 16px', border: '1px solid var(--gray)' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800 }}>{value}</div>
    </div>
  )
}

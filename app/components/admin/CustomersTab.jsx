'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const getCustomerName = (user) => user?.name || user?.full_name || user?.display_name || 'Member'
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
  return ticket?.name || ticket?.ticket_name || ticket?.title || packageName || `Ticket #${ticket?.id || '-'}`
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
      return 'Booking'
    case 'order':
      return 'Order'
    case 'transaction':
      return 'Transaction'
    default:
      return 'Activity'
  }
}

const deriveTier = (spend) => {
  if (spend >= 10000) return 'VIP'
  if (spend >= 5000) return 'Gold'
  if (spend >= 2000) return 'Silver'
  return 'Regular'
}

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
          detail: order?.status || order?.payment_status || 'Order',
          reference: order?.ref || order?.order_no || order?.order_number || order?.id || '',
          amount: order?.total || 0,
          status: order?.status || order?.payment_status || 'pending',
        })),
        ...matchedTransactions.map((transaction) => ({
          kind: 'transaction',
          when: getTransactionDate(transaction),
          title: getTransactionLabel(transaction),
          detail: transaction?.payment_method || transaction?.kind || 'Transaction',
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
    setNotesStatus((current) => ({ ...current, [id]: { state: 'saving', message: 'Saving notes...' } }))
    Promise.resolve(onUpdateCustomer(id, patch))
      .then(() => {
        const nextNotes = patch?.notes
        if (typeof nextNotes === 'string') {
          setNotesDraft((current) => ({ ...current, [id]: nextNotes }))
        }
        setNotesStatus((current) => ({ ...current, [id]: { state: 'saved', message: 'Notes saved' } }))
      })
      .catch((error) => {
        setNotesStatus((current) => ({ ...current, [id]: { state: 'error', message: error?.message || 'Failed to save notes' } }))
      })
      .finally(() => {
        setSavingNotesId((current) => (current === id ? null : current))
      })
  }

  const getNotesDraft = (customer) => notesDraft[customer.id] ?? customer.notes ?? ''
  const isNotesDirty = (customer) => getNotesDraft(customer) !== (customer?.notes ?? '')
  const setNotesDraftForCustomer = (customerId, value) => {
    setNotesDraft((current) => ({ ...current, [customerId]: value }))
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="CUSTOMERS"
        title="Customer profiles"
        description="Review spend, bookings, tier, and notes from a CRM-style member view."
        actions={<Pill>{filteredCustomers.length} visible</Pill>}
      />

      <RecordFilterBar columns="1.2fr repeat(2, minmax(160px, 220px))">
        <input
          type="text"
          placeholder="Search by name, phone, tier, notes, or spend..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={fieldStyle}
        />
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All tiers</option>
          <option value="Regular">Regular</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="VIP">VIP</option>
        </select>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All activity</option>
          <option value="bookings">Has bookings</option>
          <option value="orders">Has orders</option>
          <option value="transactions">Has transactions</option>
          <option value="tickets">Has tickets</option>
        </select>
      </RecordFilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <SummaryCard label="Visible customers" value={filteredCustomers.length} />
        <SummaryCard label="Visible spend" value={formatMoney(filteredCustomers.reduce((sum, user) => sum + Number(user.__spend || 0), 0), '')} />
        <SummaryCard label="Bookings" value={filteredCustomers.reduce((sum, user) => sum + (user.__bookings?.length || 0), 0)} />
        <SummaryCard label="Orders" value={filteredCustomers.reduce((sum, user) => sum + (user.__orders?.length || 0), 0)} />
        <SummaryCard label="Transactions" value={filteredCustomers.reduce((sum, user) => sum + (user.__transactions?.length || 0), 0)} />
        <SummaryCard label="Tickets / packages" value={filteredCustomers.reduce((sum, user) => sum + (user.__tickets?.length || 0), 0)} />
      </div>
      <div style={{ marginTop: '-4px', fontSize: '12px', color: 'var(--text-light)' }}>
        Visible spend currently reflects booking + order totals only, so it stays aligned with the revenue figures used on this screen.
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="admin-card" style={{ overflow: 'hidden', flex: selectedCustomer ? '1 1 660px' : '1 1 100%' }}>
          <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Customer</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Tier</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Spend</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Bookings</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Transactions</th>
                  {!selectedCustomer && <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Notes</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCustomer ? 5 : 6}>
                      <EmptyState title="No customers found" description="Try another search term or clear filters." />
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
                            <option value="Regular">Regular</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="VIP">VIP</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(user.__spend, '')}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{(user.__orders?.length || 0) + (user.__bookings?.length || 0)} total records</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800 }}>{user.__bookings?.length || 0}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>Linked bookings</div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 800 }}>{user.__transactions?.length || 0}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>Ledger entries</div>
                        </td>
                        {!selectedCustomer && (
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          <input
                            type="text"
                            value={getNotesDraft(user)}
                            placeholder="Internal notes"
                            onChange={(event) => setNotesDraftForCustomer(user.id, event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            style={{ ...smallFieldStyle, background: '#f9fafb' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                color:
                                  notesStatus[user.id]?.state === 'error'
                                    ? '#DC2626'
                                    : notesStatus[user.id]?.state === 'saved'
                                      ? '#047857'
                                      : isNotesDirty(user)
                                        ? '#B45309'
                                        : 'var(--text-light)',
                              }}
                            >
                              {savingNotesId === user.id
                                ? 'Saving notes...'
                                : notesStatus[user.id]?.message || (isNotesDirty(user) ? 'Draft not yet saved' : 'Notes synced')}
                            </div>
                            <button
                              type="button"
                              className="btn btn-small btn-interactive"
                              disabled={savingNotesId === user.id || !isNotesDirty(user)}
                              onClick={(event) => {
                                event.stopPropagation()
                                updateCustomer(user.id, { notes: getNotesDraft(user) })
                              }}
                            >
                              {savingNotesId === user.id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
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
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>CUSTOMER PROFILE</div>
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
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Tier</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedCustomer.__tier}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Spend</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(selectedCustomer.__spend, '')}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Bookings</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedCustomer.__bookings?.length || 0}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Transactions</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{selectedCustomer.__transactions?.length || 0}</div>
              </div>
              <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Joined</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : '-'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'block' }}>Tier</label>
              <select
                value={selectedCustomer.__tier}
                onChange={(event) => updateCustomer(selectedCustomer.id, { membership_level: event.target.value })}
                style={fieldStyle}
              >
                <option value="Regular">Regular</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', display: 'block' }}>Staff notes</label>
              <textarea
                value={getNotesDraft(selectedCustomer)}
                onChange={(event) => setNotesDraftForCustomer(selectedCustomer.id, event.target.value)}
                placeholder="Write internal notes"
                style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: notesStatus[selectedCustomer.id]?.state === 'error' ? '#DC2626' : notesStatus[selectedCustomer.id]?.state === 'saved' ? '#047857' : 'var(--text-light)' }}>
                  {notesStatus[selectedCustomer.id]?.message || 'Draft edits stay local until you click Save notes.'}
                </div>
                <button
                  type="button"
                  onClick={() => updateCustomer(selectedCustomer.id, { notes: getNotesDraft(selectedCustomer) })}
                  className="btn btn-small btn-interactive"
                  disabled={savingNotesId === selectedCustomer.id}
                  style={{ minWidth: '120px' }}
                >
                  {savingNotesId === selectedCustomer.id ? 'Saving...' : 'Save notes'}
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Recent activity</h4>
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
                          {entry.reference && <span style={{ fontSize: '11px' }}>Ref: {entry.reference}</span>}
                        </span>
                        <span className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {entry.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No recent activity" description="This customer has not booked yet." />
                )}
              </div>
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Tickets / packages</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedCustomer.__tickets.length ? (
                  selectedCustomer.__tickets.slice(0, 4).map((ticket) => (
                    <div key={ticket.id} className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, lineHeight: 1.35 }}>{getTicketLabel(ticket, servicePackages)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>
                            {ticket.code || ticket.ref || ticket.ticket_code || ticket.id ? `#${ticket.code || ticket.ref || ticket.ticket_code || ticket.id}` : 'Member entitlement'}
                          </div>
                        </div>
                        <span style={{ color: 'var(--primary)', fontWeight: 800, whiteSpace: 'nowrap' }}>{formatMoney(ticket.price || ticket.amount || 0, '')}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {ticket.status || ticket.state || 'Active'}
                        </span>
                        {ticket.remaining_uses != null && <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{ticket.remaining_uses} uses left</span>}
                        {ticket.used_count != null && <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{ticket.used_count} used</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--text-light)', fontSize: '12px' }}>
                        <span>{ticket.expires_at ? `Expires ${new Date(ticket.expires_at).toLocaleDateString()}` : ticket.valid_until ? `Valid until ${new Date(ticket.valid_until).toLocaleDateString()}` : 'No expiry set'}</span>
                        <span>{ticket.issued_at ? `Issued ${new Date(ticket.issued_at).toLocaleDateString()}` : ticket.created_at ? `Created ${new Date(ticket.created_at).toLocaleDateString()}` : ''}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)', color: 'var(--text-light)' }}>
                    No ticket or package record linked to this member.
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

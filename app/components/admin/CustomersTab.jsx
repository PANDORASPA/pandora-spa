'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const getCustomerName = (user) => user?.name || user?.full_name || user?.display_name || 'Member'
const getCustomerPhone = (user) => user?.phone || user?.mobile || user?.customer_phone || '-'
const getBookingPhone = (booking) => booking?.phone || booking?.customer_phone || ''
const getBookingDate = (booking) => booking?.appointment_date || booking?.date || ''
const getBookingTime = (booking) => booking?.start_time || booking?.time || ''
const getBookingService = (booking) => booking?.service_name || booking?.service || '-'

const deriveTier = (spend) => {
  if (spend >= 10000) return 'VIP'
  if (spend >= 5000) return 'Gold'
  if (spend >= 2000) return 'Silver'
  return 'Regular'
}

export default function CustomersTab({ users = [], bookings = [], orders = [], onUpdateCustomer }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [notesDraft, setNotesDraft] = useState({})

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
      const bookingSpend = matchedBookings.reduce((sum, booking) => sum + Number(booking.final_price || booking.service_price || 0), 0)
      const orderSpend = matchedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
      const totalSpend = bookingSpend + orderSpend
      const recentActivity = [...matchedBookings]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 3)

      return {
        ...user,
        __bookings: matchedBookings,
        __orders: matchedOrders,
        __spend: totalSpend,
        __tier: user.membership_level || user.tier || deriveTier(totalSpend),
        __recent: recentActivity,
      }
    })
  }, [users, bookings, orders])

  const filteredCustomers = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return customerRows.filter((user) => {
      const haystack = [
        getCustomerName(user),
        getCustomerPhone(user),
        user.__tier,
        user.notes,
        String(user.__spend || 0),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return !needle || haystack.includes(needle)
    })
  }, [customerRows, searchTerm])

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
    if (onUpdateCustomer) onUpdateCustomer(id, patch)
  }

  const getNotesDraft = (customer) => notesDraft[customer.id] ?? customer.notes ?? ''
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

      <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
        <input
          type="text"
          placeholder="Search by name, phone, tier, notes, or spend..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={fieldStyle}
        />
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
                  {!selectedCustomer && <th style={{ padding: '16px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Notes</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5">
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
                        {!selectedCustomer && (
                          <td style={{ padding: '14px 12px' }}>
                            <input
                              type="text"
                              value={user.notes || ''}
                              placeholder="Internal notes"
                              onBlur={(event) => updateCustomer(user.id, { notes: event.target.value })}
                              onClick={(event) => event.stopPropagation()}
                              style={{ ...smallFieldStyle, background: '#f9fafb' }}
                            />
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
                onBlur={(event) => updateCustomer(selectedCustomer.id, { notes: event.target.value })}
                placeholder="Write internal notes"
                style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }}
              />
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Recent activity</h4>
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="hide-scrollbar">
                {selectedCustomer.__recent.length ? (
                  selectedCustomer.__recent.map((booking) => (
                    <div key={booking.id} className="admin-card" style={{ padding: '12px', border: '1px solid var(--gray)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700 }}>{getBookingService(booking)}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{formatMoney(booking.final_price || booking.service_price || 0, '')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--text-light)' }}>
                        <span>
                          {getBookingDate(booking)} {getBookingTime(booking)}
                        </span>
                        <span className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {booking.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No recent activity" description="This customer has not booked yet." />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

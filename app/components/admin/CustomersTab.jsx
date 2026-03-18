'use client'

import { useMemo, useState } from 'react'

const getCustomerName = (user) => user?.name || user?.full_name || 'Member'
const getCustomerPhone = (user) => user?.phone || user?.mobile || '-'
const getBookingPhone = (booking) => booking?.phone || booking?.customer_phone || ''
const getBookingDate = (booking) => booking?.appointment_date || booking?.date || ''
const getBookingTime = (booking) => booking?.start_time || booking?.time || ''
const getBookingService = (booking) => booking?.service_name || booking?.service || '-'

export default function CustomersTab({ users, bookings, onUpdateCustomer }) {
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const bookingMap = useMemo(() => {
    const map = new Map()
    ;(users || []).forEach((user) => {
      const phone = getCustomerPhone(user)
      map.set(
        user.id,
        (bookings || []).filter((booking) => getBookingPhone(booking) && getBookingPhone(booking) === phone)
      )
    })
    return map
  }, [users, bookings])

  const selectedCustomerBookings = selectedCustomer ? bookingMap.get(selectedCustomer.id) || [] : []

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className="admin-card" style={{ overflow: 'hidden', flex: selectedCustomer ? '1 1 640px' : '1 1 100%' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '680px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Customer</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Tier</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Spend</th>
                {!selectedCustomer && <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Notes</th>}
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No customers yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const userBookings = bookingMap.get(user.id) || []
                  const totalSpent = userBookings.reduce((sum, booking) => sum + Number(booking.final_price || booking.service_price || 0), 0)
                  const isSelected = selectedCustomer?.id === user.id

                  return (
                    <tr
                      key={user.id}
                      className="admin-table-row"
                      style={{
                        borderBottom: '1px solid #f9f9f9',
                        background: isSelected ? 'rgba(166, 139, 106, 0.05)' : '#fff',
                        borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                      }}
                      onClick={() => setSelectedCustomer(user)}
                    >
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{getCustomerName(user)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{getCustomerPhone(user)}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <select
                          value={user.membership_level || 'Regular'}
                          onChange={(event) => onUpdateCustomer(user.id, { membership_level: event.target.value })}
                          onClick={(event) => event.stopPropagation()}
                          className="btn-interactive"
                          style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
                        >
                          <option value="Regular">Regular</option>
                          <option value="Silver">Silver</option>
                          <option value="Gold">Gold</option>
                          <option value="VIP">VIP</option>
                        </select>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>${totalSpent.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{userBookings.length} bookings</div>
                      </td>
                      {!selectedCustomer && (
                        <td style={{ padding: '14px 12px' }}>
                          <input
                            type="text"
                            value={user.notes || ''}
                            placeholder="Internal notes"
                            onBlur={(event) => onUpdateCustomer(user.id, { notes: event.target.value })}
                            onClick={(event) => event.stopPropagation()}
                            style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid transparent', background: '#f9fafb', width: '100%' }}
                            onFocus={(event) => { event.target.style.borderColor = 'var(--primary)' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button type="button" className="btn-interactive" style={{ padding: '6px 12px', fontSize: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <div className="admin-card" style={{ flex: '1 1 360px', minWidth: '350px', padding: '24px', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Customer profile</h3>
            <button type="button" onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }}>x</button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 700 }}>
              {getCustomerName(selectedCustomer)?.charAt(0)}
            </div>
            <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>{getCustomerName(selectedCustomer)}</h2>
            <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>{getCustomerPhone(selectedCustomer)}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Points</div>
              <input
                type="number"
                value={selectedCustomer.points || 0}
                onChange={(event) => onUpdateCustomer(selectedCustomer.id, { points: parseInt(event.target.value, 10) || 0 })}
                style={{ width: '80px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}
              />
            </div>
            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Joined</div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : '-'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>Staff notes</label>
            <textarea
              value={selectedCustomer.notes || ''}
              onChange={(event) => setSelectedCustomer({ ...selectedCustomer, notes: event.target.value })}
              onBlur={(event) => onUpdateCustomer(selectedCustomer.id, { notes: event.target.value })}
              placeholder="Write internal notes"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #eee', minHeight: '90px', fontSize: '13px' }}
            />
          </div>

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Recent bookings</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} className="hide-scrollbar">
              {selectedCustomerBookings.length > 0 ? (
                selectedCustomerBookings
                  .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                  .map((booking) => (
                    <div key={booking.id} style={{ padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{getBookingService(booking)}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>${Number(booking.final_price || booking.service_price || 0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999' }}>
                        <span>{getBookingDate(booking)} {getBookingTime(booking)}</span>
                        <span className={`badge ${booking.status === 'confirmed' ? 'badge-success' : 'badge-outline'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {booking.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '13px' }}>No bookings linked to this member yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

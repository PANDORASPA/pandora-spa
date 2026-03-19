'use client'

import { useMemo, useState } from 'react'
import { EmptyState, Pill, SectionHeader, fieldStyle, parseDate, parseTime, smallFieldStyle } from './opsUi'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', tone: 'warning' },
  { value: 'confirmed', label: 'Confirmed', tone: 'success' },
  { value: 'completed', label: 'Completed', tone: 'default' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
]

const getBookingDate = (booking) => parseDate(booking?.appointment_date || booking?.date || '')
const getBookingTime = (booking) => parseTime(booking?.start_time || booking?.time || '')
const getCustomerName = (booking) => booking?.customer_name || booking?.name || 'Guest'
const getCustomerPhone = (booking) => booking?.customer_phone || booking?.phone || ''
const getServiceName = (booking) => booking?.service_name || booking?.service || '-'
const getLocationName = (booking) => booking?.location_name || booking?.location || booking?.branch_name || '-'
const getProviderName = (booking) => booking?.staff_name || booking?.provider_name || booking?.provider || '-'
const getPaymentText = (booking) => booking?.payment || booking?.payment_method || booking?.payment_status || 'Not set'
const getTicketText = (booking) => booking?.ticket_name || booking?.user_ticket_name || booking?.ticket || ''
const getStaffName = (member) => member?.name || member?.full_name || member?.display_name || member?.title || ''

export default function BookingsTab({
  bookings = [],
  staff = [],
  services = [],
  onUpdateBookingStaff,
  onUpdateStatus,
  onViewDetail,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const staffNameMap = useMemo(() => {
    return (staff || []).reduce((acc, item) => {
      acc[item.id] = getStaffName(item)
      return acc
    }, {})
  }, [staff])

  const filteredBookings = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return (bookings || []).filter((booking) => {
      const haystack = [
        booking.ref,
        getCustomerName(booking),
        getCustomerPhone(booking),
        getServiceName(booking),
        getProviderName(booking),
        getLocationName(booking),
        getPaymentText(booking),
        getTicketText(booking),
        booking.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (!needle || haystack.includes(needle)) && (statusFilter === 'all' || (booking.status || 'pending') === statusFilter)
    })
  }, [bookings, searchTerm, statusFilter])

  const updateStatus = async (id, status) => {
    if (onUpdateStatus) {
      await onUpdateStatus(id, status)
      setSelectedBooking((current) => (current?.id === id ? { ...current, status } : current))
    }
  }

  const updateStaff = async (id, staffId) => {
    if (onUpdateBookingStaff) {
      const normalizedStaffId = Number(staffId) || null
      await onUpdateBookingStaff(id, normalizedStaffId)
      setSelectedBooking((current) =>
        current?.id === id ? { ...current, staff_id: normalizedStaffId, staff_name: staffNameMap[normalizedStaffId] || current?.staff_name || getStaffName(staff.find((member) => String(member.id) === String(staffId))) } : current,
      )
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="BOOKINGS"
        title="Bookings and allocation"
        description="Manage appointment date, provider, payment status, and ticket usage from one compact table."
        actions={<Pill>{filteredBookings.length} visible</Pill>}
      />

      <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <input type="text" placeholder="Search customer, service, provider, location, ticket..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={fieldStyle} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1120px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Appointment</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Customer</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Service</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Location / Provider</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Payment / Ticket</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState title="No bookings found" description="Try a different search term or clear the filters." />
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const status = booking.status || 'pending'
                  const statusMeta = STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0]
                  return (
                    <tr key={booking.id} className="admin-table-row" style={{ borderBottom: '1px solid #f6f6f6', cursor: 'pointer' }} onClick={() => setSelectedBooking(booking)}>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 800 }}>{getBookingDate(booking) || '-'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, marginTop: '3px' }}>{getBookingTime(booking) || '-'}</div>
                        {booking.ref && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>#{booking.ref}</div>}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 800 }}>{getCustomerName(booking)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(booking)}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getServiceName(booking)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>
                          {Number(booking.final_price ?? booking.service_price ?? 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getLocationName(booking)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getProviderName(booking)}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getPaymentText(booking)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getTicketText(booking) || 'No ticket'}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span
                          className="badge"
                          style={{
                            border: 'none',
                            background: statusMeta.tone === 'success' ? '#ECFDF5' : statusMeta.tone === 'warning' ? '#FEF3C7' : statusMeta.tone === 'danger' ? '#FEF2F2' : '#E5E7EB',
                            color: statusMeta.tone === 'success' ? '#047857' : statusMeta.tone === 'warning' ? '#B45309' : statusMeta.tone === 'danger' ? '#DC2626' : '#374151',
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onViewDetail?.(booking)
                            setSelectedBooking(booking)
                          }}
                          className="btn-interactive"
                          style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                        >
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

      {selectedBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedBooking(null)}
        >
          <div className="admin-card" style={{ width: '100%', maxWidth: '720px', padding: '24px', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedBooking(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>
              x
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>BOOKING DETAILS</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedBooking.ref || 'Booking'}</h3>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Appointment</div>
                    <div style={{ fontWeight: 800 }}>{getBookingDate(selectedBooking)} {getBookingTime(selectedBooking)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Customer</div>
                    <div style={{ fontWeight: 800 }}>{getCustomerName(selectedBooking)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(selectedBooking)}</div>
                  </div>
                </div>
              </div>

              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <LabelBlock label="Service" value={getServiceName(selectedBooking)} />
                  <LabelBlock label="Location" value={getLocationName(selectedBooking)} />
                  <LabelBlock label="Provider" value={getProviderName(selectedBooking)} />
                  <LabelBlock label="Payment" value={getPaymentText(selectedBooking)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Ticket</div>
                    <div style={{ fontWeight: 700 }}>{getTicketText(selectedBooking) || 'No ticket'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Total</div>
                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
                      {Number(selectedBooking.final_price ?? selectedBooking.service_price ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Status</div>
                    <select value={selectedBooking.status || 'pending'} onChange={(e) => updateStatus(selectedBooking.id, e.target.value)} style={smallFieldStyle}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Provider</div>
                    <select value={selectedBooking.staff_id || ''} onChange={(e) => updateStaff(selectedBooking.id, e.target.value)} style={smallFieldStyle}>
                      <option value="">Unassigned</option>
                      {(staff || []).map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedBooking(null)} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LabelBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value || '-'}</div>
    </div>
  )
}

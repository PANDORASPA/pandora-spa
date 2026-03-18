'use client'

import { useMemo, useState } from 'react'

const normalizeDate = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const parts = text.split(/[\/.-]/).map((part) => part.trim())
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (a.length === 4) return `${a.padStart(4, '0')}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    return `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
  }

  return text
}

const normalizeTime = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  return text.length >= 5 ? text.substring(0, 5) : text
}

const displayBookingDate = (booking) => normalizeDate(booking?.appointment_date || booking?.date || booking?.created_at)
const displayBookingTime = (booking) => normalizeTime(booking?.start_time || booking?.time)

const statusLabel = (status) => {
  if (status === 'pending') return 'Pending'
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status || 'Unknown'
}

const statusBadgeStyle = (status) => {
  if (status === 'pending') return { background: '#fef3c7', color: '#b45309' }
  if (status === 'confirmed') return { background: '#dbeafe', color: '#1d4ed8' }
  if (status === 'completed') return { background: '#dcfce7', color: '#166534' }
  return { background: '#fee2e2', color: '#b91c1c' }
}

export default function BookingsTab({
  bookings,
  staff,
  onUpdateBookingStaff,
  onViewDetail,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('all')

  const staffNameMap = useMemo(() => {
    return (staff || []).reduce((acc, item) => {
      acc[item.id] = item.name
      return acc
    }, {})
  }, [staff])

  const filteredBookings = (bookings || []).filter((booking) => {
    const searchValue = searchTerm.toLowerCase().trim()
    const bookingDate = displayBookingDate(booking)
    const bookingStaffName = booking.staff_name || staffNameMap[booking.staff_id] || ''
    const bookingText = [
      booking.name,
      booking.phone,
      booking.service,
      booking.service_name,
      bookingStaffName,
      booking.ref,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return (
      (!searchValue || bookingText.includes(searchValue)) &&
      (statusFilter === 'all' || booking.status === statusFilter) &&
      (dateFilter === '' || bookingDate === normalizeDate(dateFilter)) &&
      (staffFilter === 'all' || booking.staff_id?.toString() === staffFilter)
    )
  })

  return (
    <div>
      <div className="admin-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by customer, phone, service, or staff"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ width: '180px' }}>
          <input
            type="text"
            placeholder="Date (YYYY-MM-DD)"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div style={{ width: '180px' }}>
          <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
            <option value="all">All staff</option>
            {(staff || []).map((item) => (
              <option key={item.id} value={item.id.toString()}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: '180px' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '860px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Appointment</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Customer</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Service</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Staff</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const appointmentDate = displayBookingDate(booking)
                  const appointmentTime = displayBookingTime(booking)
                  const displayService = booking.service_name || booking.service || '-'
                  const displayStaff = booking.staff_name || staffNameMap[booking.staff_id] || 'Unassigned'
                  const normalizedStatus = booking.status || 'pending'

                  return (
                    <tr
                      key={booking.id}
                      className="admin-table-row"
                      style={{ borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }}
                      onClick={() => onViewDetail?.(booking)}
                    >
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{appointmentDate || '-'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>{appointmentTime || '-'}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{booking.name || booking.customer_name || '-'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{booking.phone || booking.customer_phone || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{displayService}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                          ${Number(booking.final_price ?? booking.service_price ?? 0)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{displayStaff}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className="badge" style={{ ...statusBadgeStyle(normalizedStatus), border: 'none' }}>
                          {statusLabel(normalizedStatus)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              onViewDetail?.(booking)
                            }}
                            className="btn-interactive"
                            type="button"
                            style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

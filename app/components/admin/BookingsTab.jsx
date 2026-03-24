'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, RecordFilterBar, SectionHeader, fieldStyle, parseDate, parseTime, smallFieldStyle } from './opsUi'

const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理', tone: 'warning' },
  { value: 'confirmed', label: '已確認', tone: 'success' },
  { value: 'completed', label: '已完成', tone: 'default' },
  { value: 'cancelled', label: '已取消', tone: 'danger' },
]

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const getBookingDate = (booking) => parseDate(booking?.appointment_date || booking?.date || '')
const getBookingTime = (booking) => parseTime(booking?.start_time || booking?.time || '')
const getCustomerName = (booking) => booking?.customer_name || booking?.name || '未命名顧客'
const getCustomerPhone = (booking) => booking?.customer_phone || booking?.phone || ''
const getServiceName = (booking) => booking?.service_name || booking?.service || '-'
const getLocationName = (booking) => booking?.location_name || booking?.location || booking?.branch_name || '-'
const getLocationId = (booking) => booking?.location_id ?? booking?.branch_id ?? booking?.branch?.id ?? ''
const getProviderName = (booking) => booking?.staff_name || booking?.provider_name || booking?.provider || '-'
const getProviderGroupName = (booking) => booking?.provider_group_name || booking?.provider_group || booking?.group_name || '-'
const getProviderGroupId = (booking) => booking?.provider_group_id ?? booking?.group_id ?? ''
const getPaymentText = (booking) => booking?.payment || booking?.payment_method || booking?.payment_status || '未註明'
const getTicketText = (booking) => booking?.ticket_name || booking?.user_ticket_name || booking?.ticket || ''
const getStaffName = (member) => member?.name || member?.full_name || member?.display_name || member?.title || ''
const getResourceName = (resource) => resource?.name || resource?.title || resource?.label || resource?.code || `資源 #${resource?.id || ''}`
const getTransactionRef = (transaction) => transaction?.ref || transaction?.payment_ref || transaction?.reference || transaction?.id
const getTransactionBookingId = (transaction) => transaction?.booking_id ?? transaction?.bookingId ?? transaction?.order_booking_id ?? ''
const getTransactionOrderId = (transaction) => transaction?.order_id ?? transaction?.orderId ?? ''
const getTransactionCustomerName = (transaction) => transaction?.customer_name || transaction?.name || transaction?.member_name || ''
const getOrderRef = (order) => order?.ref || order?.order_no || order?.order_number || order?.id
const getOrderBookingId = (order) => order?.booking_id ?? order?.bookingId ?? ''

const toDateObject = (value) => {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const toIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1)

const buildCalendarCells = (date) => {
  const monthStart = startOfMonth(date)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart)
    current.setDate(gridStart.getDate() + index)
    return {
      iso: toIsoDate(current),
      day: current.getDate(),
      inMonth: current.getMonth() === date.getMonth(),
    }
  })
}

function SummaryBlock({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EEE7DD', borderRadius: '12px', padding: '14px' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em', marginBottom: '10px' }}>{title}</div>
      <div style={{ display: 'grid', gap: '0' }}>{children}</div>
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

export default function BookingsTab({
  bookings = [],
  staff = [],
  services = [],
  locations = [],
  providerGroups = [],
  resources = [],
  transactions = [],
  orders = [],
  bookingResourceAllocations = [],
  onUpdateBookingStaff,
  onUpdateStatus,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [providerGroupFilter, setProviderGroupFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))

  useEffect(() => {
    if (!selectedBooking?.id) return
    const nextBooking = (bookings || []).find((booking) => String(booking?.id) === String(selectedBooking.id))
    if (nextBooking) setSelectedBooking(nextBooking)
  }, [bookings, selectedBooking?.id])

  const staffNameMap = useMemo(() => Object.fromEntries((staff || []).map((item) => [item.id, getStaffName(item)])), [staff])
  const locationNameMap = useMemo(() => Object.fromEntries((locations || []).map((item) => [item.id, item?.name || item?.title || `地點 #${item?.id}`])), [locations])
  const providerGroupNameMap = useMemo(() => Object.fromEntries((providerGroups || []).map((item) => [item.id, item?.name || item?.title || `群組 #${item?.id}`])), [providerGroups])
  const resourceNameMap = useMemo(() => Object.fromEntries((resources || []).map((item) => [item.id, getResourceName(item)])), [resources])

  const bookingAllocationMap = useMemo(
    () =>
      (bookingResourceAllocations || []).reduce((acc, row) => {
        const bookingId = Number(row?.booking_id)
        if (!Number.isFinite(bookingId)) return acc
        if (!acc[bookingId]) acc[bookingId] = []
        acc[bookingId].push(row)
        return acc
      }, {}),
    [bookingResourceAllocations]
  )

  const transactionByBookingId = useMemo(
    () =>
      (transactions || []).reduce((acc, row) => {
        const bookingId = Number(getTransactionBookingId(row))
        if (!Number.isFinite(bookingId)) return acc
        if (!acc[bookingId]) acc[bookingId] = []
        acc[bookingId].push(row)
        return acc
      }, {}),
    [transactions]
  )

  const transactionByOrderId = useMemo(
    () =>
      (transactions || []).reduce((acc, row) => {
        const orderId = Number(getTransactionOrderId(row))
        if (!Number.isFinite(orderId)) return acc
        if (!acc[orderId]) acc[orderId] = []
        acc[orderId].push(row)
        return acc
      }, {}),
    [transactions]
  )

  const orderById = useMemo(
    () =>
      (orders || []).reduce((acc, row) => {
        const orderId = Number(row?.id)
        if (!Number.isFinite(orderId)) return acc
        acc[orderId] = row
        return acc
      }, {}),
    [orders]
  )

  const orderByBookingId = useMemo(
    () =>
      (orders || []).reduce((acc, row) => {
        const bookingId = Number(getOrderBookingId(row))
        if (!Number.isFinite(bookingId)) return acc
        if (!acc[bookingId]) acc[bookingId] = []
        acc[bookingId].push(row)
        return acc
      }, {}),
    [orders]
  )

  const bookingsByDate = useMemo(
    () =>
      (bookings || []).reduce((acc, booking) => {
        const date = getBookingDate(booking)
        if (!date) return acc
        if (!acc[date]) acc[date] = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
        acc[date].total += 1
        const status = booking?.status || 'pending'
        if (acc[date][status] != null) acc[date][status] += 1
        return acc
      }, {}),
    [bookings]
  )

  const filteredBookings = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return (bookings || []).filter((booking) => {
      const bookingDate = getBookingDate(booking)
      const haystack = [
        booking.ref,
        getCustomerName(booking),
        getCustomerPhone(booking),
        getServiceName(booking),
        getProviderName(booking),
        getProviderGroupName(booking),
        getLocationName(booking),
        getPaymentText(booking),
        getTicketText(booking),
        booking.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (
        (!needle || haystack.includes(needle)) &&
        (statusFilter === 'all' || (booking.status || 'pending') === statusFilter) &&
        (providerFilter === 'all' || String(booking?.staff_id || '') === providerFilter) &&
        (locationFilter === 'all' || String(getLocationId(booking) || '') === locationFilter) &&
        (providerGroupFilter === 'all' || String(getProviderGroupId(booking) || '') === providerGroupFilter) &&
        (serviceFilter === 'all' || String(booking?.service_id || '') === serviceFilter) &&
        (!dateFromFilter || (bookingDate && bookingDate >= dateFromFilter)) &&
        (!dateToFilter || (bookingDate && bookingDate <= dateToFilter))
      )
    })
  }, [bookings, dateFromFilter, dateToFilter, locationFilter, providerFilter, providerGroupFilter, searchTerm, serviceFilter, statusFilter])

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth])

  const getBookingDetails = (booking) => {
    const bookingId = Number(booking?.id)
    const allocations = Number.isFinite(bookingId) ? bookingAllocationMap[bookingId] || [] : []
    const directTransactions = Number.isFinite(bookingId) ? transactionByBookingId[bookingId] || [] : []
    const reverseOrders = directTransactions.flatMap((transaction) => {
      const orderId = Number(getTransactionOrderId(transaction))
      return Number.isFinite(orderId) && orderById[orderId] ? [orderById[orderId]] : []
    })
    const linkedOrders = [...(Number.isFinite(bookingId) ? orderByBookingId[bookingId] || [] : []), ...reverseOrders].filter(
      (row, index, arr) => arr.findIndex((item) => item?.id === row?.id) === index
    )
    const transactionFromOrders = linkedOrders.flatMap((order) => {
      const orderId = Number(order?.id)
      return Number.isFinite(orderId) ? transactionByOrderId[orderId] || [] : []
    })
    const linkedTransactions = [...directTransactions, ...transactionFromOrders].filter((row, index, arr) => arr.findIndex((item) => item.id === row.id) === index)
    const locationId = String(getLocationId(booking) || '')
    const providerGroupId = String(getProviderGroupId(booking) || '')
    return {
      allocations,
      linkedTransactions,
      linkedOrders,
      locationName: locationId ? locationNameMap[locationId] || getLocationName(booking) : getLocationName(booking),
      providerGroupName: providerGroupId ? providerGroupNameMap[providerGroupId] || getProviderGroupName(booking) : getProviderGroupName(booking),
    }
  }

  const selectedDetails = selectedBooking ? getBookingDetails(selectedBooking) : null

  const updateStatus = async (id, status) => {
    if (!onUpdateStatus) return
    await onUpdateStatus(id, status)
    setSelectedBooking((current) => (current?.id === id ? { ...current, status } : current))
  }

  const updateStaff = async (id, staffId) => {
    if (!onUpdateBookingStaff) return
    const normalizedStaffId = Number(staffId) || null
    await onUpdateBookingStaff(id, normalizedStaffId)
    setSelectedBooking((current) =>
      current?.id === id
        ? { ...current, staff_id: normalizedStaffId, staff_name: staffNameMap[normalizedStaffId] || current?.staff_name || getStaffName(staff.find((member) => String(member.id) === String(staffId))) }
        : current
    )
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="預約紀錄"
        title="預約總覽與月曆篩選"
        description="先看整月預約分布，再點選單日疊加篩選、查單與更新狀態。"
        actions={<Pill>{filteredBookings.length} 筆顯示中</Pill>}
      />

      <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)', display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>月曆總覽</div>
            <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 800 }}>{calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {dateFromFilter && dateToFilter && dateFromFilter === dateToFilter ? <Pill tone="warning">已選日期：{dateFromFilter}</Pill> : <Pill tone="muted">未指定單日</Pill>}
            <button type="button" className="btn btn-small btn-interactive" onClick={() => setCalendarMonth((current) => addMonths(current, -1))}>上月</button>
            <button type="button" className="btn btn-small btn-interactive" onClick={() => setCalendarMonth((current) => addMonths(current, 1))}>下月</button>
            <button type="button" className="btn btn-small btn-interactive" onClick={() => { setDateFromFilter(''); setDateToFilter('') }}>清除日期篩選</button>
          </div>
        </div>

        <div className="hide-scrollbar" style={{ overflowX: 'auto', margin: '0 -18px', padding: '0 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', gap: '8px', minWidth: '600px' }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ padding: '6px 4px', fontSize: '12px', fontWeight: 800, color: '#A68B6A', textAlign: 'center' }}>星期{label}</div>
            ))}
            {calendarCells.map((cell) => {
              const daySummary = bookingsByDate[cell.iso]
              const isSelected = dateFromFilter && dateToFilter && dateFromFilter === dateToFilter && dateFromFilter === cell.iso
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => { setDateFromFilter(cell.iso); setDateToFilter(cell.iso) }}
                  style={{
                    minHeight: '112px',
                    borderRadius: '14px',
                    border: `1px solid ${isSelected ? 'rgba(166, 139, 106, 0.52)' : '#EEE7DE'}`,
                    background: isSelected ? 'linear-gradient(180deg, #fff, #FBF8F4)' : '#fff',
                    padding: '8px',
                    textAlign: 'left',
                    color: cell.inMonth ? 'var(--text)' : '#C8BFB3',
                    cursor: 'pointer',
                    display: 'grid',
                    alignContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>{String(cell.day).padStart(2, '0')}</div>
                  {daySummary ? (
                    <div style={{ display: 'grid', gap: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800 }}>{daySummary.total} 筆</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {daySummary.pending > 0 ? <Pill tone="warning">{daySummary.pending} 待處理</Pill> : null}
                        {daySummary.confirmed > 0 ? <Pill tone="success">{daySummary.confirmed} 已確認</Pill> : null}
                        {daySummary.completed > 0 ? <Pill>{daySummary.completed} 已完成</Pill> : null}
                        {daySummary.cancelled > 0 ? <Pill tone="danger">{daySummary.cancelled} 已取消</Pill> : null}
                      </div>
                    </div>
                  ) : <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>沒有預約</div>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <RecordFilterBar columns="repeat(auto-fit, minmax(160px, 1fr))" actions={<button type="button" className="btn btn-small btn-interactive" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setProviderFilter('all'); setLocationFilter('all'); setProviderGroupFilter('all'); setServiceFilter('all'); setDateFromFilter(''); setDateToFilter('') }}>清除所有篩選</button>}>
        <input type="text" placeholder="搜尋顧客、服務、供應者、地點、票券…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={fieldStyle} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部狀態</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} style={fieldStyle} />
        <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} style={fieldStyle} />
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部服務</option>
          {(services || []).map((service) => <option key={service.id} value={String(service.id)}>{service.name}</option>)}
        </select>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部服務供應者</option>
          {(staff || []).map((member) => <option key={member.id} value={String(member.id)}>{member.name}</option>)}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部地點</option>
          {(locations || []).map((location) => <option key={location.id} value={String(location.id)}>{location.name || location.title || `地點 #${location.id}`}</option>)}
        </select>
        <select value={providerGroupFilter} onChange={(e) => setProviderGroupFilter(e.target.value)} style={fieldStyle}>
          <option value="all">全部服務群組</option>
          {(providerGroups || []).map((group) => <option key={group.id} value={String(group.id)}>{group.name || group.title || `群組 #${group.id}`}</option>)}
        </select>
      </RecordFilterBar>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1120px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>預約時間</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>顧客</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>服務</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>地點 / 供應者</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>付款 / 票券</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>狀態</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-light)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr><td colSpan="7"><EmptyState title="暫時沒有預約紀錄" description="請嘗試其他搜尋字詞，或清除篩選條件。" /></td></tr>
              ) : filteredBookings.map((booking) => {
                const status = booking.status || 'pending'
                const statusMeta = STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0]
                return (
                  <tr key={booking.id} className="admin-table-row" style={{ borderBottom: '1px solid #f6f6f6', cursor: 'pointer' }} onClick={() => setSelectedBooking(booking)}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 800 }}>{getBookingDate(booking) || '-'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, marginTop: '3px' }}>{getBookingTime(booking) || '-'}</div>
                      {booking.ref ? <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>預約編號 #{booking.ref}</div> : null}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 800 }}>{getCustomerName(booking)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(booking) || '-'}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{getServiceName(booking)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{Number(booking.final_price ?? booking.service_price ?? 0).toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{getLocationName(booking)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getProviderGroupName(booking) !== '-' ? `${getProviderGroupName(booking)} / ` : ''}{getProviderName(booking)}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{getPaymentText(booking)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getTicketText(booking) || '沒有票券'}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span className="badge" style={{ border: 'none', background: statusMeta.tone === 'success' ? '#ECFDF5' : statusMeta.tone === 'warning' ? '#FEF3C7' : statusMeta.tone === 'danger' ? '#FEF2F2' : '#E5E7EB', color: statusMeta.tone === 'success' ? '#047857' : statusMeta.tone === 'warning' ? '#B45309' : statusMeta.tone === 'danger' ? '#DC2626' : '#374151' }}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedBooking(booking) }} className="btn-interactive" style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                        詳情
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedBooking(null)}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '760px', padding: '24px', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedBooking(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>×</button>
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>預約詳情</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedBooking.ref || '預約'}</h3>
            </div>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>預約時間</div><div style={{ fontWeight: 800 }}>{getBookingDate(selectedBooking)} {getBookingTime(selectedBooking)}</div></div>
                  <div><div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>顧客</div><div style={{ fontWeight: 800 }}>{getCustomerName(selectedBooking)}</div><div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(selectedBooking) || '-'}</div></div>
                </div>
              </div>
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <LabelBlock label="服務" value={getServiceName(selectedBooking)} />
                  <LabelBlock label="地點" value={selectedDetails?.locationName || getLocationName(selectedBooking)} />
                  <LabelBlock label="服務群組" value={selectedDetails?.providerGroupName || getProviderGroupName(selectedBooking)} />
                  <LabelBlock label="服務供應者" value={getProviderName(selectedBooking)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <LabelBlock label="付款" value={getPaymentText(selectedBooking)} />
                  <LabelBlock label="票券" value={getTicketText(selectedBooking) || '沒有票券'} />
                  <LabelBlock label="訂單" value={selectedDetails?.linkedOrders.length ? `${selectedDetails.linkedOrders.length} 筆` : '沒有訂單'} />
                  <LabelBlock label="交易" value={selectedDetails?.linkedTransactions.length ? `${selectedDetails.linkedTransactions.length} 筆` : '沒有交易'} />
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <SummaryBlock title="資源分配">
                    {selectedDetails?.allocations.length ? selectedDetails.allocations.map((row) => (
                      <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div><div style={{ fontWeight: 700 }}>{resourceNameMap[row.resource_id] || `資源 #${row.resource_id || '-'}`}</div><div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>數量 {row.quantity ?? 1}{row.required === false ? ' · 可選' : ' · 必要'}</div></div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', textAlign: 'right' }}>{row.status || '已分配'}</div>
                      </div>
                    )) : <div style={{ color: 'var(--text-light)' }}>此預約未附任何資源分配。</div>}
                  </SummaryBlock>
                  <SummaryBlock title="關聯交易">
                    {selectedDetails?.linkedTransactions.length ? selectedDetails.linkedTransactions.map((transaction) => (
                      <div key={transaction.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div><div style={{ fontWeight: 700 }}>{getTransactionRef(transaction) || `交易 #${transaction.id}`}</div><div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getTransactionCustomerName(transaction) || transaction.payment_method || transaction.kind || '交易'}</div></div>
                        <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{Number(transaction.amount || 0).toLocaleString()}</div>
                      </div>
                    )) : <div style={{ color: 'var(--text-light)' }}>沒有關聯交易。</div>}
                  </SummaryBlock>
                </div>
              </div>
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>狀態</div>
                    <select value={selectedBooking.status || 'pending'} onChange={(e) => updateStatus(selectedBooking.id, e.target.value)} style={smallFieldStyle}>
                      {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>服務供應者</div>
                    <select value={selectedBooking.staff_id || ''} onChange={(e) => updateStaff(selectedBooking.id, e.target.value)} style={smallFieldStyle}>
                      <option value="">未分配</option>
                      {(staff || []).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedBooking(null)} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>關閉</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

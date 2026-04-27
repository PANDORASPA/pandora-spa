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
const getPaymentText = (booking) => booking?.payment || booking?.payment_method || booking?.payment_status || '未記錄'
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
  compact = false,
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
    const result = await onUpdateStatus(id, status)
    if (result === false) return
    setSelectedBooking((current) => (current?.id === id ? { ...current, status } : current))
  }

  const updateStaff = async (id, staffId) => {
    if (!onUpdateBookingStaff) return
    const normalizedStaffId = Number(staffId) || null
    const result = await onUpdateBookingStaff(id, normalizedStaffId)
    if (result === false) return
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
          <div><div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>月曆總覽</div><div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 800 }}>{calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {dateFromFilter && dateToFilter && dateFromFilter === dateToFilter ? <Pill tone="warning">已選日期：{dateFromFilter}</Pill> : <Pill tone="muted">未指定單日</Pill>}
            <button type="button" className="btn btn-small btn-interactive" onClick={() => setCalendarMonth((current) => addMonths(current, -1))}>上月</button>
            <button type="button" className="btn btn-small btn-interactive" onClick={() => setCalendarMonth((current) => addMonths(current, 1))}>下月</button>
            <button type="button" className="btn btn-small btn-interactive" onClick={() => { setDateFromFilter(''); setDateToFilter('') }}>清除日期篩選</button>
          </div>
        </div>
        <div className="hide-scrollbar" style={{ overflowX: 'auto', margin: compact ? '0 -12px' : '0 -18px', padding: compact ? '0 12px' : '0 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', gap: compact ? '6px' : '8px', minWidth: compact ? '560px' : '600px' }}>
            {WEEKDAY_LABELS.map((label) => <div key={label} style={{ padding: '6px 4px', fontSize: '12px', fontWeight: 800, color: '#A68B6A', textAlign: 'center' }}>星期{label}</div>)}
            {calendarCells.map((cell) => {
              const daySummary = bookingsByDate[cell.iso]
              const isSelected = dateFromFilter && dateToFilter && dateFromFilter === dateToFilter && dateFromFilter === cell.iso
              return <button key={cell.iso} type="button" onClick={() => { setDateFromFilter(cell.iso); setDateToFilter(cell.iso) }} style={{ minHeight: compact ? '96px' : '112px', borderRadius: '14px', border: `1px solid ${isSelected ? 'rgba(166, 139, 106, 0.52)' : '#EEE7DE'}`, background: isSelected ? 'linear-gradient(180deg, #fff, #FBF8F4)' : '#fff', padding: '8px', textAlign: 'left', color: cell.inMonth ? 'var(--text)' : '#C8BFB3', cursor: 'pointer', display: 'grid', alignContent: 'space-between', gap: '8px' }}><div style={{ fontSize: '16px', fontWeight: 800 }}>{String(cell.day).padStart(2, '0')}</div>{daySummary ? <div style={{ display: 'grid', gap: '4px' }}><div style={{ fontSize: '11px', fontWeight: 800 }}>{daySummary.total} 筆</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{daySummary.pending > 0 ? <Pill tone="warning">{daySummary.pending} 待處理</Pill> : null}{daySummary.confirmed > 0 ? <Pill tone="success">{daySummary.confirmed} 已確認</Pill> : null}{daySummary.completed > 0 ? <Pill>{daySummary.completed} 已完成</Pill> : null}{daySummary.cancelled > 0 ? <Pill tone="danger">{daySummary.cancelled} 已取消</Pill> : null}</div></div> : <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>沒有預約</div>}</button>
            })}
          </div>
        </div>
      </div>
      <RecordFilterBar columns="repeat(auto-fit, minmax(160px, 1fr))" actions={<button type="button" className="btn btn-small btn-interactive" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setProviderFilter('all'); setLocationFilter('all'); setProviderGroupFilter('all'); setServiceFilter('all'); setDateFromFilter(''); setDateToFilter('') }}>清除所有篩選</button>}>
        <input type="text" placeholder="搜尋顧客、服務、供應者、地點、票券" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={fieldStyle} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}><option value="all">全部狀態</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} style={fieldStyle} />
        <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} style={fieldStyle} />
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={fieldStyle}><option value="all">全部服務</option>{(services || []).map((service) => <option key={service.id} value={String(service.id)}>{service.name}</option>)}</select>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} style={fieldStyle}><option value="all">全部服務供應者</option>{(staff || []).map((member) => <option key={member.id} value={String(member.id)}>{member.name}</option>)}</select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={fieldStyle}><option value="all">全部地點</option>{(locations || []).map((location) => <option key={location.id} value={String(location.id)}>{location.name || location.title || `地點 #${location.id}`}</option>)}</select>
        <select value={providerGroupFilter} onChange={(e) => setProviderGroupFilter(e.target.value)} style={fieldStyle}><option value="all">全部服務群組</option>{(providerGroups || []).map((group) => <option key={group.id} value={String(group.id)}>{group.name || group.title || `群組 #${group.id}`}</option>)}</select>
      </RecordFilterBar>
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        {filteredBookings.length === 0 ? <EmptyState title="暫時沒有預約紀錄" description="請嘗試其他搜尋字詞，或清除篩選條件。" /> : <div className="hide-scrollbar" style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: compact ? '760px' : '1120px' }}><thead><tr style={{ background: '#F8F5F1', color: '#6B7280', textAlign: 'left' }}>{['預約時間', '顧客', '服務', '地點 / 供應者', '付款 / 票券', '狀態', '操作'].map((heading) => <th key={heading} style={{ padding: '12px' }}>{heading}</th>)}</tr></thead><tbody>{filteredBookings.map((booking) => { const status = booking.status || 'pending'; const statusMeta = STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0]; return <tr key={booking.id} style={{ borderTop: '1px solid #EEE7DD' }}><td style={{ padding: '12px', verticalAlign: 'top' }}><div style={{ fontWeight: 800 }}>{getBookingDate(booking) || '-'}</div><div style={{ color: 'var(--primary)', fontWeight: 700 }}>{getBookingTime(booking) || '-'}</div><div style={{ color: 'var(--text-light)', fontSize: '12px' }}>預約編號 #{booking.id}</div></td><td style={{ padding: '12px', verticalAlign: 'top' }}><div style={{ fontWeight: 800 }}>{getCustomerName(booking)}</div><div style={{ color: 'var(--text-light)' }}>{getCustomerPhone(booking) || '-'}</div></td><td style={{ padding: '12px', verticalAlign: 'top' }}>{getServiceName(booking)}</td><td style={{ padding: '12px', verticalAlign: 'top' }}><div>{getLocationName(booking)}</div><div style={{ color: 'var(--text-light)' }}>{getProviderName(booking)}</div></td><td style={{ padding: '12px', verticalAlign: 'top' }}><div>{getPaymentText(booking)}</div><div style={{ color: 'var(--text-light)' }}>{getTicketText(booking) || '沒有票券'}</div></td><td style={{ padding: '12px', verticalAlign: 'top' }}><Pill tone={statusMeta.tone}>{statusMeta.label}</Pill></td><td style={{ padding: '12px', verticalAlign: 'top' }}><button type="button" className="btn btn-small btn-interactive" onClick={() => setSelectedBooking(booking)}>詳情</button></td></tr> })}</tbody></table></div>}
      </div>
      {selectedBooking ? <div className="modal-overlay" onClick={() => setSelectedBooking(null)}><div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '760px' }}><button type="button" className="modal-close" onClick={() => setSelectedBooking(null)}>×</button><div style={{ display: 'grid', gap: '16px' }}><SectionHeader eyebrow="預約詳情" title={getServiceName(selectedBooking) || '預約'} description={`${getBookingDate(selectedBooking) || '-'} ${getBookingTime(selectedBooking) || ''}`} /><div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '14px' }}><LabelBlock label="顧客" value={`${getCustomerName(selectedBooking)}${getCustomerPhone(selectedBooking) ? ` / ${getCustomerPhone(selectedBooking)}` : ''}`} /><LabelBlock label="地點" value={getLocationName(selectedBooking)} /><LabelBlock label="服務群組" value={getProviderGroupName(selectedBooking)} /><LabelBlock label="付款" value={getPaymentText(selectedBooking)} /><LabelBlock label="票券" value={getTicketText(selectedBooking) || '沒有票券'} /><LabelBlock label="服務供應者" value={getProviderName(selectedBooking)} /></div><div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}><select value={selectedBooking.status || 'pending'} onChange={(event) => updateStatus(selectedBooking.id, event.target.value)} style={smallFieldStyle}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={selectedBooking.staff_id || ''} onChange={(event) => updateStaff(selectedBooking.id, event.target.value)} style={smallFieldStyle}><option value="">未分配</option>{(staff || []).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><button type="button" className="btn btn-small btn-interactive" onClick={() => setSelectedBooking(null)}>關閉</button></div></div></div></div> : null}
    </div>
  )
}

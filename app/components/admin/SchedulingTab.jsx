'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { EmptyState, Pill, SectionHeader, bookingOpsCopy, fieldStyle, smallFieldStyle } from './opsUi'

const WEEK_DAYS = [
  { key: '1', label: '星期一' },
  { key: '2', label: '星期二' },
  { key: '3', label: '星期三' },
  { key: '4', label: '星期四' },
  { key: '5', label: '星期五' },
  { key: '6', label: '星期六' },
  { key: '0', label: '星期日' },
]

let tempSeed = -1
const nextTempId = () => tempSeed--
const todayISO = () => new Date().toISOString().slice(0, 10)
const monthKeyFromDate = (value) => String(value || '').slice(0, 7)

const addMonths = (monthKey, delta) => {
  const date = new Date(`${monthKey}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + delta, 1)
  return date.toISOString().slice(0, 7)
}

const monthTitle = (monthKey) =>
  new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'long', timeZone: 'Asia/Hong_Kong' }).format(new Date(`${monthKey}-01T12:00:00Z`))

const buildMonthGrid = (monthKey) => {
  const first = new Date(`${monthKey}-01T12:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const start = new Date(first)
  start.setUTCDate(start.getUTCDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start)
    current.setUTCDate(start.getUTCDate() + index)
    const dateISO = current.toISOString().slice(0, 10)
    return { dateISO, inMonth: dateISO.startsWith(monthKey), dayLabel: dateISO.slice(8, 10) }
  })
}

const formatTime = (value) => String(value || '').slice(0, 5)
const CALENDAR_LIMITED_LABEL = '上班 / 規則限制'
const CALENDAR_LIMITED_HINTS = {
  provider_mismatch: '目前所選服務與服務供應者設定未能對上，暫時不會顯示可預約時段。',
  location_required: '此服務需要先選擇地點，否則不會建立可預約時段。',
  no_bookable_slots: '有上班，但時段已被休息、假期或封鎖規則扣減。',
  resource_full: '有上班，但資源設備已滿，所以前台仍會顯示已滿。',
  fully_booked: '有上班，但目前所有可預約時段已被預約完。',
}

const cardStyle = {
  border: '1px solid #E5E7EB',
  borderRadius: '18px',
  padding: '16px',
  background: '#fff',
}

const dayModeButtonStyle = (active) => ({
  padding: '8px 12px',
  borderRadius: '999px',
  border: `1px solid ${active ? '#A68B6A' : '#E5E7EB'}`,
  background: active ? '#FFF8EE' : '#fff',
  color: active ? '#8B5E34' : '#6B7280',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
})

const getPreviewStatusCopy = (entry = {}) => {
  const status = entry?.status || 'off'
  if (status === 'available') {
    const availableCount = Number(entry?.availableCount || 0)
    return {
      tone: 'success',
      label: bookingOpsCopy.calendarAvailable,
      hint: availableCount > 0 ? `可預約 ${availableCount} 個時段` : '有上班，正在整理可預約時段',
    }
  }
  if (status === 'off') {
    return {
      tone: 'muted',
      label: bookingOpsCopy.calendarRest,
      hint: bookingOpsCopy.offDayHint,
    }
  }
  if (entry?.reason === 'provider_mismatch') {
    return {
      tone: 'warning',
      label: CALENDAR_LIMITED_LABEL,
      hint: CALENDAR_LIMITED_HINTS.provider_mismatch,
    }
  }
  if (entry?.reason === 'location_required') {
    return {
      tone: 'warning',
      label: CALENDAR_LIMITED_LABEL,
      hint: CALENDAR_LIMITED_HINTS.location_required,
    }
  }
  if (entry?.reason === 'no_bookable_slots') {
    return {
      tone: 'warning',
      label: CALENDAR_LIMITED_LABEL,
      hint: CALENDAR_LIMITED_HINTS.no_bookable_slots,
    }
  }
  if (entry?.reason === 'resource_full') {
    return {
      tone: 'warning',
      label: bookingOpsCopy.calendarFull,
      hint: CALENDAR_LIMITED_HINTS.resource_full,
    }
  }
  if (entry?.reason === 'fully_booked') {
    return {
      tone: 'warning',
      label: bookingOpsCopy.calendarFull,
      hint: CALENDAR_LIMITED_HINTS.fully_booked,
    }
  }
  return {
    tone: 'warning',
    label: bookingOpsCopy.calendarFull,
    hint: bookingOpsCopy.fullDayHint,
  }
}

const normalizeDateValue = (value) => String(value || '').slice(0, 10)

const normalizeOptionalNumber = (value) => {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeDayList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter((item) => /^[0-6]$/.test(item))
  }
  const text = String(value || '').trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter((item) => /^[0-6]$/.test(item))
    }
  } catch {}
  return text
    .split(',')
    .map((item) => String(item || '').trim())
    .filter((item) => /^[0-6]$/.test(item))
}

const holidayMatchesPreviewScope = (holiday, { dateISO, locationId, staffId, providerGroupIds = [] }) => {
  const holidayDate = normalizeDateValue(holiday?.holiday_date)
  const endDate = normalizeDateValue(holiday?.end_date || holiday?.holiday_date)
  if (!holidayDate || holidayDate > dateISO || endDate < dateISO) return false

  const holidayLocationId = normalizeOptionalNumber(holiday?.location_id)
  const holidayStaffId = normalizeOptionalNumber(holiday?.staff_id)
  const holidayProviderGroupId = normalizeOptionalNumber(holiday?.provider_group_id)

  if (!holidayLocationId && !holidayStaffId && !holidayProviderGroupId) return true
  if (holidayStaffId && holidayStaffId === Number(staffId)) return true
  if (holidayLocationId && locationId && holidayLocationId === Number(locationId)) return true
  if (holidayProviderGroupId && providerGroupIds.includes(Number(holidayProviderGroupId))) return true
  return false
}

const getSelectedDatePlan = ({
  dateISO,
  staff,
  settings = {},
  holidays = [],
  selectedService = null,
  serviceLocations = [],
  serviceProviderGroups = [],
  shiftRows = [],
  breakRows = [],
  timeOffRows = [],
  blockedRows = [],
}) => {
  if (!dateISO || !staff) return null
  const dayOfWeek = String(new Date(`${dateISO}T00:00:00Z`).getUTCDay())
  const override = (shiftRows || []).find((row) => normalizeDateValue(row.date) === dateISO)
  const normalizedStaffDaysOff = normalizeDayList(staff?.daysOff ?? staff?.daysoff)
  const isDayOff = normalizedStaffDaysOff.includes(dayOfWeek)
  const baseline = staff?.schedule?.[dayOfWeek] || {}
  const baselineWindow =
    baseline.start && baseline.end
      ? {
          start: formatTime(baseline.start),
          end: formatTime(baseline.end),
          source: '每週時間表',
        }
      : null
  const businessDayOff = normalizeDayList(settings?.days_off).includes(dayOfWeek)
  const selectedServiceLocationIds = (serviceLocations || [])
    .filter((row) => Number(row?.service_id) === Number(selectedService?.id) && row?.enabled !== false)
    .map((row) => normalizeOptionalNumber(row?.location_id))
    .filter(Boolean)
  const selectedServiceProviderGroupIds = (serviceProviderGroups || [])
    .filter((row) => Number(row?.service_id) === Number(selectedService?.id))
    .map((row) => normalizeOptionalNumber(row?.provider_group_id))
    .filter(Boolean)
  const resolvedLocationId = normalizeOptionalNumber(staff?.location_id)
  const resolvedProviderGroupId = normalizeOptionalNumber(staff?.provider_group_id)
  const matchedHolidays = (holidays || []).filter((holiday) =>
    holidayMatchesPreviewScope(holiday, {
      dateISO,
      locationId: resolvedLocationId,
      staffId: staff?.id,
      providerGroupIds: resolvedProviderGroupId ? [resolvedProviderGroupId] : [],
    }),
  )
  const holidayClosed = matchedHolidays.some((holiday) => holiday?.is_closed !== false)

  const workingWindow = businessDayOff
    ? null
    : holidayClosed
      ? null
      : override
        ? override.is_off
          ? null
          : {
              start: formatTime(override.start_time || baseline.start),
              end: formatTime(override.end_time || baseline.end),
              source: '日期覆蓋',
            }
        : isDayOff
          ? null
          : baselineWindow

  return {
    dayKey: dayOfWeek,
    baselineWindow,
    workingWindow,
    override: override || null,
    isDayOff,
    businessDayOff,
    matchedHolidays,
    holidayClosed,
    resolvedLocationId,
    resolvedProviderGroupId,
    selectedServiceLocationIds,
    selectedServiceProviderGroupIds,
    serviceLocationMatched:
      selectedServiceLocationIds.length === 0 ||
      !resolvedLocationId ||
      selectedServiceLocationIds.includes(resolvedLocationId),
    serviceProviderGroupMatched:
      selectedServiceProviderGroupIds.length === 0 ||
      !resolvedProviderGroupId ||
      selectedServiceProviderGroupIds.includes(resolvedProviderGroupId),
    breaks: (breakRows || []).filter((row) => String(row.day_of_week ?? '') === dayOfWeek && row.enabled !== false),
    timeOff: (timeOffRows || []).filter((row) => normalizeDateValue(row.date) === dateISO),
    blocked: (blockedRows || []).filter((row) => normalizeDateValue(row.date) === dateISO),
  }
}

function RowsEditor({ title, description, emptyDescription, rows, onAdd, onRemove, renderRow, setRows }) {
  return (
    <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 900 }}>{title}</div>
          <div style={{ marginTop: '4px', fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>{description}</div>
        </div>
        <button type="button" className="btn btn-secondary btn-interactive" onClick={onAdd}>
          新增
        </button>
      </div>

      {!rows.length ? (
        <EmptyState title={`尚未設定${title}`} description={emptyDescription || '按「新增」即可建立一筆設定。'} />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(130px, 1.2fr) repeat(3, minmax(110px, 0.9fr)) 88px',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              {renderRow(row, (patch) => setRows((current) => current.map((item) => (item.id === row.id ? { ...item, ...patch } : item))))}
              <button
                type="button"
                className="btn btn-small btn-interactive"
                onClick={() => onRemove(row.id)}
                style={{ background: '#FEF2F2', color: '#B91C1C' }}
              >
                刪除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SchedulingTab({
  staff = [],
  services = [],
  operationalContext = {},
  staffShifts = [],
  staffBreaks = [],
  staffTimeOff = [],
  blockedSlots = [],
  onAddStaff,
  onDeleteStaff,
  onUpdateField,
  onToggleService,
  onSetDailyMode,
  onUpdateSchedule,
  onSave,
  onSaveShifts,
  onSaveBreaks,
  onSaveTimeOff,
  onSaveBlockedSlots,
  saving = false,
}) {
  const locations = operationalContext?.locations || []
  const providerGroups = operationalContext?.providerGroups || []
  const holidays = operationalContext?.holidays || []
  const settings = operationalContext?.settings || {}
  const serviceLocations = operationalContext?.serviceLocations || []
  const serviceProviderGroups = operationalContext?.serviceProviderGroups || []
  const availableTables = operationalContext?.availableTables || {}
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id ?? null)
  const [previewMonth, setPreviewMonth] = useState(monthKeyFromDate(todayISO()))
  const [previewServiceId, setPreviewServiceId] = useState('')
  const [selectedPreviewDate, setSelectedPreviewDate] = useState('')
  const [previewDates, setPreviewDates] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [selectedAvailabilityDebug, setSelectedAvailabilityDebug] = useState(null)
  const [selectedAvailabilityLoading, setSelectedAvailabilityLoading] = useState(false)
  const [selectedAvailabilityError, setSelectedAvailabilityError] = useState('')
  const [previewNonce, setPreviewNonce] = useState(0)
  const previewControllerRef = useRef(null)
  const availabilityDebugControllerRef = useRef(null)
  const [shiftRows, setShiftRows] = useState([])
  const [shiftDeletedIds, setShiftDeletedIds] = useState([])
  const [breakRows, setBreakRows] = useState([])
  const [breakDeletedIds, setBreakDeletedIds] = useState([])
  const [timeOffRows, setTimeOffRows] = useState([])
  const [timeOffDeletedIds, setTimeOffDeletedIds] = useState([])
  const [blockedRows, setBlockedRows] = useState([])
  const [blockedDeletedIds, setBlockedDeletedIds] = useState([])

  const selectedStaff = useMemo(() => staff.find((item) => Number(item.id) === Number(selectedStaffId)) || staff[0] || null, [selectedStaffId, staff])
  const selectedStaffDaysOff = useMemo(
    () => normalizeDayList(selectedStaff?.daysOff ?? selectedStaff?.daysoff),
    [selectedStaff?.daysOff, selectedStaff?.daysoff],
  )
  const selectedStaffServicesKey = useMemo(
    () => (selectedStaff?.services || []).map((value) => String(value)).join(','),
    [selectedStaff?.services],
  )
  const selectedPreviewService = useMemo(
    () => services.find((service) => String(service.id) === String(previewServiceId)) || null,
    [previewServiceId, services],
  )
  const previewMap = useMemo(() => new Map(previewDates.map((entry) => [entry.date, entry])), [previewDates])
  const previewGrid = useMemo(() => buildMonthGrid(previewMonth), [previewMonth])
  const selectedPreviewEntry = selectedPreviewDate ? previewMap.get(selectedPreviewDate) || null : null
  const selectedDatePlan = useMemo(
      () =>
        getSelectedDatePlan({
          dateISO: selectedPreviewDate,
          staff: selectedStaff,
          settings,
          holidays,
          selectedService: selectedPreviewService,
          serviceLocations,
          serviceProviderGroups,
          shiftRows,
          breakRows,
          timeOffRows,
          blockedRows,
        }),
    [blockedRows, breakRows, holidays, selectedPreviewDate, selectedPreviewService, selectedStaff, serviceLocations, serviceProviderGroups, settings, shiftRows, timeOffRows],
  )

  useEffect(() => {
    if (!staff.length) return
    if (!selectedStaff || !staff.some((item) => Number(item.id) === Number(selectedStaff.id))) {
      setSelectedStaffId(staff[0].id)
    }
  }, [staff, selectedStaff])

  useEffect(() => {
    if (!selectedStaff) return
    setShiftRows(
      (staffShifts || [])
        .filter((row) => Number(row.staff_id) === Number(selectedStaff.id))
        .map((row) => ({
          ...row,
          date: String(row.date || '').slice(0, 10),
          start_time: formatTime(row.start_time),
          end_time: formatTime(row.end_time),
        })),
    )
    setShiftDeletedIds([])
    setBreakRows(
      (staffBreaks || [])
        .filter((row) => Number(row.staff_id) === Number(selectedStaff.id))
        .map((row) => ({
          ...row,
          day_of_week: String(row.day_of_week ?? '1'),
          start_time: formatTime(row.start_time),
          end_time: formatTime(row.end_time),
          label: row.label || '',
          enabled: row.enabled !== false,
        })),
    )
    setBreakDeletedIds([])
    setTimeOffRows(
      (staffTimeOff || [])
        .filter((row) => Number(row.staff_id) === Number(selectedStaff.id))
        .map((row) => ({
          ...row,
          date: String(row.date || '').slice(0, 10),
          start_time: formatTime(row.start_time),
          end_time: formatTime(row.end_time),
          reason: row.reason || '',
          is_all_day: Boolean(row.is_all_day),
        })),
    )
    setTimeOffDeletedIds([])
    setBlockedRows(
      (blockedSlots || [])
        .filter((row) => Number(row.staff_id) === Number(selectedStaff.id))
        .map((row) => ({
          ...row,
          date: String(row.date || '').slice(0, 10),
          start_time: formatTime(row.start_time),
          end_time: formatTime(row.end_time),
          reason: row.reason || '',
          source: row.source || 'manual',
        })),
    )
    setBlockedDeletedIds([])
  }, [blockedSlots, selectedStaff?.id, staffBreaks, staffShifts, staffTimeOff])

  useEffect(() => {
    const nextService =
      selectedStaff?.services?.[0] != null
        ? String(selectedStaff.services[0])
        : services[0]?.id != null
          ? String(services[0].id)
          : ''

    setPreviewServiceId((current) => {
      if (!nextService) return ''
      if (!current) return nextService
      const currentValid = services.some((service) => String(service.id) === String(current))
      return currentValid ? current : nextService
    })
  }, [selectedStaff?.id, selectedStaffServicesKey, services])

  useEffect(() => {
    if (!selectedStaff?.id || !previewServiceId || !previewMonth) {
      setPreviewDates([])
      setSelectedPreviewDate('')
      return
    }

    previewControllerRef.current?.abort?.()
    const controller = new AbortController()
    previewControllerRef.current = controller
    setPreviewLoading(true)
    setPreviewError('')
    setPreviewDates([])

    const params = new URLSearchParams({
      staffId: String(selectedStaff.id),
      serviceId: String(previewServiceId),
      year: previewMonth.slice(0, 4),
      month: previewMonth.slice(5, 7),
    })

    if (selectedStaff.location_id != null && selectedStaff.location_id !== '') {
      params.set('locationId', String(selectedStaff.location_id))
    }

    fetch(`/api/availability/month-summary?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || bookingOpsCopy.loadFailed)
        return payload
      })
      .then((payload) => setPreviewDates(Array.isArray(payload?.dates) ? payload.dates : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setPreviewError(error?.message || bookingOpsCopy.loadFailed)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false)
      })

    return () => controller.abort()
  }, [previewMonth, previewNonce, previewServiceId, selectedStaff?.id, selectedStaff?.location_id])

  useEffect(() => {
    if (!previewDates.length) {
      setSelectedPreviewDate('')
      return
    }
    const current = selectedPreviewDate ? previewMap.get(selectedPreviewDate) : null
    if (current && selectedPreviewDate.startsWith(previewMonth)) return
    const firstPreferred =
      previewDates.find((entry) => entry?.status === 'available') ||
      previewDates.find((entry) => entry?.status === 'full') ||
      previewDates.find((entry) => entry?.status === 'off')
    setSelectedPreviewDate(firstPreferred?.date || '')
  }, [previewDates, previewMap, previewMonth, selectedPreviewDate])

  useEffect(() => {
    if (!selectedStaff?.id || !previewServiceId || !selectedPreviewDate) {
      setSelectedAvailabilityDebug(null)
      setSelectedAvailabilityError('')
      setSelectedAvailabilityLoading(false)
      return
    }

    availabilityDebugControllerRef.current?.abort?.()
    const controller = new AbortController()
    availabilityDebugControllerRef.current = controller
    setSelectedAvailabilityLoading(true)
    setSelectedAvailabilityError('')

    const params = new URLSearchParams({
      staffId: String(selectedStaff.id),
      serviceId: String(previewServiceId),
      date: selectedPreviewDate,
      debug: '1',
    })

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || bookingOpsCopy.loadFailed)
        return payload
      })
      .then((payload) => {
        if (controller.signal.aborted) return
        setSelectedAvailabilityDebug({
          slots: Array.isArray(payload?.slots) ? payload.slots : [],
          slotMatrix: Array.isArray(payload?.slotMatrix) ? payload.slotMatrix : [],
          dateSummaryReason: payload?.dateSummaryReason || '',
          debug: payload?.debug || null,
        })
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setSelectedAvailabilityDebug(null)
          setSelectedAvailabilityError(error?.message || bookingOpsCopy.loadFailed)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSelectedAvailabilityLoading(false)
      })

    return () => controller.abort()
  }, [previewServiceId, selectedPreviewDate, selectedStaff?.id])
  const removeRow = (setRows, setDeletedIds, id) => {
    setRows((current) => current.filter((row) => row.id !== id))
    if (Number(id) > 0) setDeletedIds((current) => [...current, Number(id)])
  }

  const saveAll = async () => {
    if (!selectedStaff?.id) return
    try {
      await onSave?.(selectedStaff.id, { silentSuccess: true })
      await onSaveShifts?.({ rows: shiftRows, deletedIds: shiftDeletedIds }, { silentSuccess: true })
      await onSaveBreaks?.({ rows: breakRows, deletedIds: breakDeletedIds }, { silentSuccess: true })
      await onSaveTimeOff?.({ rows: timeOffRows, deletedIds: timeOffDeletedIds }, { silentSuccess: true })
      await onSaveBlockedSlots?.({ rows: blockedRows, deletedIds: blockedDeletedIds }, { silentSuccess: true })
      setPreviewNonce((current) => current + 1)
      toast.success('已儲存目前服務供應者')
    } catch (error) {
      toast.error(error?.message || '儲存失敗，請再試一次')
    }
  }

  if (!staff.length) {
    return (
      <div style={{ display: 'grid', gap: '18px' }}>
        <SectionHeader
          eyebrow="服務供應者"
          title="排班設定"
          description="先建立服務供應者，之後即可設定每週上班時間、日期覆蓋、休息、休假與封鎖時段。"
        />
        <EmptyState
          title="尚未建立服務供應者"
          description="新增一位服務供應者後，就可以設定每日上班與下班時間，並在前台月曆對照可預約結果。"
          actions={
            <button type="button" className="btn btn-interactive" onClick={onAddStaff}>
              新增服務供應者
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <SectionHeader
        eyebrow="排班中心"
        title="服務供應者排班與前台對照"
        description="設定每週上班與下班時間、日期覆蓋、固定休息、休假與封鎖時段，前台月曆會直接反映這些排班規則。"
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-interactive" onClick={onAddStaff} disabled={saving}>
              新增服務供應者
            </button>
            <button type="button" className="btn btn-interactive" onClick={saveAll} disabled={saving || !selectedStaff}>
              {saving ? '儲存中…' : '儲存目前服務供應者'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid #E5E7EB', display: 'grid', gap: '10px' }}>
          {staff.map((item) => {
            const selected = Number(item.id) === Number(selectedStaff?.id)
            const serviceCount = (item.services || []).length
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedStaffId(item.id)}
                className="btn-interactive"
                style={{
                  ...cardStyle,
                  padding: '14px',
                  border: selected ? '1px solid rgba(166, 139, 106, 0.45)' : '1px solid #E5E7EB',
                  background: selected ? 'rgba(166, 139, 106, 0.08)' : '#fff',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 800, color: '#111827' }}>{item.name || '未命名服務供應者'}</div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{item.role || '服務供應者'}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <Pill tone={item.enabled === false ? 'warning' : 'success'}>{item.enabled === false ? '停用' : '啟用'}</Pill>
                  <Pill tone={serviceCount ? 'success' : 'muted'}>{serviceCount} 個服務</Pill>
                </div>
              </button>
            )
          })}
        </div>

        {selectedStaff ? (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>姓名</span>
                  <input value={selectedStaff.name || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'name', event.target.value)} style={fieldStyle} />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>角色</span>
                  <input value={selectedStaff.role || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'role', event.target.value)} style={fieldStyle} />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>電話</span>
                  <input value={selectedStaff.phone || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'phone', event.target.value)} style={fieldStyle} />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>地點</span>
                  <select
                    value={selectedStaff.location_id ?? ''}
                    onChange={(event) => onUpdateField(selectedStaff.id, 'location_id', event.target.value === '' ? null : Number(event.target.value))}
                    style={fieldStyle}
                  >
                    <option value="">未指定</option>
                    {locations.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>服務供應者群組</span>
                  <select
                    value={selectedStaff.provider_group_id ?? ''}
                    onChange={(event) => onUpdateField(selectedStaff.id, 'provider_group_id', event.target.value === '' ? null : Number(event.target.value))}
                    style={fieldStyle}
                    disabled={!availableTables.providerGroups}
                  >
                    <option value="">{availableTables.providerGroups ? '未指定' : '資料表未啟用'}</option>
                    {providerGroups.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>狀態</span>
                  <button type="button" className="btn btn-secondary btn-interactive" onClick={() => onUpdateField(selectedStaff.id, 'enabled', selectedStaff.enabled === false)}>
                    {selectedStaff.enabled === false ? '目前停用，按此啟用' : '目前啟用，按此停用'}
                  </button>
                </label>
              </div>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>簡介</span>
                <textarea
                  value={selectedStaff.bio || ''}
                  onChange={(event) => onUpdateField(selectedStaff.id, 'bio', event.target.value)}
                  style={{ ...fieldStyle, minHeight: '90px', resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {services.map((service) => {
                  const checked = (selectedStaff.services || []).map(String).includes(String(service.id))
                  return (
                    <label
                      key={service.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '999px',
                        border: '1px solid #E5E7EB',
                        background: checked ? 'rgba(166, 139, 106, 0.12)' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => onToggleService(selectedStaff.id, service.id)} />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{service.name}</span>
                    </label>
                  )
                })}
              </div>
              <button type="button" className="btn btn-danger btn-interactive" onClick={() => onDeleteStaff(selectedStaff.id)} disabled={saving}>
                刪除這位服務供應者
              </button>
            </div>
            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>每週時間表</div>
                <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>設定上班時間與下班時間</div>
                <div style={{ marginTop: '6px', color: '#6B7280', fontSize: '13px', lineHeight: 1.6 }}>
                  前台只會顯示符合上班時間且可預約的時段。固定休息、休假與封鎖時段會再進一步扣減可預約時間。
                </div>
              </div>
              <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                <div style={{ minWidth: '1180px', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))', gap: '12px' }}>
                  {WEEK_DAYS.map((day) => {
                    const schedule = selectedStaff.schedule?.[day.key] || {}
                    const isOff = selectedStaffDaysOff.some((value) => String(value) === day.key)
                    const hasWorkingHours = Boolean(schedule.start && schedule.end && !isOff)
                    return (
                      <div
                        key={day.key}
                        style={{
                          ...cardStyle,
                          minHeight: '240px',
                          padding: '14px',
                          display: 'grid',
                          gap: '12px',
                          background: isOff ? '#F8FAFC' : '#fff',
                          borderColor: isOff ? '#E5E7EB' : 'rgba(166, 139, 106, 0.18)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800 }}>{day.label}</div>
                            <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 900 }}>{day.label}</div>
                          </div>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button type="button" onClick={() => onSetDailyMode(selectedStaff.id, day.key, 'work')} style={dayModeButtonStyle(!isOff)}>
                              上班
                            </button>
                            <button type="button" onClick={() => onSetDailyMode(selectedStaff.id, day.key, 'rest')} style={dayModeButtonStyle(isOff)}>
                              休息
                            </button>
                          </div>
                        </div>
                        <label style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>上班時間</span>
                          <input
                            type="time"
                            value={formatTime(schedule.start)}
                            onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'start', event.target.value)}
                            style={fieldStyle}
                            disabled={isOff}
                          />
                        </label>
                        <label style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>下班時間</span>
                          <input
                            type="time"
                            value={formatTime(schedule.end)}
                            onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'end', event.target.value)}
                            style={fieldStyle}
                            disabled={isOff}
                          />
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Pill tone={isOff ? 'muted' : hasWorkingHours ? 'success' : 'warning'}>{isOff ? bookingOpsCopy.rest : hasWorkingHours ? bookingOpsCopy.working : '未設定'}</Pill>
                          <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.5 }}>
                            {isOff ? '前台不會顯示可預約時段' : hasWorkingHours ? `${formatTime(schedule.start)} - ${formatTime(schedule.end)}` : '請先設定上班與下班時間'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <RowsEditor
              title="日期覆蓋"
              description="用來設定特定日期上班、下班或整日休息。"
              emptyDescription="當某一天需要特別調整上班或休息時，先新增一筆日期覆蓋。"
              rows={shiftRows}
              onAdd={() =>
                setShiftRows((current) => [
                  ...current,
                  { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '20:00', is_off: false },
                ])
              }
              onRemove={(id) => removeRow(setShiftRows, setShiftDeletedIds, id)}
              setRows={setShiftRows}
              renderRow={(row, update) => (
                <>
                  <input type="date" value={row.date || ''} onChange={(event) => update({ date: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.start_time || ''} onChange={(event) => update({ start_time: event.target.value })} style={smallFieldStyle} disabled={row.is_off} />
                  <input type="time" value={row.end_time || ''} onChange={(event) => update({ end_time: event.target.value })} style={smallFieldStyle} disabled={row.is_off} />
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                    <button type="button" onClick={() => update({ is_off: false })} style={dayModeButtonStyle(!row.is_off)}>
                      上班
                    </button>
                    <button type="button" onClick={() => update({ is_off: true, start_time: '', end_time: '' })} style={dayModeButtonStyle(Boolean(row.is_off))}>
                      休息
                    </button>
                  </div>
                </>
              )}
            />

            <RowsEditor
              title="固定休息時段"
              description="每週固定會扣減的休息時間。"
              emptyDescription="例如：午飯時間、茶點時間或固定輪休。"
              rows={breakRows}
              onAdd={() => setBreakRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, day_of_week: '1', start_time: '13:00', end_time: '14:00', label: '', enabled: true }])}
              onRemove={(id) => removeRow(setBreakRows, setBreakDeletedIds, id)}
              setRows={setBreakRows}
              renderRow={(row, update) => (
                <>
                  <select value={row.day_of_week ?? '1'} onChange={(event) => update({ day_of_week: event.target.value })} style={smallFieldStyle}>
                    {WEEK_DAYS.map((day) => (
                      <option key={day.key} value={day.key}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  <input type="time" value={row.start_time || ''} onChange={(event) => update({ start_time: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.end_time || ''} onChange={(event) => update({ end_time: event.target.value })} style={smallFieldStyle} />
                  <input value={row.label || ''} onChange={(event) => update({ label: event.target.value })} style={smallFieldStyle} placeholder="說明" />
                </>
              )}
            />

            <RowsEditor
              title="休假時段"
              description="用來設定特定日期的全日或部分休假。"
              emptyDescription="當某一天需要放假，或只開某一段時間時，可在這裡處理。"
              rows={timeOffRows}
              onAdd={() =>
                setTimeOffRows((current) => [
                  ...current,
                  { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '20:00', reason: '', is_all_day: false },
                ])
              }
              onRemove={(id) => removeRow(setTimeOffRows, setTimeOffDeletedIds, id)}
              setRows={setTimeOffRows}
              renderRow={(row, update) => (
                <>
                  <input type="date" value={row.date || ''} onChange={(event) => update({ date: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.start_time || ''} onChange={(event) => update({ start_time: event.target.value })} style={smallFieldStyle} disabled={row.is_all_day} />
                  <input type="time" value={row.end_time || ''} onChange={(event) => update({ end_time: event.target.value })} style={smallFieldStyle} disabled={row.is_all_day} />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(row.is_all_day)}
                      onChange={(event) =>
                        update(
                          event.target.checked
                            ? { is_all_day: true, start_time: '00:00', end_time: '23:59' }
                            : { is_all_day: false, start_time: row.start_time || '11:00', end_time: row.end_time || '20:00' }
                        )
                      }
                    />
                    全天
                  </label>
                </>
              )}
            />

            <RowsEditor
              title="封鎖時段"
              description="用來封鎖特定日期和時段，避免前台出現可預約狀態。"
              emptyDescription="例如會議、內部工作、設備保養等不能預約的時間。"
              rows={blockedRows}
              onAdd={() => setBlockedRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '12:00', reason: '', source: 'manual' }])}
              onRemove={(id) => removeRow(setBlockedRows, setBlockedDeletedIds, id)}
              setRows={setBlockedRows}
              renderRow={(row, update) => (
                <>
                  <input type="date" value={row.date || ''} onChange={(event) => update({ date: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.start_time || ''} onChange={(event) => update({ start_time: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.end_time || ''} onChange={(event) => update({ end_time: event.target.value })} style={smallFieldStyle} />
                  <input value={row.reason || ''} onChange={(event) => update({ reason: event.target.value })} style={smallFieldStyle} placeholder="原因" />
                </>
              )}
            />
            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>前台可預約對照</div>
                  <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>月曆預覽</div>
                  <div style={{ marginTop: '6px', color: '#6B7280', fontSize: '13px', lineHeight: 1.6 }}>
                    與前台共用同一份月曆摘要，直接對照「上班 / 可預約」、「上班 / 已滿」、「上班 / 規則限制」與「休息」。
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-small btn-interactive" onClick={() => setPreviewMonth((current) => addMonths(current, -1))} disabled={previewLoading}>
                    上月
                  </button>
                  <button type="button" className="btn btn-small btn-interactive" onClick={() => setPreviewMonth((current) => addMonths(current, 1))} disabled={previewLoading}>
                    下月
                  </button>
                </div>
              </div>

              <label style={{ display: 'grid', gap: '8px', maxWidth: '360px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>對照服務</span>
                <select value={previewServiceId} onChange={(event) => setPreviewServiceId(event.target.value)} style={fieldStyle}>
                  {services.length ? (
                    services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))
                  ) : (
                    <option value="">沒有可對照的服務</option>
                  )}
                </select>
              </label>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Pill tone="success">{bookingOpsCopy.calendarAvailable}</Pill>
                <Pill tone="warning">{bookingOpsCopy.calendarFull}</Pill>
                <Pill tone="muted">{bookingOpsCopy.calendarRest}</Pill>
              </div>

              <div style={{ fontSize: '18px', fontWeight: 900 }}>{monthTitle(previewMonth)}</div>
              {previewLoading ? <div style={{ color: '#6B7280' }}>{bookingOpsCopy.loadingCalendar}</div> : null}
              {previewError ? <div style={{ color: '#B91C1C' }}>{previewError}</div> : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => (
                  <div key={weekday} style={{ textAlign: 'center', fontSize: '12px', color: '#6B7280', fontWeight: 800 }}>
                    星期{weekday}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
                {previewGrid.map(({ dateISO, inMonth, dayLabel }) => {
                  const entry = previewMap.get(dateISO)
                  const status = entry?.status || 'off'
                  const previewCopy = getPreviewStatusCopy(entry)
                  const countLabel =
                    status === 'available'
                      ? `${Number(entry?.availableCount || 0)} 個可約時段`
                      : status === 'full' && Number(entry?.slotCount || 0) > 0
                        ? `${Number(entry?.slotCount || 0)} 個工作時段`
                        : ''
                  const isSelected = selectedPreviewDate === dateISO

                  return (
                    <button
                      key={dateISO}
                      type="button"
                      onClick={() => {
                        if (!inMonth) return
                        setSelectedPreviewDate(dateISO)
                      }}
                      style={{
                        ...cardStyle,
                        minHeight: '92px',
                        padding: '10px',
                        opacity: inMonth ? 1 : 0.45,
                        color: status === 'off' ? '#9CA3AF' : '#111827',
                        background: isSelected ? '#FFF8EE' : status === 'off' ? '#F8FAFC' : '#fff',
                        borderColor: isSelected ? '#A68B6A' : status === 'full' ? 'rgba(166, 139, 106, 0.45)' : '#E5E7EB',
                        textAlign: 'left',
                        cursor: inMonth ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 900 }}>{dayLabel}</div>
                      {inMonth ? (
                        <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                          <Pill tone={previewCopy.tone}>{previewCopy.label}</Pill>
                          {countLabel ? <div style={{ fontSize: '12px', fontWeight: 800, color: status === 'off' ? '#9CA3AF' : '#374151' }}>{countLabel}</div> : null}
                          <div style={{ fontSize: '12px', fontWeight: 700, color: status === 'off' ? '#9CA3AF' : '#6B7280', lineHeight: 1.4 }}>
                            {previewCopy.hint}
                          </div>
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {selectedPreviewEntry ? (
                <div
                  className="admin-card"
                  style={{
                    ...cardStyle,
                    display: 'grid',
                    gap: '14px',
                    background: '#FCFBF9',
                    borderColor: 'rgba(166, 139, 106, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>選中日期</div>
                      <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>{selectedPreviewDate}</div>
                    </div>
                    <Pill tone={getPreviewStatusCopy(selectedPreviewEntry).tone}>{getPreviewStatusCopy(selectedPreviewEntry).label}</Pill>
                  </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>月曆狀態</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedPreviewEntry.status}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>可預約總數</div>
                      <div style={{ marginTop: '4px', fontWeight: 800 }}>{Number(selectedPreviewEntry.availableCount || 0)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>工作時段總數</div>
                      <div style={{ marginTop: '4px', fontWeight: 800 }}>{Number(selectedPreviewEntry.slotCount || 0)}</div>
                    </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>判定原因</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedPreviewEntry.reason || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>每週時間表基準</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>
                          {selectedDatePlan?.baselineWindow ? `${selectedDatePlan.baselineWindow.start} - ${selectedDatePlan.baselineWindow.end}` : '未設定'}
                        </div>
                      </div>
                    </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>當日上班時間</div>
                      <div style={{ marginTop: '4px', fontWeight: 800 }}>
                        {selectedDatePlan?.workingWindow ? `${selectedDatePlan.workingWindow.start} - ${selectedDatePlan.workingWindow.end}` : '休息 / 無 working window'}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
                        {selectedDatePlan?.workingWindow?.source || '未設定'}
                      </div>
                    </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>日期覆蓋</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>
                          {selectedDatePlan?.override
                            ? selectedDatePlan.override.is_off
                            ? '整日休息'
                            : `${formatTime(selectedDatePlan.override.start_time)} - ${formatTime(selectedDatePlan.override.end_time)}`
                          : '沒有覆蓋'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>每週休息日命中</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedDatePlan?.isDayOff ? '是' : '否'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>店舖公休日命中</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedDatePlan?.businessDayOff ? '是' : '否'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>假期命中</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>
                          {selectedDatePlan?.holidayClosed ? `是 (${selectedDatePlan?.matchedHolidays?.length || 0} 筆)` : '否'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>固定休息時段</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedDatePlan?.breaks?.length || 0} 筆</div>
                      </div>
                      <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>休假 / 封鎖</div>
                      <div style={{ marginTop: '4px', fontWeight: 800 }}>
                          {(selectedDatePlan?.timeOff?.length || 0) + (selectedDatePlan?.blocked?.length || 0)} 筆
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>服務地點匹配</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>
                          {selectedDatePlan?.serviceLocationMatched ? '已匹配' : '未匹配'}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
                          服務地點：{selectedDatePlan?.selectedServiceLocationIds?.length ? selectedDatePlan.selectedServiceLocationIds.join(', ') : '不限'} / 員工地點：{selectedDatePlan?.resolvedLocationId || '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>服務群組匹配</div>
                        <div style={{ marginTop: '4px', fontWeight: 800 }}>
                          {selectedDatePlan?.serviceProviderGroupMatched ? '已匹配' : '未匹配'}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B7280' }}>
                          服務群組：{selectedDatePlan?.selectedServiceProviderGroupIds?.length ? selectedDatePlan.selectedServiceProviderGroupIds.join(', ') : '不限'} / 員工群組：{selectedDatePlan?.resolvedProviderGroupId || '-'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>單日真實時段 debug</div>
                          <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 900 }}>直接查看這一天實際 availability</div>
                        </div>
                        {selectedAvailabilityLoading ? <Pill tone="muted">載入中</Pill> : null}
                      </div>
                      {selectedAvailabilityError ? <div style={{ color: '#B91C1C', fontSize: '13px' }}>{selectedAvailabilityError}</div> : null}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>單日判定原因</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedAvailabilityDebug?.dateSummaryReason || '-'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>實際可預約時段</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedAvailabilityDebug?.slots?.length || 0}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>候選時段總數</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{Number(selectedAvailabilityDebug?.debug?.candidateCount || 0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>有班可工作時段</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{Number(selectedAvailabilityDebug?.debug?.workingSlotCount || 0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>基礎阻擋次數</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{Number(selectedAvailabilityDebug?.debug?.baseBlockedCount || 0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>資源阻擋次數</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{Number(selectedAvailabilityDebug?.debug?.resourceBlockedCount || 0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>假期命中</div>
                          <div style={{ marginTop: '4px', fontWeight: 800 }}>{selectedAvailabilityDebug?.debug?.holidayBlocked ? '是' : '否'}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>可預約時段名單</div>
                        <div style={{ marginTop: '6px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                          {selectedAvailabilityDebug?.slots?.length ? selectedAvailabilityDebug.slots.join(', ') : '沒有可預約時段'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>基礎阻擋時段</div>
                          <div style={{ marginTop: '6px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                            {selectedAvailabilityDebug?.debug?.baseBlockedTimes?.length ? selectedAvailabilityDebug.debug.baseBlockedTimes.join(', ') : '沒有'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>資源阻擋時段</div>
                          <div style={{ marginTop: '6px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                            {selectedAvailabilityDebug?.debug?.resourceBlockedTimes?.length ? selectedAvailabilityDebug.debug.resourceBlockedTimes.join(', ') : '沒有'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'
import { bookingOpsCopy, fieldStyle, parseDate, parseTime, smallFieldStyle } from './opsUi'

const DAYS = [
  { key: '0', label: '星期日', short: '日' },
  { key: '1', label: '星期一', short: '一' },
  { key: '2', label: '星期二', short: '二' },
  { key: '3', label: '星期三', short: '三' },
  { key: '4', label: '星期四', short: '四' },
  { key: '5', label: '星期五', short: '五' },
  { key: '6', label: '星期六', short: '六' },
]

const MAX_INT = 2147483647
const ROW_GRID = 'minmax(120px, 1.2fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(160px, 1.4fr) auto'
let tempSeed = -1

const tempId = () => tempSeed--
const isPersisted = (id) => Number.isInteger(Number(id)) && Number(id) > 0 && Number(id) <= MAX_INT
const ensureTime = (value, fallback = '') => parseTime(value || fallback)
const ensureDate = (value) => parseDate(value)

const panelStyle = {
  border: '1px solid rgba(166, 139, 106, 0.16)',
  borderRadius: '16px',
  padding: '16px',
  background: '#fff',
}

const labelFor = (rows = [], id) => {
  const found = rows.find((item) => String(item?.id) === String(id))
  return found?.name || found?.title || found?.label || found?.code || (id ? `#${id}` : '')
}

const normalizeScheduleRow = (row, staffId) => ({
  id: row?.id ?? tempId(),
  staff_id: row?.staff_id ?? staffId,
  date: ensureDate(row?.date),
  is_off: Boolean(row?.is_off),
  start_time: ensureTime(row?.start_time),
  end_time: ensureTime(row?.end_time),
})

const normalizeBreakRow = (row, staffId) => ({
  id: row?.id ?? tempId(),
  staff_id: row?.staff_id ?? staffId,
  day_of_week: row?.day_of_week == null || row?.day_of_week === '' ? 1 : Number(row.day_of_week),
  start_time: ensureTime(row?.start_time, '13:00'),
  end_time: ensureTime(row?.end_time, '14:00'),
  label: String(row?.label || '休息'),
  enabled: row?.enabled !== false,
})

const normalizeTimeOffRow = (row, staffId) => ({
  id: row?.id ?? tempId(),
  staff_id: row?.staff_id ?? staffId,
  date: ensureDate(row?.date),
  is_all_day: Boolean(row?.is_all_day),
  start_time: ensureTime(row?.start_time),
  end_time: ensureTime(row?.end_time),
  reason: String(row?.reason || ''),
})

const normalizeBlockedRow = (row, staffId) => ({
  id: row?.id ?? tempId(),
  staff_id: row?.staff_id ?? staffId,
  date: ensureDate(row?.date),
  start_time: ensureTime(row?.start_time),
  end_time: ensureTime(row?.end_time),
  reason: String(row?.reason || ''),
  source: String(row?.source || 'manual'),
})

const buildPreviewWindow = (startIso, days = 14) => {
  const base = new Date(`${startIso}T00:00:00`)
  return Array.from({ length: days }, (_, index) => {
    const next = new Date(base)
    next.setDate(base.getDate() + index)
    const weekday = DAYS[next.getDay()]
    return {
      dateISO: next.toISOString().slice(0, 10),
      label: `${next.getMonth() + 1}月${next.getDate()}日週${weekday.short}`,
    }
  })
}

function DayCard({ day, schedule, isOff, onToggleOff, onChange }) {
  return (
    <div style={{ ...panelStyle, background: isOff ? '#F3F4F6' : '#fff', borderColor: isOff ? '#D1D5DB' : 'rgba(166, 139, 106, 0.18)', display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>{day.label}</div>
          <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 800, color: isOff ? '#6B7280' : '#111827' }}>{isOff ? bookingOpsCopy.rest : bookingOpsCopy.working}</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>
          <input type="checkbox" checked={isOff} onChange={onToggleOff} />
          休息
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
        <label style={{ display: 'grid', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>上班時間</span>
          <input type="time" value={schedule?.start || ''} onChange={(event) => onChange('start', event.target.value)} style={{ ...smallFieldStyle, background: isOff ? '#F9FAFB' : '#fff' }} disabled={isOff} />
        </label>
        <label style={{ display: 'grid', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>下班時間</span>
          <input type="time" value={schedule?.end || ''} onChange={(event) => onChange('end', event.target.value)} style={{ ...smallFieldStyle, background: isOff ? '#F9FAFB' : '#fff' }} disabled={isOff} />
        </label>
      </div>
    </div>
  )
}

function DateStatusCard({ label, status, selected, onClick, disabled }) {
  const palette =
    status === 'off'
      ? { border: '#E5E7EB', background: '#F9FAFB', color: '#9CA3AF', hint: '休息日' }
      : status === 'full'
        ? { border: '#D1D5DB', background: '#fff', color: '#111827', hint: '已滿' }
        : { border: '#111827', background: '#fff', color: '#111827', hint: '可預約' }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '12px 10px',
        borderRadius: '14px',
        border: selected ? '1px solid rgba(166, 139, 106, 0.55)' : `1px solid ${palette.border}`,
        background: selected ? 'rgba(166, 139, 106, 0.14)' : palette.background,
        color: palette.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'grid',
        gap: '6px',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 800 }}>{label}</span>
      <span style={{ fontSize: '11px', color: status === 'off' ? '#9CA3AF' : '#6B7280' }}>{selected ? bookingOpsCopy.selected : palette.hint}</span>
    </button>
  )
}

export default function StaffTab(props) {
  const {
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
    onToggleDailyOff,
    onUpdateSchedule,
    onSave,
    onSaveShifts,
    onSaveBreaks,
    onSaveTimeOff,
    onSaveBlockedSlots,
    saving = false,
  } = props

  const locations = operationalContext?.locations || []
  const providerGroups = operationalContext?.providerGroups || []
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [shiftRows, setShiftRows] = useState([])
  const [deletedShiftIds, setDeletedShiftIds] = useState([])
  const [breakRows, setBreakRows] = useState([])
  const [deletedBreakIds, setDeletedBreakIds] = useState([])
  const [timeOffRows, setTimeOffRows] = useState([])
  const [deletedTimeOffIds, setDeletedTimeOffIds] = useState([])
  const [blockedRows, setBlockedRows] = useState([])
  const [deletedBlockedIds, setDeletedBlockedIds] = useState([])
  const [previewDate, setPreviewDate] = useState(new Date().toISOString().slice(0, 10))
  const [previewServiceId, setPreviewServiceId] = useState('')
  const [previewSummary, setPreviewSummary] = useState([])
  const [previewSlots, setPreviewSlots] = useState([])
  const [loadingPreviewDates, setLoadingPreviewDates] = useState(false)
  const [loadingPreviewSlots, setLoadingPreviewSlots] = useState(false)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => {
    if (!staff.length) {
      setSelectedStaffId(null)
      return
    }
    if (!staff.some((item) => String(item.id) === String(selectedStaffId))) {
      setSelectedStaffId(staff[0].id)
    }
  }, [selectedStaffId, staff])

  const selectedStaff = useMemo(() => staff.find((item) => String(item.id) === String(selectedStaffId)) || null, [selectedStaffId, staff])

  useEffect(() => {
    if (!selectedStaff) {
      setShiftRows([])
      setDeletedShiftIds([])
      setBreakRows([])
      setDeletedBreakIds([])
      setTimeOffRows([])
      setDeletedTimeOffIds([])
      setBlockedRows([])
      setDeletedBlockedIds([])
      return
    }
    setShiftRows((staffShifts || []).filter((row) => String(row.staff_id) === String(selectedStaff.id)).map((row) => normalizeScheduleRow(row, selectedStaff.id)))
    setDeletedShiftIds([])
    setBreakRows((staffBreaks || []).filter((row) => String(row.staff_id) === String(selectedStaff.id)).map((row) => normalizeBreakRow(row, selectedStaff.id)))
    setDeletedBreakIds([])
    setTimeOffRows((staffTimeOff || []).filter((row) => String(row.staff_id) === String(selectedStaff.id)).map((row) => normalizeTimeOffRow(row, selectedStaff.id)))
    setDeletedTimeOffIds([])
    setBlockedRows((blockedSlots || []).filter((row) => String(row.staff_id) === String(selectedStaff.id)).map((row) => normalizeBlockedRow(row, selectedStaff.id)))
    setDeletedBlockedIds([])
  }, [blockedSlots, selectedStaff, staffBreaks, staffShifts, staffTimeOff])

  useEffect(() => {
    if (!selectedStaff) {
      setPreviewServiceId('')
      return
    }
    const preferred = selectedStaff.services?.[0] || services[0]?.id || ''
    setPreviewServiceId((current) => {
      if (current && services.some((service) => String(service.id) === String(current))) return current
      return preferred ? String(preferred) : ''
    })
  }, [selectedStaff, services])

  const previewWindow = useMemo(() => buildPreviewWindow(previewDate || new Date().toISOString().slice(0, 10)), [previewDate])
  const previewSummaryMap = useMemo(() => new Map(previewSummary.map((entry) => [entry.date, entry])), [previewSummary])
  const currentPreviewSummary = previewSummaryMap.get(previewDate) || null
  const servicesForStaff = useMemo(() => services.filter((service) => !selectedStaff?.services?.length || selectedStaff.services.includes(service.id)), [selectedStaff?.services, services])
  const previewAvailableTimes = useMemo(() => [...new Set(previewSlots.filter((slot) => slot?.available).map((slot) => slot.time).filter(Boolean))], [previewSlots])

  useEffect(() => {
    if (!selectedStaff || !previewServiceId || !previewWindow.length) {
      setPreviewSummary([])
      return
    }
    const params = new URLSearchParams({
      staffId: String(selectedStaff.id),
      serviceId: String(previewServiceId),
      startDate: previewWindow[0].dateISO,
      days: String(previewWindow.length),
    })
    setLoadingPreviewDates(true)
    setPreviewError('')
    fetch(`/api/availability/date-summary?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '載入可預約日期失敗')
        setPreviewSummary(Array.isArray(payload?.dates) ? payload.dates : [])
      })
      .catch((error) => {
        setPreviewSummary([])
        setPreviewError(error?.message || '載入可預約日期失敗')
      })
      .finally(() => setLoadingPreviewDates(false))
  }, [previewServiceId, previewWindow, selectedStaff])

  useEffect(() => {
    if (!selectedStaff || !previewServiceId || !previewDate) {
      setPreviewSlots([])
      return
    }
    if (currentPreviewSummary?.status === 'off' || currentPreviewSummary?.status === 'full') {
      setPreviewSlots([])
      return
    }
    const params = new URLSearchParams({
      staffId: String(selectedStaff.id),
      serviceId: String(previewServiceId),
      date: previewDate,
    })
    setLoadingPreviewSlots(true)
    fetch(`/api/availability?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '載入可預約時段失敗')
        setPreviewSlots(Array.isArray(payload?.slotMatrix) ? payload.slotMatrix : [])
      })
      .catch((error) => {
        setPreviewSlots([])
        setPreviewError(error?.message || '載入可預約時段失敗')
      })
      .finally(() => setLoadingPreviewSlots(false))
  }, [currentPreviewSummary?.status, previewDate, previewServiceId, selectedStaff])

  const updateListRow = (setter, id, patch) => setter((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  const removeRow = (setter, deletedSetter, id) => {
    setter((current) => current.filter((row) => row.id !== id))
    if (isPersisted(id)) deletedSetter((current) => (current.includes(Number(id)) ? current : [...current, Number(id)]))
  }

  const saveAll = async () => {
    if (!selectedStaff) return
    try {
      await onSave?.(selectedStaff.id, { silentSuccess: true })
      await onSaveShifts?.({ rows: shiftRows, deletedIds: deletedShiftIds }, { silentSuccess: true })
      await onSaveBreaks?.({ rows: breakRows, deletedIds: deletedBreakIds }, { silentSuccess: true })
      await onSaveTimeOff?.({ rows: timeOffRows, deletedIds: deletedTimeOffIds }, { silentSuccess: true })
      await onSaveBlockedSlots?.({ rows: blockedRows, deletedIds: deletedBlockedIds }, { silentSuccess: true })
      toast.success('已儲存目前服務供應者')
    } catch (error) {
      toast.error(error?.message || '儲存失敗')
    }
  }

  if (!staff.length) {
    return (
      <AdminSection
        eyebrow="服務供應者"
        title="服務供應者設定"
        description="先新增一位服務供應者，再設定每週上班時間、休假與封鎖時段。"
        actions={
          <button type="button" onClick={onAddStaff} className="btn btn-small btn-interactive">
            + 新增服務供應者
          </button>
        }
      >
        <EmptyState title="尚未建立服務供應者" description="新增後即可設定每週上班時間、休假與封鎖時段。" />
      </AdminSection>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <AdminSection
        eyebrow="排班中心"
        title="服務供應者與前台預約對照"
        description="先設定每週上班與下班時間，再補日期覆蓋、固定休息、休假與封鎖時段。"
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={onAddStaff} className="btn btn-small btn-interactive">
              + 新增服務供應者
            </button>
            <button type="button" onClick={saveAll} className="btn btn-small btn-interactive" disabled={saving || !selectedStaff}>
              {saving ? '儲存中...' : '儲存目前服務供應者'}
            </button>
            {selectedStaff ? (
              <button type="button" onClick={() => onDeleteStaff?.(selectedStaff.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                刪除目前服務供應者
              </button>
            ) : null}
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)', display: 'grid', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>服務供應者名單</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {staff.map((member) => {
                  const selected = String(member.id) === String(selectedStaffId)
                  return (
                    <button key={member.id} type="button" onClick={() => setSelectedStaffId(member.id)} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '14px', border: selected ? '1px solid rgba(166, 139, 106, 0.35)' : '1px solid #E5E7EB', background: selected ? '#FBF6EF' : '#fff', display: 'grid', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>{member.name || '未命名服務供應者'}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{member.role || '服務供應者'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedStaff ? (
              <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)', display: 'grid', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>資料摘要</div>
                <StatusPill tone="accent">服務 {selectedStaff.services?.length || 0} 項</StatusPill>
                <StatusPill tone="neutral">地點：{selectedStaff.location_id ? labelFor(locations, selectedStaff.location_id) : '未指定'}</StatusPill>
                <StatusPill tone="neutral">群組：{selectedStaff.provider_group_id ? labelFor(providerGroups, selectedStaff.provider_group_id) : '未指定'}</StatusPill>
                <StatusPill tone="warning">固定休息 {breakRows.length} 段</StatusPill>
                <StatusPill tone="warning">休假 {timeOffRows.length} 段</StatusPill>
                <StatusPill tone="warning">封鎖 {blockedRows.length} 段</StatusPill>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
            <AdminSection eyebrow="基本資料" title="服務供應者資料" description="這裡的地點、群組與服務範圍會直接影響前台可預約結果。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>名稱</span>
                      <input value={selectedStaff.name || ''} onChange={(event) => onUpdateField?.(selectedStaff.id, 'name', event.target.value)} style={fieldStyle} />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>職位</span>
                      <input value={selectedStaff.role || ''} onChange={(event) => onUpdateField?.(selectedStaff.id, 'role', event.target.value)} style={fieldStyle} />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>電話</span>
                      <input value={selectedStaff.phone || ''} onChange={(event) => onUpdateField?.(selectedStaff.id, 'phone', event.target.value)} style={fieldStyle} />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>地點</span>
                      <select value={selectedStaff.location_id ?? ''} onChange={(event) => onUpdateField?.(selectedStaff.id, 'location_id', event.target.value === '' ? null : Number(event.target.value))} style={fieldStyle}>
                        <option value="">未指定地點</option>
                        {locations.map((location) => <option key={location.id} value={location.id}>{labelFor(locations, location.id)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>服務供應者群組</span>
                      <select value={selectedStaff.provider_group_id ?? ''} onChange={(event) => onUpdateField?.(selectedStaff.id, 'provider_group_id', event.target.value === '' ? null : Number(event.target.value))} style={fieldStyle}>
                        <option value="">未指定群組</option>
                        {providerGroups.map((group) => <option key={group.id} value={group.id}>{labelFor(providerGroups, group.id)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                      <input type="checkbox" checked={selectedStaff.enabled !== false} onChange={(event) => onUpdateField?.(selectedStaff.id, 'enabled', event.target.checked)} />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>啟用此服務供應者</span>
                    </label>
                  </div>

                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>簡介</span>
                    <textarea value={selectedStaff.bio || ''} onChange={(event) => onUpdateField?.(selectedStaff.id, 'bio', event.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                  </label>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>可提供服務</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {services.map((service) => {
                        const checked = selectedStaff.services?.includes(service.id)
                        return (
                          <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '999px', border: '1px solid #E5E7EB', background: checked ? '#FBF6EF' : '#fff' }}>
                            <input type="checkbox" checked={checked} onChange={() => onToggleService?.(selectedStaff.id, service.id)} />
                            <span style={{ fontSize: '13px' }}>{service.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先從左側選擇一位服務供應者。" />}
            </AdminSection>

            <AdminSection eyebrow="每週時間表" title="每週上班時間" description="這裡直接設定每天的上班與下班時間。休息日會在前台顯示為灰色，不可預約。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                  {DAYS.map((day) => {
                    const schedule = selectedStaff.schedule?.[day.key] || {}
                    const isOff = (selectedStaff.daysOff || []).includes(day.key)
                    return <DayCard key={day.key} day={day} schedule={schedule} isOff={isOff} onToggleOff={() => onToggleDailyOff?.(selectedStaff.id, day.key)} onChange={(field, value) => onUpdateSchedule?.(selectedStaff.id, day.key, field, value)} />
                  })}
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先選擇一位服務供應者後，再設定每週時間表。" />}
            </AdminSection>

            <AdminSection eyebrow="日期覆蓋" title="指定日期班次" description="臨時上班、臨時休息或特別營業時間，可在這裡設定。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShiftRows((current) => [...current, normalizeScheduleRow({ date: previewDate, start_time: '11:00', end_time: '20:00' }, selectedStaff.id)])} className="btn btn-small btn-interactive">+ 新增日期覆蓋</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>
                    <div>日期</div><div>上班時間</div><div>下班時間</div><div>狀態</div><div></div>
                  </div>
                  {shiftRows.length ? shiftRows.map((row) => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', alignItems: 'center' }}>
                      <input type="date" value={row.date || ''} onChange={(event) => updateListRow(setShiftRows, row.id, { date: event.target.value })} style={fieldStyle} />
                      <input type="time" value={row.start_time || ''} onChange={(event) => updateListRow(setShiftRows, row.id, { start_time: event.target.value })} style={{ ...fieldStyle, background: row.is_off ? '#F9FAFB' : '#fff' }} disabled={row.is_off} />
                      <input type="time" value={row.end_time || ''} onChange={(event) => updateListRow(setShiftRows, row.id, { end_time: event.target.value })} style={{ ...fieldStyle, background: row.is_off ? '#F9FAFB' : '#fff' }} disabled={row.is_off} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}><input type="checkbox" checked={row.is_off} onChange={(event) => updateListRow(setShiftRows, row.id, { is_off: event.target.checked })} />{row.is_off ? '當天休息' : '當天上班'}</label>
                      <button type="button" onClick={() => removeRow(setShiftRows, setDeletedShiftIds, row.id)} className="btn btn-small btn-interactive">刪除</button>
                    </div>
                  )) : <EmptyState title="尚未設定日期覆蓋" description="如某天需要臨時改班、休息或加班，可在這裡新增。" />}
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先選擇一位服務供應者後，再設定日期覆蓋。" />}
            </AdminSection>

            <AdminSection eyebrow="固定休息" title="固定休息時段" description="固定休息會從可預約時段內扣減，例如午飯、開會或固定短休。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setBreakRows((current) => [...current, normalizeBreakRow({}, selectedStaff.id)])} className="btn btn-small btn-interactive">+ 新增固定休息</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>
                    <div>星期</div><div>開始</div><div>結束</div><div>標籤</div><div></div>
                  </div>
                  {breakRows.length ? breakRows.map((row) => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', alignItems: 'center' }}>
                      <select value={row.day_of_week} onChange={(event) => updateListRow(setBreakRows, row.id, { day_of_week: Number(event.target.value) })} style={fieldStyle}>
                        {DAYS.map((day) => <option key={day.key} value={day.key}>{day.label}</option>)}
                      </select>
                      <input type="time" value={row.start_time || ''} onChange={(event) => updateListRow(setBreakRows, row.id, { start_time: event.target.value })} style={fieldStyle} />
                      <input type="time" value={row.end_time || ''} onChange={(event) => updateListRow(setBreakRows, row.id, { end_time: event.target.value })} style={fieldStyle} />
                      <input value={row.label || ''} onChange={(event) => updateListRow(setBreakRows, row.id, { label: event.target.value })} style={fieldStyle} placeholder="例如：午飯" />
                      <button type="button" onClick={() => removeRow(setBreakRows, setDeletedBreakIds, row.id)} className="btn btn-small btn-interactive">刪除</button>
                    </div>
                  )) : <EmptyState title="尚未設定固定休息" description="例如午飯或固定短休，都可以在這裡設定。" />}
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先選擇一位服務供應者後，再設定固定休息。" />}
            </AdminSection>

            <AdminSection eyebrow="休假" title="休假時段" description="休假會直接封鎖該服務供應者的可預約時段。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setTimeOffRows((current) => [...current, normalizeTimeOffRow({ date: previewDate }, selectedStaff.id)])} className="btn btn-small btn-interactive">+ 新增休假</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>
                    <div>日期</div><div>開始</div><div>結束</div><div>原因</div><div></div>
                  </div>
                  {timeOffRows.length ? timeOffRows.map((row) => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', alignItems: 'center' }}>
                      <input type="date" value={row.date || ''} onChange={(event) => updateListRow(setTimeOffRows, row.id, { date: event.target.value })} style={fieldStyle} />
                      <input type="time" value={row.start_time || ''} onChange={(event) => updateListRow(setTimeOffRows, row.id, { start_time: event.target.value })} style={{ ...fieldStyle, background: row.is_all_day ? '#F9FAFB' : '#fff' }} disabled={row.is_all_day} />
                      <input type="time" value={row.end_time || ''} onChange={(event) => updateListRow(setTimeOffRows, row.id, { end_time: event.target.value })} style={{ ...fieldStyle, background: row.is_all_day ? '#F9FAFB' : '#fff' }} disabled={row.is_all_day} />
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <input value={row.reason || ''} onChange={(event) => updateListRow(setTimeOffRows, row.id, { reason: event.target.value })} style={fieldStyle} placeholder="例如：病假" />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}><input type="checkbox" checked={row.is_all_day} onChange={(event) => updateListRow(setTimeOffRows, row.id, { is_all_day: event.target.checked })} />全日休假</label>
                      </div>
                      <button type="button" onClick={() => removeRow(setTimeOffRows, setDeletedTimeOffIds, row.id)} className="btn btn-small btn-interactive">刪除</button>
                    </div>
                  )) : <EmptyState title="尚未設定休假" description="如有病假、外出或特別休假，可在這裡設定。" />}
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先選擇一位服務供應者後，再設定休假。" />}
            </AdminSection>

            <AdminSection eyebrow="封鎖時段" title="封鎖時段" description="封鎖時段可處理臨時不可接單時段，會進一步扣減可預約時段。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setBlockedRows((current) => [...current, normalizeBlockedRow({ date: previewDate, start_time: '11:00', end_time: '12:00' }, selectedStaff.id)])} className="btn btn-small btn-interactive">+ 新增封鎖時段</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>
                    <div>日期</div><div>開始</div><div>結束</div><div>原因</div><div></div>
                  </div>
                  {blockedRows.length ? blockedRows.map((row) => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: '10px', alignItems: 'center' }}>
                      <input type="date" value={row.date || ''} onChange={(event) => updateListRow(setBlockedRows, row.id, { date: event.target.value })} style={fieldStyle} />
                      <input type="time" value={row.start_time || ''} onChange={(event) => updateListRow(setBlockedRows, row.id, { start_time: event.target.value })} style={fieldStyle} />
                      <input type="time" value={row.end_time || ''} onChange={(event) => updateListRow(setBlockedRows, row.id, { end_time: event.target.value })} style={fieldStyle} />
                      <input value={row.reason || ''} onChange={(event) => updateListRow(setBlockedRows, row.id, { reason: event.target.value })} style={fieldStyle} placeholder="例如：培訓、外出" />
                      <button type="button" onClick={() => removeRow(setBlockedRows, setDeletedBlockedIds, row.id)} className="btn btn-small btn-interactive">刪除</button>
                    </div>
                  )) : <EmptyState title="尚未設定封鎖時段" description="如果有臨時培訓、外出或內部安排，可在這裡封鎖時段。" />}
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先選擇一位服務供應者後，再設定封鎖時段。" />}
            </AdminSection>

            <AdminSection eyebrow="即時預約預覽" title="前台可預約對照" description="黑字代表有班，灰字代表休息；如有班但被佔滿，會顯示已滿。">
              {selectedStaff ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>預覽服務</span>
                      <select value={previewServiceId} onChange={(event) => setPreviewServiceId(event.target.value)} style={fieldStyle}>
                        {servicesForStaff.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B7280' }}>起始日期</span>
                      <input type="date" value={previewDate} onChange={(event) => setPreviewDate(event.target.value)} style={fieldStyle} />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <StatusPill tone="success">{bookingOpsCopy.available}</StatusPill>
                    <StatusPill tone="neutral">{bookingOpsCopy.rest}</StatusPill>
                    <StatusPill tone="warning">{bookingOpsCopy.full}</StatusPill>
                    <StatusPill tone="accent">{bookingOpsCopy.selected}</StatusPill>
                  </div>

                  {loadingPreviewDates ? <div style={{ fontSize: '13px', color: '#6B7280' }}>載入可預約日期中...</div> : null}
                  {previewError ? <div style={{ fontSize: '13px', color: '#B91C1C' }}>{previewError}</div> : null}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                    {previewWindow.map((entry) => {
                      const status = previewSummaryMap.get(entry.dateISO)?.status || 'off'
                      return <DateStatusCard key={entry.dateISO} label={entry.label} status={status} selected={entry.dateISO === previewDate} disabled={status === 'off'} onClick={() => setPreviewDate(entry.dateISO)} />
                    })}
                  </div>

                  <div style={{ ...panelStyle, background: '#FAF8F5' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>預覽結果</div>
                    <div style={{ marginTop: '8px', display: 'grid', gap: '10px' }}>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {currentPreviewSummary?.status === 'off' ? '這一天是休息日，前台會顯示灰色。' : currentPreviewSummary?.status === 'full' ? '這一天有班，但可預約時段已滿。' : '這一天有班，前台會顯示黑字並可載入時段。'}
                      </div>
                      {loadingPreviewSlots ? <div style={{ fontSize: '13px', color: '#6B7280' }}>載入可預約時段中...</div> : null}
                      {!loadingPreviewSlots && currentPreviewSummary?.status === 'available' && previewAvailableTimes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {previewAvailableTimes.map((time) => <StatusPill key={time} tone="success">{time}</StatusPill>)}
                        </div>
                      ) : null}
                      {!loadingPreviewSlots && currentPreviewSummary?.status === 'available' && previewAvailableTimes.length === 0 ? <div style={{ fontSize: '13px', color: '#B45309' }}>有班，但今天已滿。</div> : null}
                    </div>
                  </div>
                </div>
              ) : <EmptyState title="尚未選擇服務供應者" description="請先選擇一位服務供應者後，再查看即時預約預覽。" />}
            </AdminSection>
          </div>
        </div>
      </AdminSection>
    </div>
  )
}

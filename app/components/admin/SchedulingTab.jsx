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

const cardStyle = { border: '1px solid #E5E7EB', borderRadius: '18px', padding: '16px', background: '#fff' }

function RowsEditor({ title, description, rows, onAdd, onRemove, renderRow, setRows }) {
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
        <EmptyState title={`尚未設定${title}`} description="新增一筆資料後，前台可預約時段會按照這些設定扣減或覆蓋。" />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {rows.map((row) => (
            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) 88px', gap: '10px', alignItems: 'center' }}>
              {renderRow(row, (patch) => setRows((current) => current.map((item) => (item.id === row.id ? { ...item, ...patch } : item))))}
              <button type="button" className="btn btn-small btn-interactive" onClick={() => onRemove(row.id)} style={{ background: '#FEF2F2', color: '#B91C1C' }}>
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
  onToggleDailyOff,
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
  const availableTables = operationalContext?.availableTables || {}
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id ?? null)
  const [previewMonth, setPreviewMonth] = useState(monthKeyFromDate(todayISO()))
  const [previewServiceId, setPreviewServiceId] = useState('')
  const [previewDates, setPreviewDates] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const previewControllerRef = useRef(null)
  const [shiftRows, setShiftRows] = useState([])
  const [shiftDeletedIds, setShiftDeletedIds] = useState([])
  const [breakRows, setBreakRows] = useState([])
  const [breakDeletedIds, setBreakDeletedIds] = useState([])
  const [timeOffRows, setTimeOffRows] = useState([])
  const [timeOffDeletedIds, setTimeOffDeletedIds] = useState([])
  const [blockedRows, setBlockedRows] = useState([])
  const [blockedDeletedIds, setBlockedDeletedIds] = useState([])

  const selectedStaff = useMemo(() => staff.find((item) => Number(item.id) === Number(selectedStaffId)) || staff[0] || null, [selectedStaffId, staff])
  const previewMap = useMemo(() => new Map(previewDates.map((entry) => [entry.date, entry])), [previewDates])
  const previewGrid = useMemo(() => buildMonthGrid(previewMonth), [previewMonth])

  useEffect(() => {
    if (!selectedStaff && staff[0]) setSelectedStaffId(staff[0].id)
  }, [selectedStaff, staff])

  useEffect(() => {
    if (!selectedStaff) return
    setShiftRows(
      (staffShifts || [])
        .filter((row) => Number(row.staff_id) === Number(selectedStaff.id))
        .map((row) => ({
          ...row,
          date: String(row.date || '').slice(0, 10),
          start_time: String(row.start_time || '').slice(0, 5),
          end_time: String(row.end_time || '').slice(0, 5),
        })),
    )
    setShiftDeletedIds([])
    setBreakRows(
      (staffBreaks || [])
        .filter((row) => Number(row.staff_id) === Number(selectedStaff.id))
        .map((row) => ({
          ...row,
          day_of_week: String(row.day_of_week ?? '1'),
          start_time: String(row.start_time || '').slice(0, 5),
          end_time: String(row.end_time || '').slice(0, 5),
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
          start_time: String(row.start_time || '').slice(0, 5),
          end_time: String(row.end_time || '').slice(0, 5),
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
          start_time: String(row.start_time || '').slice(0, 5),
          end_time: String(row.end_time || '').slice(0, 5),
          reason: row.reason || '',
          source: row.source || 'manual',
        })),
    )
    setBlockedDeletedIds([])
  }, [blockedSlots, selectedStaff, staffBreaks, staffShifts, staffTimeOff])

  useEffect(() => {
    const nextService =
      selectedStaff?.services?.[0] != null
        ? String(selectedStaff.services[0])
        : services[0]?.id != null
          ? String(services[0].id)
          : ''
    setPreviewServiceId((current) => current || nextService)
  }, [selectedStaff, services])

  useEffect(() => {
    if (!selectedStaff?.id || !previewServiceId || !previewMonth) {
      setPreviewDates([])
      return
    }
    previewControllerRef.current?.abort?.()
    const controller = new AbortController()
    previewControllerRef.current = controller
    setPreviewLoading(true)
    setPreviewError('')
    const params = new URLSearchParams({
      staffId: String(selectedStaff.id),
      serviceId: String(previewServiceId),
      year: previewMonth.slice(0, 4),
      month: previewMonth.slice(5, 7),
    })
    if (selectedStaff.location_id != null && selectedStaff.location_id !== '') params.set('locationId', String(selectedStaff.location_id))
    fetch(`/api/availability/month-summary?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || '無法載入前台月曆預覽')
        return payload
      })
      .then((payload) => setPreviewDates(Array.isArray(payload?.dates) ? payload.dates : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setPreviewDates([])
          setPreviewError(error?.message || '無法載入前台月曆預覽')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false)
      })
    return () => controller.abort()
  }, [previewMonth, previewServiceId, selectedStaff])

  const removeRow = (setRows, setDeletedIds, id) => {
    setRows((current) => current.filter((row) => row.id !== id))
    if (Number(id) > 0) setDeletedIds((current) => [...current, Number(id)])
  }

  const saveAll = async () => {
    if (!selectedStaff?.id) return
    await onSave(selectedStaff.id, { silentSuccess: true })
    await onSaveShifts({ rows: shiftRows, deletedIds: shiftDeletedIds }, { silentSuccess: true })
    await onSaveBreaks({ rows: breakRows, deletedIds: breakDeletedIds }, { silentSuccess: true })
    await onSaveTimeOff({ rows: timeOffRows, deletedIds: timeOffDeletedIds }, { silentSuccess: true })
    await onSaveBlockedSlots({ rows: blockedRows, deletedIds: blockedDeletedIds }, { silentSuccess: true })
    toast.success('已儲存目前服務供應者')
  }

  if (!staff.length) {
    return (
      <div style={{ display: 'grid', gap: '18px' }}>
        <SectionHeader
          eyebrow="服務供應者"
          title="排班設定"
          description="先建立服務供應者，再設定每週上班時間、休息時段與前台可預約對照。"
        />
        <EmptyState
          title="尚未建立服務供應者"
          description="新增一位服務供應者後，就可以設定每日上班、下班與前台月曆顯示。"
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
        description="設定每週上班時間、日期覆蓋、固定休息、休假與封鎖時段。前台月曆會直接跟住這裡的設定顯示。"
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-interactive" onClick={onAddStaff} disabled={saving}>
              新增服務供應者
            </button>
            <button type="button" className="btn btn-interactive" onClick={saveAll} disabled={saving || !selectedStaff}>
              {saving ? '儲存中...' : '儲存目前服務供應者'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid #E5E7EB', display: 'grid', gap: '10px' }}>
          {staff.map((item) => {
            const selected = Number(item.id) === Number(selectedStaff?.id)
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
                  <Pill>{(item.services || []).length} 個服務</Pill>
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
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>名稱</span>
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
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>預設地點</span>
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
                <textarea value={selectedStaff.bio || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'bio', event.target.value)} style={{ ...fieldStyle, minHeight: '90px', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {services.map((service) => {
                  const checked = (selectedStaff.services || []).includes(service.id)
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
                刪除此服務供應者
              </button>
            </div>

            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>每週時間表</div>
                <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>設定上班時間與下班時間</div>
                <div style={{ marginTop: '6px', color: '#6B7280', fontSize: '13px', lineHeight: 1.6 }}>
                  前台只會顯示符合上班時間且可預約的時段。固定休息、休假與封鎖時段會再進一步扣減可預約時段。
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {WEEK_DAYS.map((day) => {
                  const schedule = selectedStaff.schedule?.[day.key] || {}
                  const isOff = (selectedStaff.daysOff || []).includes(day.key)
                  return (
                    <div key={day.key} style={{ ...cardStyle, padding: '14px', background: isOff ? '#F8FAFC' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>{day.label}</div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                          <input type="checkbox" checked={isOff} onChange={() => onToggleDailyOff(selectedStaff.id, day.key)} />
                          休息
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>上班時間</span>
                          <input type="time" value={String(schedule.start || '').slice(0, 5)} onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'start', event.target.value)} style={fieldStyle} disabled={isOff} />
                        </label>
                        <label style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>下班時間</span>
                          <input type="time" value={String(schedule.end || '').slice(0, 5)} onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'end', event.target.value)} style={fieldStyle} disabled={isOff} />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <RowsEditor
              title="日期覆蓋"
              description="設定某日上班、下班或某日休息。"
              rows={shiftRows}
              onAdd={() => setShiftRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '20:00', is_off: false }])}
              onRemove={(id) => removeRow(setShiftRows, setShiftDeletedIds, id)}
              setRows={setShiftRows}
              renderRow={(row, update) => (
                <>
                  <input type="date" value={row.date || ''} onChange={(event) => update({ date: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.start_time || ''} onChange={(event) => update({ start_time: event.target.value })} style={smallFieldStyle} disabled={row.is_off} />
                  <input type="time" value={row.end_time || ''} onChange={(event) => update({ end_time: event.target.value })} style={smallFieldStyle} disabled={row.is_off} />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                    <input type="checkbox" checked={Boolean(row.is_off)} onChange={(event) => update({ is_off: event.target.checked })} />
                    休息
                  </label>
                </>
              )}
            />

            <RowsEditor
              title="固定休息時段"
              description="每週固定扣減的休息時段。"
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
                  <input value={row.label || ''} onChange={(event) => update({ label: event.target.value })} style={smallFieldStyle} placeholder="備註" />
                </>
              )}
            />

            <RowsEditor
              title="休假時段"
              description="設定某日或全日休假。"
              rows={timeOffRows}
              onAdd={() => setTimeOffRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '20:00', reason: '', is_all_day: false }])}
              onRemove={(id) => removeRow(setTimeOffRows, setTimeOffDeletedIds, id)}
              setRows={setTimeOffRows}
              renderRow={(row, update) => (
                <>
                  <input type="date" value={row.date || ''} onChange={(event) => update({ date: event.target.value })} style={smallFieldStyle} />
                  <input type="time" value={row.start_time || ''} onChange={(event) => update({ start_time: event.target.value })} style={smallFieldStyle} disabled={row.is_all_day} />
                  <input type="time" value={row.end_time || ''} onChange={(event) => update({ end_time: event.target.value })} style={smallFieldStyle} disabled={row.is_all_day} />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
                    <input type="checkbox" checked={Boolean(row.is_all_day)} onChange={(event) => update({ is_all_day: event.target.checked })} />
                    全日
                  </label>
                </>
              )}
            />

            <RowsEditor
              title="封鎖時段"
              description="用於臨時封鎖特定時段，不讓前台顯示。"
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
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>對照服務</span>
                <select value={previewServiceId} onChange={(event) => setPreviewServiceId(event.target.value)} style={fieldStyle}>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Pill tone="success">{bookingOpsCopy.available}</Pill>
                <Pill tone="warning">{bookingOpsCopy.full}</Pill>
                <Pill tone="muted">{bookingOpsCopy.rest}</Pill>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>{monthTitle(previewMonth)}</div>
              {previewLoading ? <div style={{ color: '#6B7280' }}>{bookingOpsCopy.loadingDates}</div> : null}
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
                  const status = previewMap.get(dateISO)?.status || 'off'
                  return (
                    <div
                      key={dateISO}
                      style={{
                        ...cardStyle,
                        minHeight: '86px',
                        padding: '10px',
                        opacity: inMonth ? 1 : 0.45,
                        color: status === 'off' ? '#9CA3AF' : '#111827',
                        background: status === 'off' ? '#F8FAFC' : '#fff',
                        borderColor: status === 'full' ? 'rgba(166, 139, 106, 0.45)' : '#E5E7EB',
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 900 }}>{dayLabel}</div>
                      {inMonth ? (
                        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700 }}>
                          {status === 'available' ? '上班 / 可預約' : status === 'full' ? '上班 / 已滿' : '休息'}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

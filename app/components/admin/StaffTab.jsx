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

const buildMonthGrid = (monthKey) => {
  const first = new Date(`${monthKey}-01T12:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const cursor = new Date(first)
  cursor.setUTCDate(cursor.getUTCDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(cursor)
    current.setUTCDate(cursor.getUTCDate() + index)
    const dateISO = current.toISOString().slice(0, 10)
    return { dateISO, inMonth: dateISO.startsWith(monthKey), dayLabel: dateISO.slice(8, 10) }
  })
}

const monthLabel = (monthKey) =>
  new Intl.DateTimeFormat('zh-HK', { year: 'numeric', month: 'long', timeZone: 'Asia/Hong_Kong' }).format(
    new Date(`${monthKey}-01T12:00:00Z`),
  )

const normalizeTime = (value) => (value ? String(value).slice(0, 5) : '')
const normalizeDate = (value) => (value ? String(value).slice(0, 10) : '')

const cardStyle = {
  border: '1px solid #E5E7EB',
  borderRadius: '18px',
  padding: '16px',
  background: '#fff',
}

const Field = ({ label, children }) => (
  <label style={{ display: 'grid', gap: '8px' }}>
    <span style={{ fontSize: '13px', fontWeight: 800 }}>{label}</span>
    {children}
  </label>
)

function RowList({ title, description, rows, onAdd, onChange, onRemove, renderRow, addLabel }) {
  return (
    <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>{title}</div>
          <div style={{ marginTop: '4px', fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>{description}</div>
        </div>
        <button type="button" className="btn btn-secondary btn-interactive" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="暫時沒有資料" description={description} />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {rows.map((row) => (
            <div key={row.id} style={{ ...cardStyle, padding: '14px', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {renderRow(row, (patch) => onChange(row.id, patch))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <Pill tone={row.id > 0 ? 'success' : 'warning'}>{row.id > 0 ? '已儲存' : '未儲存'}</Pill>
                <button type="button" className="btn btn-danger btn-interactive" onClick={() => onRemove(row.id)}>
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StaffTab({
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
  const [previewSummaries, setPreviewSummaries] = useState([])
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

  const selectedStaff = useMemo(
    () => staff.find((item) => Number(item.id) === Number(selectedStaffId)) || staff[0] || null,
    [selectedStaffId, staff],
  )

  const locationMap = useMemo(
    () => new Map(locations.map((item) => [Number(item.id), item.name || `#${item.id}`])),
    [locations],
  )
  const providerGroupMap = useMemo(
    () => new Map(providerGroups.map((item) => [Number(item.id), item.name || `#${item.id}`])),
    [providerGroups],
  )

  useEffect(() => {
    if (!selectedStaff && staff[0]) setSelectedStaffId(staff[0].id)
    if (selectedStaff && !staff.some((item) => Number(item.id) === Number(selectedStaffId))) {
      setSelectedStaffId(staff[0]?.id ?? null)
    }
  }, [selectedStaff, selectedStaffId, staff])

  useEffect(() => {
    if (!selectedStaff) return
    setShiftRows((staffShifts || []).filter((row) => Number(row.staff_id) === Number(selectedStaff.id)).map((row) => ({
      ...row,
      date: normalizeDate(row.date),
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
      is_off: Boolean(row.is_off),
    })))
    setShiftDeletedIds([])
    setBreakRows((staffBreaks || []).filter((row) => Number(row.staff_id) === Number(selectedStaff.id)).map((row) => ({
      ...row,
      day_of_week: String(row.day_of_week ?? '1'),
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
      label: row.label || '',
      enabled: row.enabled !== false,
    })))
    setBreakDeletedIds([])
    setTimeOffRows((staffTimeOff || []).filter((row) => Number(row.staff_id) === Number(selectedStaff.id)).map((row) => ({
      ...row,
      date: normalizeDate(row.date),
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
      reason: row.reason || '',
      is_all_day: Boolean(row.is_all_day),
    })))
    setTimeOffDeletedIds([])
    setBlockedRows((blockedSlots || []).filter((row) => Number(row.staff_id) === Number(selectedStaff.id)).map((row) => ({
      ...row,
      date: normalizeDate(row.date),
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
      reason: row.reason || '',
      source: row.source || 'manual',
    })))
    setBlockedDeletedIds([])
  }, [blockedSlots, selectedStaff, staffBreaks, staffShifts, staffTimeOff])

  useEffect(() => {
    const nextServiceId =
      selectedStaff?.services?.[0] != null ? String(selectedStaff.services[0]) : services[0]?.id != null ? String(services[0].id) : ''
    setPreviewServiceId((current) => (current ? current : nextServiceId))
  }, [selectedStaff, services])

  useEffect(() => {
    if (!selectedStaff?.id || !previewServiceId || !previewMonth) {
      setPreviewSummaries([])
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
        if (!response.ok) throw new Error(payload?.error || '無法載入前台可預約摘要')
        return payload
      })
      .then((payload) => setPreviewSummaries(Array.isArray(payload?.dates) ? payload.dates : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setPreviewSummaries([])
          setPreviewError(error?.message || '無法載入前台可預約摘要')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false)
      })

    return () => controller.abort()
  }, [previewMonth, previewServiceId, selectedStaff])

  const previewMap = useMemo(() => new Map(previewSummaries.map((entry) => [entry.date, entry])), [previewSummaries])
  const previewGrid = useMemo(() => buildMonthGrid(previewMonth), [previewMonth])

  const handleRemoveRow = (rows, setRows, setDeleted, id) => {
    setRows(rows.filter((row) => row.id !== id))
    if (Number(id) > 0) setDeleted((current) => [...current, Number(id)])
  }

  const handleSaveAll = async () => {
    if (!selectedStaff?.id) return
    try {
      await onSave(selectedStaff.id, { silentSuccess: true })
      await onSaveShifts({ rows: shiftRows, deletedIds: shiftDeletedIds }, { silentSuccess: true })
      await onSaveBreaks({ rows: breakRows, deletedIds: breakDeletedIds }, { silentSuccess: true })
      await onSaveTimeOff({ rows: timeOffRows, deletedIds: timeOffDeletedIds }, { silentSuccess: true })
      await onSaveBlockedSlots({ rows: blockedRows, deletedIds: blockedDeletedIds }, { silentSuccess: true })
      toast.success('已儲存目前服務供應者')
    } catch (error) {
      toast.error(error?.message || '儲存失敗')
    }
  }

  if (!staff.length) {
    return (
      <div style={{ display: 'grid', gap: '18px' }}>
        <SectionHeader eyebrow="服務供應者" title="排班設定" description="先建立服務供應者，之後即可設定每週時間表、日期覆蓋與前台可預約時段。" />
        <EmptyState
          title="尚未建立服務供應者"
          description="請先新增服務供應者，之後便可設定上班時間、下班時間、休息與封鎖時段。"
          actions={<button type="button" className="btn btn-interactive" onClick={onAddStaff}>新增服務供應者</button>}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <SectionHeader
        eyebrow="排班中心"
        title="服務供應者排班與前台對照"
        description="在這裡設定每週上班時間、日期覆蓋、固定休息、休假與封鎖時段。前台月曆會依照這些設定顯示可預約、已滿或休息。"
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-interactive" onClick={onAddStaff} disabled={saving}>
              新增服務供應者
            </button>
            <button type="button" className="btn btn-interactive" onClick={handleSaveAll} disabled={saving || !selectedStaff}>
              {saving ? '儲存中…' : '儲存目前服務供應者'}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid #E5E7EB', display: 'grid', gap: '10px' }}>
          {staff.map((item) => {
            const selected = Number(item.id) === Number(selectedStaff?.id)
            const itemServices = (item.services || []).length
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
                  <Pill>{itemServices} 項服務</Pill>
                </div>
              </button>
            )
          })}
        </div>

        {selectedStaff ? (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>基本資料</div>
                  <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>{selectedStaff.name || '新服務供應者'}</div>
                </div>
                <button type="button" className="btn btn-danger btn-interactive" onClick={() => onDeleteStaff(selectedStaff.id)} disabled={saving}>
                  刪除此服務供應者
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <Field label="名稱"><input value={selectedStaff.name || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'name', event.target.value)} style={fieldStyle} /></Field>
                <Field label="角色"><input value={selectedStaff.role || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'role', event.target.value)} style={fieldStyle} /></Field>
                <Field label="電話"><input value={selectedStaff.phone || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'phone', event.target.value)} style={fieldStyle} /></Field>
                <Field label="照片連結"><input value={selectedStaff.photo_url || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'photo_url', event.target.value)} style={fieldStyle} /></Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <Field label="預約地點">
                  <select value={selectedStaff.location_id ?? ''} onChange={(event) => onUpdateField(selectedStaff.id, 'location_id', event.target.value === '' ? null : Number(event.target.value))} style={fieldStyle}>
                    <option value="">未指定</option>
                    {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
                <Field label="服務供應者群組">
                  <select value={selectedStaff.provider_group_id ?? ''} onChange={(event) => onUpdateField(selectedStaff.id, 'provider_group_id', event.target.value === '' ? null : Number(event.target.value))} style={fieldStyle} disabled={!availableTables.providerGroups}>
                    <option value="">{availableTables.providerGroups ? '未指定' : '資料表未啟用'}</option>
                    {providerGroups.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                  </select>
                </Field>
                <Field label="狀態">
                  <button type="button" className="btn btn-secondary btn-interactive" onClick={() => onUpdateField(selectedStaff.id, 'enabled', selectedStaff.enabled === false)} disabled={saving}>
                    {selectedStaff.enabled === false ? '目前停用，按此啟用' : '目前啟用，按此停用'}
                  </button>
                </Field>
              </div>

              <Field label="簡介">
                <textarea value={selectedStaff.bio || ''} onChange={(event) => onUpdateField(selectedStaff.id, 'bio', event.target.value)} style={{ ...fieldStyle, minHeight: '90px', resize: 'vertical' }} />
              </Field>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800 }}>可預約服務</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {services.map((service) => {
                    const checked = (selectedStaff.services || []).includes(service.id)
                    return (
                      <label key={service.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '999px', border: '1px solid #E5E7EB', background: checked ? 'rgba(166, 139, 106, 0.12)' : '#fff', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => onToggleService(selectedStaff.id, service.id)} />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{service.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Pill>{selectedStaff.location_id ? `地點：${locationMap.get(Number(selectedStaff.location_id)) || `#${selectedStaff.location_id}`}` : '未指定地點'}</Pill>
                <Pill>{selectedStaff.provider_group_id ? `群組：${providerGroupMap.get(Number(selectedStaff.provider_group_id)) || `#${selectedStaff.provider_group_id}`}` : '未指定群組'}</Pill>
              </div>
            </div>

            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>每週時間表</div>
                <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>設定上班時間與下班時間</div>
                <div style={{ marginTop: '6px', color: '#6B7280', fontSize: '13px', lineHeight: 1.6 }}>前台只會顯示符合上班時間且可預約的時段。固定休息、休假與封鎖時段會再進一步扣減可預約時段。</div>
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
                        <input type="time" value={schedule.start || ''} onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'start', event.target.value)} style={smallFieldStyle} disabled={isOff} />
                        <input type="time" value={schedule.end || ''} onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'end', event.target.value)} style={smallFieldStyle} disabled={isOff} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <RowList title="日期覆蓋" description="用於設定單日上班、下班或單日休息。" rows={shiftRows} addLabel="新增日期覆蓋" onAdd={() => setShiftRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '20:00', is_off: false }])} onChange={(id, patch) => setShiftRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))} onRemove={(id) => handleRemoveRow(shiftRows, setShiftRows, setShiftDeletedIds, id)} renderRow={(row, updateRow) => (<><Field label="日期"><input type="date" value={row.date || ''} onChange={(event) => updateRow({ date: event.target.value })} style={smallFieldStyle} /></Field><Field label="上班時間"><input type="time" value={row.start_time || ''} onChange={(event) => updateRow({ start_time: event.target.value })} style={smallFieldStyle} disabled={row.is_off} /></Field><Field label="下班時間"><input type="time" value={row.end_time || ''} onChange={(event) => updateRow({ end_time: event.target.value })} style={smallFieldStyle} disabled={row.is_off} /></Field><Field label="狀態"><button type="button" className="btn btn-secondary btn-interactive" onClick={() => updateRow({ is_off: !Boolean(row.is_off) })} style={{ height: '40px' }}>{row.is_off ? '休息' : '上班'}</button></Field></>)} />

            <RowList title="固定休息時段" description="每週固定扣掉的休息時段。" rows={breakRows} addLabel="新增固定休息" onAdd={() => setBreakRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, day_of_week: '1', start_time: '13:00', end_time: '14:00', label: '', enabled: true }])} onChange={(id, patch) => setBreakRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))} onRemove={(id) => handleRemoveRow(breakRows, setBreakRows, setBreakDeletedIds, id)} renderRow={(row, updateRow) => (<><Field label="星期"><select value={row.day_of_week ?? '1'} onChange={(event) => updateRow({ day_of_week: event.target.value })} style={smallFieldStyle}>{WEEK_DAYS.map((day) => <option key={day.key} value={day.key}>{day.label}</option>)}</select></Field><Field label="開始時間"><input type="time" value={row.start_time || ''} onChange={(event) => updateRow({ start_time: event.target.value })} style={smallFieldStyle} /></Field><Field label="結束時間"><input type="time" value={row.end_time || ''} onChange={(event) => updateRow({ end_time: event.target.value })} style={smallFieldStyle} /></Field><Field label="標籤"><input value={row.label || ''} onChange={(event) => updateRow({ label: event.target.value })} style={smallFieldStyle} placeholder="例如午餐休息" /></Field></>)} />

            <RowList title="休假時段" description="設定單日或全日休假。" rows={timeOffRows} addLabel="新增休假" onAdd={() => setTimeOffRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '20:00', reason: '', is_all_day: false }])} onChange={(id, patch) => setTimeOffRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))} onRemove={(id) => handleRemoveRow(timeOffRows, setTimeOffRows, setTimeOffDeletedIds, id)} renderRow={(row, updateRow) => (<><Field label="日期"><input type="date" value={row.date || ''} onChange={(event) => updateRow({ date: event.target.value })} style={smallFieldStyle} /></Field><Field label="開始時間"><input type="time" value={row.start_time || ''} onChange={(event) => updateRow({ start_time: event.target.value })} style={smallFieldStyle} disabled={row.is_all_day} /></Field><Field label="結束時間"><input type="time" value={row.end_time || ''} onChange={(event) => updateRow({ end_time: event.target.value })} style={smallFieldStyle} disabled={row.is_all_day} /></Field><Field label="全天"><button type="button" className="btn btn-secondary btn-interactive" onClick={() => updateRow({ is_all_day: !Boolean(row.is_all_day) })} style={{ height: '40px' }}>{row.is_all_day ? '是' : '否'}</button></Field></>)} />

            <RowList title="封鎖時段" description="用於臨時封鎖特定時段，不讓前台顯示。" rows={blockedRows} addLabel="新增封鎖" onAdd={() => setBlockedRows((current) => [...current, { id: nextTempId(), staff_id: selectedStaff.id, date: todayISO(), start_time: '11:00', end_time: '12:00', reason: '', source: 'manual' }])} onChange={(id, patch) => setBlockedRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))} onRemove={(id) => handleRemoveRow(blockedRows, setBlockedRows, setBlockedDeletedIds, id)} renderRow={(row, updateRow) => (<><Field label="日期"><input type="date" value={row.date || ''} onChange={(event) => updateRow({ date: event.target.value })} style={smallFieldStyle} /></Field><Field label="開始時間"><input type="time" value={row.start_time || ''} onChange={(event) => updateRow({ start_time: event.target.value })} style={smallFieldStyle} /></Field><Field label="結束時間"><input type="time" value={row.end_time || ''} onChange={(event) => updateRow({ end_time: event.target.value })} style={smallFieldStyle} /></Field><Field label="原因"><input value={row.reason || ''} onChange={(event) => updateRow({ reason: event.target.value })} style={smallFieldStyle} placeholder="例如會議" /></Field></>)} />

            <div className="admin-card" style={{ ...cardStyle, display: 'grid', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#A68B6A', fontWeight: 800, letterSpacing: '0.08em' }}>前台可預約對照</div>
                  <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 900 }}>月曆預覽</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-small btn-interactive" onClick={() => setPreviewMonth((current) => addMonths(current, -1))} disabled={previewLoading}>上月</button>
                  <button type="button" className="btn btn-small btn-interactive" onClick={() => setPreviewMonth((current) => addMonths(current, 1))} disabled={previewLoading}>下月</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end' }}>
                <Field label="對照服務">
                  <select value={previewServiceId} onChange={(event) => setPreviewServiceId(event.target.value)} style={fieldStyle}>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>
                </Field>
                <Field label="月份"><input value={monthLabel(previewMonth)} readOnly style={fieldStyle} /></Field>
              </div>
              {previewLoading ? <div style={{ color: '#6B7280' }}>{bookingOpsCopy.loadingDates || '載入月曆中...'}</div> : null}
              {previewError ? <div style={{ color: '#991B1B' }}>{previewError}</div> : null}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
                {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => <div key={weekday} style={{ fontSize: '12px', color: '#6B7280', fontWeight: 800 }}>星期{weekday}</div>)}
                {buildMonthGrid(previewMonth).map((cell) => {
                  const summary = previewMap.get(cell.dateISO) || {}
                  const status = summary.status || 'off'
                  return (
                    <div key={cell.dateISO} style={{ ...cardStyle, minHeight: '78px', padding: '12px', opacity: cell.inMonth ? 1 : 0.45, borderColor: status === 'available' ? '#A68B6A' : '#E5E7EB', background: status === 'full' ? '#FFF8EE' : '#fff' }}>
                      <div style={{ fontWeight: 900 }}>{cell.dayLabel}</div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#6B7280' }}>{status === 'available' ? '可預約' : status === 'full' ? '已滿' : '休息'}</div>
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


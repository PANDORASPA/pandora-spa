'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminActionBar, ChipRow, EmptyState, StatusPill } from './AdminConfigKit'

const DAYS = [
  ['0', '日'],
  ['1', '一'],
  ['2', '二'],
  ['3', '三'],
  ['4', '四'],
  ['5', '五'],
  ['6', '六'],
]

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--gray)',
  background: '#fff',
  fontSize: '14px',
  color: 'var(--text)',
}

const parseDate = (value) => (value ? String(value).slice(0, 10) : '')
const parseTime = (value) => (value ? String(value).slice(0, 5) : '')
const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647

const normalizeShift = (row) => ({ ...row, date: parseDate(row?.date), start_time: parseTime(row?.start_time), end_time: parseTime(row?.end_time) })
const normalizeBreak = (row) => ({
  ...row,
  day_of_week: row?.day_of_week == null ? '1' : String(row.day_of_week),
  start_time: parseTime(row?.start_time) || '12:00',
  end_time: parseTime(row?.end_time) || '13:00',
  label: row?.label || '休息',
  enabled: row?.enabled !== false,
})
const normalizeTimeOff = (row) => ({ ...row, date: parseDate(row?.date), start_time: parseTime(row?.start_time), end_time: parseTime(row?.end_time), is_all_day: Boolean(row?.is_all_day), reason: row?.reason || '' })
const normalizeBlocked = (row) => ({ ...row, date: parseDate(row?.date), start_time: parseTime(row?.start_time), end_time: parseTime(row?.end_time), reason: row?.reason || '', source: row?.source || 'manual' })

function Panel({ title, subtitle, actions, children, soft = false }) {
  return (
    <div
      className="admin-card"
      style={{
        padding: '22px',
        background: soft ? 'linear-gradient(180deg, #fff, #FBF8F4)' : '#fff',
        border: '1px solid rgba(166, 139, 106, 0.16)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>{soft ? '排程' : '資料'}</div>
          <h3 style={{ margin: '6px 0 0', fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>{title}</h3>
          {subtitle && <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}

function Label({ children, hint }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{children}</label>
      {hint && <div style={{ marginTop: '6px', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-light)' }}>{hint}</div>}
    </div>
  )
}

function ChipButton({ active, children, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-interactive"
      style={{
        padding: '9px 13px',
        borderRadius: '999px',
        border: `1px solid ${active ? (danger ? '#FCA5A5' : 'rgba(166, 139, 106, 0.35)') : 'var(--gray)'}`,
        background: active ? (danger ? '#FEF2F2' : 'rgba(166, 139, 106, 0.12)') : '#fff',
        color: active ? (danger ? '#DC2626' : 'var(--primary-dark)') : 'var(--text)',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toChipList = (value, prefix, lookup = {}) => {
  if (!value) return []
  const items = Array.isArray(value) ? value : [value]
  return items
    .map((item, index) => {
      if (item == null) return null
      if (typeof item === 'object') {
        const id = item.id != null ? Number(item.id) : null
        const label =
          item.name ||
          item.title ||
          item.label ||
          item.code ||
          item.full_name ||
          item.location_name ||
          item.display_name ||
          item.group_name ||
          item.provider_group_name ||
          item.service_name ||
          (id != null && lookup[id] ? lookup[id].name || lookup[id].title || lookup[id].label || lookup[id].location_name || lookup[id].group_name : '')
        if (!label) return null
        return { key: id != null ? `${prefix}-${id}` : `${prefix}-${index}`, label }
      }
      if (typeof item === 'string' || typeof item === 'number') {
        const id = Number(item)
        const lookupItem = Number.isFinite(id) && lookup[id] ? lookup[id] : null
        const label = lookupItem?.name || lookupItem?.title || lookupItem?.label || lookupItem?.location_name || lookupItem?.group_name || String(item)
        return { key: Number.isFinite(id) ? `${prefix}-${id}` : `${prefix}-${index}`, label }
      }
      return null
    })
    .filter(Boolean)
}

const dedupeChips = (items = []) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = item?.key || item?.label
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const scopeSummary = (count, singular, plural = `${singular}s`) => {
  if (!count) return `沒有${plural}`
  return `${count} ${count === 1 ? singular : plural}`
}

export default function StaffTab({
  staff = [],
  services = [],
  staffShifts = [],
  staffBreaks = [],
  staffTimeOff = [],
  blockedSlots = [],
  locations: directLocations = [],
  providerGroups: directProviderGroups = [],
  operationalContext = {},
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
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [localShifts, setLocalShifts] = useState([])
  const [localBreaks, setLocalBreaks] = useState([])
  const [localTimeOff, setLocalTimeOff] = useState([])
  const [localBlocked, setLocalBlocked] = useState([])
  const [deletedBreakIds, setDeletedBreakIds] = useState([])
  const [deletedTimeOffIds, setDeletedTimeOffIds] = useState([])
  const [deletedBlockedIds, setDeletedBlockedIds] = useState([])
  const [previewDate, setPreviewDate] = useState(localDate())
  const [previewServiceId, setPreviewServiceId] = useState('')
  const [previewSlotMatrix, setPreviewSlotMatrix] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  useEffect(() => setLocalShifts((staffShifts || []).map(normalizeShift)), [staffShifts])
  useEffect(() => setLocalBreaks((staffBreaks || []).map(normalizeBreak)), [staffBreaks])
  useEffect(() => setLocalTimeOff((staffTimeOff || []).map(normalizeTimeOff)), [staffTimeOff])
  useEffect(() => setLocalBlocked((blockedSlots || []).map(normalizeBlocked)), [blockedSlots])
  useEffect(() => {
    if (staff.length && !selectedStaffId) setSelectedStaffId(staff[0].id)
  }, [staff, selectedStaffId])
  useEffect(() => {
    if (!previewServiceId && services.length) setPreviewServiceId(services[0].id)
  }, [services, previewServiceId])

  const locations = Array.isArray(directLocations) && directLocations.length ? directLocations : Array.isArray(operationalContext?.locations) ? operationalContext.locations : []
  const providerGroups = Array.isArray(directProviderGroups) && directProviderGroups.length ? directProviderGroups : Array.isArray(operationalContext?.providerGroups) ? operationalContext.providerGroups : []
  const lookupFlags = operationalContext?.availableTables || {}

  const selectedStaff = staff.find((item) => item.id === selectedStaffId)
  const daysOff = Array.isArray(selectedStaff?.daysOff)
    ? selectedStaff.daysOff
    : Array.isArray(selectedStaff?.daysoff)
      ? selectedStaff.daysoff
      : []

  const locationLookup = useMemo(
    () => Object.fromEntries(locations.map((item) => [Number(item.id), item])),
    [locations]
  )
  const providerGroupLookup = useMemo(
    () => Object.fromEntries(providerGroups.map((item) => [Number(item.id), item])),
    [providerGroups]
  )
  const selectedStaffLocationChips = useMemo(() => {
    const source = selectedStaff || {}
    return dedupeChips(
      [
        ...toChipList(source.location_ids || source.locationIds || source.location_id || source.locationId, 'location-id', locationLookup),
        ...toChipList(source.locations || source.location_names || source.locationNames || source.location_name, 'location', locationLookup),
      ].filter(Boolean)
    )
  }, [locationLookup, selectedStaff])
  const selectedStaffGroupChips = useMemo(() => {
    const source = selectedStaff || {}
    return dedupeChips(
      [
        ...toChipList(source.provider_group_ids || source.providerGroupIds || source.provider_group_id || source.providerGroupId, 'group-id', providerGroupLookup),
        ...toChipList(source.provider_groups || source.providerGroups || source.provider_group_names || source.providerGroupNames || source.provider_group_name, 'group', providerGroupLookup),
      ].filter(Boolean)
    )
  }, [providerGroupLookup, selectedStaff])

  const selectedShifts = localShifts.filter((item) => item.staff_id === selectedStaffId)
  const selectedBreaks = localBreaks.filter((item) => item.staff_id === selectedStaffId)
  const selectedTimeOff = localTimeOff.filter((item) => item.staff_id === selectedStaffId)
  const selectedBlocked = localBlocked.filter((item) => item.staff_id === selectedStaffId)
  const providerScopeChips = useMemo(() => {
    const source = selectedStaff || {}
    const directGroups = toChipList(source.provider_groups || source.providerGroups || source.provider_group_names || source.providerGroupNames || source.provider_group_name, 'group', providerGroupLookup)
    const linkedGroups = toChipList(source.provider_group_ids || source.providerGroupIds || source.provider_group_id || source.providerGroupId, 'group-id', providerGroupLookup)
    const directLocations = toChipList(source.locations || source.location_names || source.locationIds || source.location_ids || source.locationNames || source.location_name || source.locationId, 'location', locationLookup)
    return dedupeChips([...directGroups, ...linkedGroups, ...directLocations])
  }, [locationLookup, providerGroupLookup, selectedStaff])

  const updateShift = (date, field, value) => {
    setLocalShifts((current) => {
      const existing = current.find((item) => item.staff_id === selectedStaffId && item.date === date)
      if (existing) return current.map((item) => (item === existing ? { ...item, [field]: value } : item))
      return [...current, { id: tempId(), staff_id: selectedStaffId, date, [field]: value, is_off: false }]
    })
  }

  const toggleShift = (date) => {
    setLocalShifts((current) => {
      const existing = current.find((item) => item.staff_id === selectedStaffId && item.date === date)
      if (existing) return current.map((item) => (item === existing ? { ...item, is_off: !item.is_off } : item))
      return [...current, { id: tempId(), staff_id: selectedStaffId, date, is_off: true }]
    })
  }

  const removeRow = (setter, deletedSetter, id) => {
    setter((current) => current.filter((item) => item.id !== id))
    if (isPersisted(id)) {
      deletedSetter((current) => (current.includes(id) ? current : [...current, id]))
    }
  }

  const saveAll = async () => {
    if (!selectedStaff) return
    const scopedStaffId = selectedStaff.id
    await onSave?.(selectedStaff.id)
    if (onSaveShifts) await onSaveShifts(localShifts.filter((row) => Number(row.staff_id) === Number(scopedStaffId)))
    if (onSaveBreaks) {
      await onSaveBreaks({
        rows: localBreaks.filter((row) => Number(row.staff_id) === Number(scopedStaffId)),
        deletedIds: deletedBreakIds,
      })
    }
    if (onSaveTimeOff) {
      await onSaveTimeOff({
        rows: localTimeOff.filter((row) => Number(row.staff_id) === Number(scopedStaffId)),
        deletedIds: deletedTimeOffIds,
      })
    }
    if (onSaveBlockedSlots) {
      await onSaveBlockedSlots({
        rows: localBlocked.filter((row) => Number(row.staff_id) === Number(scopedStaffId)),
        deletedIds: deletedBlockedIds,
      })
    }
  }

  const loadAvailability = async () => {
    if (!selectedStaffId || !previewServiceId || !previewDate) return
    try {
      setPreviewLoading(true)
      setPreviewError('')
      const params = new URLSearchParams({ date: previewDate, serviceId: String(previewServiceId), staffId: String(selectedStaffId) })
      const res = await fetch(`/api/availability?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '無法載入可預約時段')
      setPreviewSlotMatrix(Array.isArray(data?.slotMatrix) ? data.slotMatrix : [])
    } catch (error) {
      setPreviewSlotMatrix([])
      setPreviewError(error?.message || '無法載入可預約時段')
    } finally {
      setPreviewLoading(false)
    }
  }

  const renderCells = () => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i += 1) cells.push(<div key={`blank-${i}`} />)

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const shift = localShifts.find((item) => item.staff_id === selectedStaffId && item.date === date)
      const dayKey = new Date(year, month, day).getDay().toString()
      const schedule = selectedStaff?.schedule?.[dayKey]
      const off = shift ? shift.is_off : daysOff.includes(dayKey)

      cells.push(
        <div
          key={date}
          className="admin-card"
          style={{
            padding: '12px',
            minHeight: '122px',
            background: off ? '#FFF7F7' : '#fff',
            border: `1px solid ${shift ? 'rgba(166, 139, 106, 0.35)' : 'var(--gray)'}`,
            display: 'grid',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontWeight: 800 }}>{day}</div>
            <button
              type="button"
              onClick={() => toggleShift(date)}
              className="btn-interactive"
              style={{
                border: 'none',
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 800,
                background: off ? '#EF4444' : 'rgba(166, 139, 106, 0.12)',
                color: off ? '#fff' : 'var(--primary-dark)',
              }}
            >
              {off ? '休息' : '上班'}
            </button>
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--text-light)' }}>
            {shift ? '手動覆寫' : daysOff.includes(dayKey) ? '每週休息' : schedule?.start ? '預設工時' : '未設定基準'}
          </div>
          {!off && (
            <div style={{ display: 'grid', gap: '6px' }}>
              <input
                type="time"
                value={shift?.start_time || schedule?.start || '11:00'}
                onChange={(event) => updateShift(date, 'start_time', event.target.value)}
                style={{ ...fieldStyle, padding: '8px 10px', fontSize: '12px' }}
              />
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-light)', fontWeight: 700 }}>至</div>
              <input
                type="time"
                value={shift?.end_time || schedule?.end || '20:00'}
                onChange={(event) => updateShift(date, 'end_time', event.target.value)}
                style={{ ...fieldStyle, padding: '8px 10px', fontSize: '12px' }}
              />
            </div>
          )}
        </div>
      )
    }
    return cells
  }

  if (!staff.length) {
    return <div className="admin-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-light)' }}>暫時未有人員資料。</div>
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #fff, #FBF8F4)',
          border: '1px solid rgba(166, 139, 106, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>人員排程中心</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>管理人員、班次、休息時段同即時可用狀態</div>
          <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
            先喺左邊揀一位人員，再一次過編輯檔案、每週基準、日期覆寫同手動封鎖時段。
          </div>
        </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusPill tone="accent">{staff.length} 人員</StatusPill>
            <button type="button" onClick={onAddStaff} className="btn btn-small btn-interactive">
              + 新增人員
            </button>
          <button type="button" onClick={saveAll} disabled={saving || !selectedStaff} className="btn btn-small btn-interactive" style={{ minWidth: '170px' }}>
            {saving && <span className="spinner"></span>}
            {saving ? '儲存中...' : '儲存所選人員'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '88px' }}>
          <Panel title="團隊" subtitle="揀一位人員去編輯佢嘅時間表。" soft>
            <div style={{ display: 'grid', gap: '10px' }}>
              {staff.map((member) => {
                const active = selectedStaffId === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedStaffId(member.id)}
                    className="admin-table-row"
                    style={{
                      textAlign: 'left',
                      padding: '14px',
                      borderRadius: '14px',
                      border: `1px solid ${active ? 'rgba(166, 139, 106, 0.35)' : 'var(--gray)'}`,
                      background: active ? 'rgba(166, 139, 106, 0.06)' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: member.photo_url ? `url(${member.photo_url}) center/cover` : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '16px',
                          overflow: 'hidden',
                        }}
                      >
                        {!member.photo_url && (member.name?.charAt(0) || '?')}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: active ? 'var(--primary-dark)' : 'var(--text)' }}>{member.name || '未命名'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{member.role || '人員'}</div>
                      </div>
                      <span className="badge" style={{ background: member.enabled ? '#ECFDF5' : '#F3F4F6', color: member.enabled ? '#047857' : '#6B7280' }}>
                        {member.enabled ? '已啟用' : '已隱藏'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Panel>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedStaff ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              <Panel
                title="人員檔案"
                subtitle="基本資料、公開顯示同重複休息時段。"
                actions={
                  <button
                    type="button"
                    onClick={() => onDeleteStaff?.(selectedStaff.id)}
                    className="btn btn-small btn-interactive"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                  >
                    刪除
                  </button>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '18px' }}>
                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <Label>
                        名稱
                        <input value={selectedStaff.name || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'name', e.target.value)} placeholder="人員名稱" style={fieldStyle} />
                      </Label>
                      <Label>
                        職位
                        <select value={selectedStaff.role || '髮型師'} onChange={(e) => onUpdateField(selectedStaff.id, 'role', e.target.value)} style={fieldStyle}>
                          <option>髮型師</option>
                          <option>資深髮型師</option>
                          <option>助理</option>
                          <option>經理</option>
                        </select>
                      </Label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <Label>
                        電話
                        <input value={selectedStaff.phone || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'phone', e.target.value)} placeholder="+852..." style={fieldStyle} />
                      </Label>
                      <Label>
                        相片網址
                        <input value={selectedStaff.photo_url || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'photo_url', e.target.value)} placeholder="https://..." style={fieldStyle} />
                      </Label>
                    </div>
                    <Label>
                      簡介
                      <textarea value={selectedStaff.bio || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'bio', e.target.value)} placeholder="為團隊頁面寫一段簡短介紹。" style={{ ...fieldStyle, minHeight: '100px', resize: 'vertical' }} />
                    </Label>
                  </div>

                  <div style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--gray)', background: 'linear-gradient(180deg, #FAF8F5, #fff)', display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                      <div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#A68B6A' }}>即時摘要</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>此設定影響內容</div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                        <input type="checkbox" checked={Boolean(selectedStaff.enabled)} onChange={(e) => onUpdateField(selectedStaff.id, 'enabled', e.target.checked)} />
                        啟用中
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedStaff.services?.length || 0} 項服務</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedShifts.length} 項覆寫</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedBreaks.length} 個休息時段</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedTimeOff.length} 項請假</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedBlocked.length} 項封鎖</span>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>營運範圍</div>
                        <span className="badge badge-outline" style={{ background: '#fff' }}>
                          {scopeSummary(providerScopeChips.length, '連結')}
                        </span>
                      </div>
                      <ChipRow
                        items={providerScopeChips}
                        emptyLabel="尚未設定地點或服務供應者群組連結"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>可用地點</div>
                          <span className="badge badge-outline" style={{ background: '#fff' }}>
                            {scopeSummary(selectedStaffLocationChips.length, '地點')}
                          </span>
                        </div>
                        <ChipRow items={selectedStaffLocationChips} emptyLabel={locations.length ? '尚未選擇地點連結' : '地點資料未載入'} />
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>允許的服務供應者群組</div>
                          <span className="badge badge-outline" style={{ background: '#fff' }}>
                            {scopeSummary(selectedStaffGroupChips.length, '群組')}
                          </span>
                        </div>
                        <ChipRow items={selectedStaffGroupChips} emptyLabel={providerGroups.length ? '尚未選擇服務供應者群組連結' : '服務供應者群組資料未載入'} />
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-light)' }}>
                      {locations.length || providerGroups.length
                        ? '此人員資料會先讀取即時管理後台的查詢資料，令可預約時段與操作範圍保持一致。'
                        : '範圍查詢資料暫未提供，因此此頁會暫時回退至人員資料欄位以維持相容。'}
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#FFF7ED',
                        border: '1px solid #FED7AA',
                        color: '#9A3412',
                        fontSize: '13px',
                        lineHeight: 1.6,
                      }}
                    >
                      每日休息現已改為使用下方標準化的「重複休息時段」清單。請在
                      <strong> 重複休息時段</strong> 面板內新增或修改時段，確保儲存內容與即時 schema 保持一致。
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="服務" subtitle="切換此人員可處理的服務。" soft>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {services.map((service) => {
                    const active = selectedStaff.services?.includes(service.id)
                    return (
                      <ChipButton key={service.id} active={active} onClick={() => onToggleService(selectedStaff.id, service.id)}>
                        {service.emoji ? `${service.emoji} ` : ''}
                        {service.name}
                      </ChipButton>
                    )
                  })}
                </div>
              </Panel>

              <Panel title="每週時間表" subtitle="設定每個星期的重複基準工時。">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
                  {DAYS.map(([key, label]) => {
                    const schedule = selectedStaff.schedule?.[key]
                    const off = daysOff.includes(key)
                    return (
                      <div key={key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-light)' }}>{label}</div>
                        <button
                          type="button"
                          onClick={() => onToggleDailyOff(selectedStaff.id, key)}
                          className="btn-interactive"
                          style={{
                            width: '100%',
                            minHeight: '88px',
                            borderRadius: '14px',
                            border: `1px solid ${off ? '#FCA5A5' : 'var(--gray)'}`,
                            background: off ? '#FEF2F2' : '#fff',
                            color: off ? '#DC2626' : 'var(--text)',
                            padding: '12px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 800 }}>{off ? '休息日' : '上班中'}</div>
                          <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.5, color: off ? '#B91C1C' : 'var(--text-light)' }}>
                            {off ? '休息中' : schedule?.start ? `${schedule.start} - ${schedule.end}` : '點擊設定'}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {DAYS.map(([key, label]) => {
                    const schedule = selectedStaff.schedule?.[key] || {}
                    return (
                      <div key={key} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '8px' }}>{label}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input type="time" value={schedule.start || '11:00'} onChange={(e) => onUpdateSchedule(selectedStaff.id, key, 'start', e.target.value)} style={{ ...fieldStyle, padding: '8px 10px', fontSize: '12px' }} />
                          <span style={{ fontWeight: 800, color: 'var(--text-light)' }}>至</span>
                          <input type="time" value={schedule.end || '20:00'} onChange={(e) => onUpdateSchedule(selectedStaff.id, key, 'end', e.target.value)} style={{ ...fieldStyle, padding: '8px 10px', fontSize: '12px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>

              <Panel
                title="日期覆寫"
                subtitle="用日曆單獨開關某一天，不影響每週基準工時。"
                soft
                actions={
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setMonth((m) => (m === 0 ? (setYear((y) => y - 1), 11) : m - 1))} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                      上個月
                    </button>
                    <button type="button" onClick={() => setMonth((m) => (m === 11 ? (setYear((y) => y + 1), 0) : m + 1))} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                      下個月
                    </button>
                  </div>
                }
              >
                <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                  {year} / {month + 1}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                  {DAYS.map(([key, label]) => (
                    <div key={key} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--text-light)' }}>
                      {label}
                    </div>
                  ))}
                  {renderCells()}
                </div>
              </Panel>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <Panel title="重複休息時段" subtitle="每週固定休息時段，會持續封鎖可預約時段。" actions={<button type="button" onClick={() => setLocalBreaks((current) => [...current, { id: tempId(), staff_id: selectedStaffId, day_of_week: '1', start_time: '12:00', end_time: '13:00', label: '休息', enabled: true }])} className="btn btn-small btn-interactive">+ 新增</button>}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedBreaks.length === 0 ? (
                      <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-light)', background: '#FAF8F5', borderRadius: '12px' }}>暫時未有重複休息時段。</div>
                    ) : (
                      selectedBreaks.map((row) => (
                        <div key={row.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                              <select value={row.day_of_week} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, day_of_week: e.target.value } : item)))} style={fieldStyle}>
                                {DAYS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                              </select>
                              <input value={row.label || ''} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, label: e.target.value } : item)))} placeholder="名稱" style={fieldStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                              <input type="time" value={row.start_time || ''} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, start_time: e.target.value } : item)))} style={fieldStyle} />
                              <input type="time" value={row.end_time || ''} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, end_time: e.target.value } : item)))} style={fieldStyle} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                                <input type="checkbox" checked={row.enabled !== false} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, enabled: e.target.checked } : item)))} />
                                已啟用
                              </label>
                            </div>
                            <button type="button" onClick={() => removeRow(setLocalBreaks, setDeletedBreakIds, row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', width: 'fit-content' }}>
                              刪除
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

              <Panel title="請假 / 休假" subtitle="請假或單次排程空檔，會覆蓋時間表。" actions={<button type="button" onClick={() => setLocalTimeOff((current) => [...current, { id: tempId(), staff_id: selectedStaffId, date: previewDate, start_time: '', end_time: '', is_all_day: true, reason: '' }])} className="btn btn-small btn-interactive">+ 新增</button>}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedTimeOff.length === 0 ? (
                      <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-light)', background: '#FAF8F5', borderRadius: '12px' }}>暫時未有請假紀錄。</div>
                    ) : (
                      selectedTimeOff.map((row) => (
                        <div key={row.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <input type="date" value={row.date || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, date: e.target.value } : item)))} style={fieldStyle} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                                <input type="checkbox" checked={Boolean(row.is_all_day)} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, is_all_day: e.target.checked } : item)))} />
                                全日
                              </label>
                            </div>
                            {!row.is_all_day && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                                <input type="time" value={row.start_time || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, start_time: e.target.value } : item)))} style={fieldStyle} />
                                <input type="time" value={row.end_time || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, end_time: e.target.value } : item)))} style={fieldStyle} />
                              </div>
                            )}
                            <input type="text" value={row.reason || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, reason: e.target.value } : item)))} placeholder="原因" style={fieldStyle} />
                            <button type="button" onClick={() => removeRow(setLocalTimeOff, setDeletedTimeOffIds, row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', width: 'fit-content' }}>
                              刪除
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </div>

              <Panel title="封鎖時段" subtitle="手動封鎖假期、維修或私人預約時段。" actions={<button type="button" onClick={() => setLocalBlocked((current) => [...current, { id: tempId(), staff_id: selectedStaffId, date: previewDate, start_time: '15:00', end_time: '16:00', reason: '', source: 'manual' }])} className="btn btn-small btn-interactive">+ 新增</button>}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedBlocked.length === 0 ? (
                    <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-light)', background: '#FAF8F5', borderRadius: '12px' }}>暫時未有封鎖時段。</div>
                  ) : (
                    selectedBlocked.map((row) => (
                      <div key={row.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                            <input type="date" value={row.date || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, date: e.target.value } : item)))} style={fieldStyle} />
                            <input type="time" value={row.start_time || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, start_time: e.target.value } : item)))} style={fieldStyle} />
                            <input type="time" value={row.end_time || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, end_time: e.target.value } : item)))} style={fieldStyle} />
                          </div>
                            <input type="text" value={row.reason || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, reason: e.target.value } : item)))} placeholder="原因" style={fieldStyle} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-outline" style={{ background: '#fff' }}>來源：{row.source || 'manual'}</span>
                            <button type="button" onClick={() => removeRow(setLocalBlocked, setDeletedBlockedIds, row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                              刪除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="即時時段預覽" subtitle="確認前台顯示的時段是否跟目前排程一致。" soft actions={<button type="button" onClick={loadAvailability} className="btn btn-small btn-interactive">查看可預約時段</button>}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <Label>
                    日期
                    <input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} style={fieldStyle} />
                  </Label>
                  <Label>
                    服務
                    <select value={previewServiceId} onChange={(e) => setPreviewServiceId(Number(e.target.value))} style={fieldStyle}>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label>
                    人員
                    <select value={selectedStaffId || ''} onChange={(e) => setSelectedStaffId(Number(e.target.value))} style={fieldStyle}>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                </div>

                <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
                  {previewLoading ? (
                    <div style={{ color: 'var(--text-light)' }}>正在載入可預約時段...</div>
                  ) : previewError ? (
                    <div style={{ color: '#DC2626' }}>{previewError}</div>
                  ) : previewSlotMatrix.length ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="badge badge-outline" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#047857' }}>可用</span>
                        <span className="badge badge-outline" style={{ background: '#F3F4F6', borderColor: '#E5E7EB', color: '#6B7280' }}>不可用</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '8px' }}>
                        {previewSlotMatrix.map((slot) => (
                          <div
                            key={slot.time}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '10px',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              background: slot.available ? '#ECFDF5' : '#F3F4F6',
                              border: `1px solid ${slot.available ? '#A7F3D0' : '#E5E7EB'}`,
                              color: slot.available ? '#047857' : '#6B7280',
                            }}
                          >
                            {slot.time}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-light)' }}>請先選擇日期、服務及人員，然後按「查看可預約時段」。</div>
                  )}
                </div>
              </Panel>
            </div>
          ) : (
            <div className="admin-card" style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-light)', border: '1px dashed var(--gray)', background: 'linear-gradient(180deg, #fff, #FAF8F5)' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>請先選擇一位人員</div>
              <div style={{ fontSize: '14px', lineHeight: 1.7 }}>可在此集中管理人員資料、服務、每週工時、月曆覆寫、休息、請假及封鎖時段。</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

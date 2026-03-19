'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminActionBar, ChipRow, EmptyState, StatusPill } from './AdminConfigKit'

const DAYS = [
  ['0', 'Sun'],
  ['1', 'Mon'],
  ['2', 'Tue'],
  ['3', 'Wed'],
  ['4', 'Thu'],
  ['5', 'Fri'],
  ['6', 'Sat'],
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
  label: row?.label || 'Break',
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
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>{soft ? 'SCHEDULE' : 'PROFILE'}</div>
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
  if (!count) return `No ${plural}`
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
    await onSave?.()
    if (onSaveShifts) await onSaveShifts(localShifts)
    if (onSaveBreaks) await onSaveBreaks({ rows: localBreaks, deletedIds: deletedBreakIds })
    if (onSaveTimeOff) await onSaveTimeOff({ rows: localTimeOff, deletedIds: deletedTimeOffIds })
    if (onSaveBlockedSlots) await onSaveBlockedSlots({ rows: localBlocked, deletedIds: deletedBlockedIds })
  }

  const loadAvailability = async () => {
    if (!selectedStaffId || !previewServiceId || !previewDate) return
    try {
      setPreviewLoading(true)
      setPreviewError('')
      const params = new URLSearchParams({ date: previewDate, serviceId: String(previewServiceId), staffId: String(selectedStaffId) })
      const res = await fetch(`/api/availability?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Unable to load availability')
      setPreviewSlotMatrix(Array.isArray(data?.slotMatrix) ? data.slotMatrix : [])
    } catch (error) {
      setPreviewSlotMatrix([])
      setPreviewError(error?.message || 'Unable to load availability')
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
              {off ? 'Off' : 'Work'}
            </button>
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--text-light)' }}>
            {shift ? 'Manual override' : daysOff.includes(dayKey) ? 'Weekly off' : schedule?.start ? 'Default hours' : 'No baseline'}
          </div>
          {!off && (
            <div style={{ display: 'grid', gap: '6px' }}>
              <input
                type="time"
                value={shift?.start_time || schedule?.start || '11:00'}
                onChange={(event) => updateShift(date, 'start_time', event.target.value)}
                style={{ ...fieldStyle, padding: '8px 10px', fontSize: '12px' }}
              />
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-light)', fontWeight: 700 }}>to</div>
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
    return <div className="admin-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-light)' }}>No staff members yet.</div>
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
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>STAFF SCHEDULING CENTER</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Manage people, shifts, breaks, and live availability</div>
          <div style={{ marginTop: '6px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>
            Select a staff member on the left, then edit the profile, weekly baseline, date overrides, and manual blocks in one flow.
          </div>
        </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusPill tone="accent">{staff.length} staff</StatusPill>
            <button type="button" onClick={onAddStaff} className="btn btn-small btn-interactive">
              + Add staff
            </button>
          <button type="button" onClick={saveAll} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '140px' }}>
            {saving && <span className="spinner"></span>}
            {saving ? 'Saving...' : 'Save scheduling'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '88px' }}>
          <Panel title="Team" subtitle="Pick one person to edit their schedule." soft>
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
                        <div style={{ fontSize: '15px', fontWeight: 800, color: active ? 'var(--primary-dark)' : 'var(--text)' }}>{member.name || 'Unnamed'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{member.role || 'Staff'}</div>
                      </div>
                      <span className="badge" style={{ background: member.enabled ? '#ECFDF5' : '#F3F4F6', color: member.enabled ? '#047857' : '#6B7280' }}>
                        {member.enabled ? 'Enabled' : 'Hidden'}
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
                title="Provider profile"
                subtitle="Basic details, public visibility, and the recurring break window."
                actions={
                  <button
                    type="button"
                    onClick={() => onDeleteStaff?.(selectedStaff.id)}
                    className="btn btn-small btn-interactive"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                  >
                    Delete
                  </button>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '18px' }}>
                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <Label>
                        Name
                        <input value={selectedStaff.name || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'name', e.target.value)} placeholder="Staff name" style={fieldStyle} />
                      </Label>
                      <Label>
                        Role
                        <select value={selectedStaff.role || 'Stylist'} onChange={(e) => onUpdateField(selectedStaff.id, 'role', e.target.value)} style={fieldStyle}>
                          <option>Stylist</option>
                          <option>Senior Stylist</option>
                          <option>Assistant</option>
                          <option>Manager</option>
                        </select>
                      </Label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <Label>
                        Phone
                        <input value={selectedStaff.phone || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'phone', e.target.value)} placeholder="+852..." style={fieldStyle} />
                      </Label>
                      <Label>
                        Photo URL
                        <input value={selectedStaff.photo_url || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'photo_url', e.target.value)} placeholder="https://..." style={fieldStyle} />
                      </Label>
                    </div>
                    <Label>
                      Bio
                      <textarea value={selectedStaff.bio || ''} onChange={(e) => onUpdateField(selectedStaff.id, 'bio', e.target.value)} placeholder="Short intro for the team page." style={{ ...fieldStyle, minHeight: '100px', resize: 'vertical' }} />
                    </Label>
                  </div>

                  <div style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--gray)', background: 'linear-gradient(180deg, #FAF8F5, #fff)', display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#A68B6A' }}>Live summary</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>What this profile affects</div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                        <input type="checkbox" checked={Boolean(selectedStaff.enabled)} onChange={(e) => onUpdateField(selectedStaff.id, 'enabled', e.target.checked)} />
                        Enabled
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedStaff.services?.length || 0} services</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedShifts.length} overrides</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedBreaks.length} breaks</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedTimeOff.length} time off</span>
                      <span className="badge badge-outline" style={{ background: '#fff' }}>{selectedBlocked.length} blocks</span>
                    </div>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>Operational scope</div>
                        <span className="badge badge-outline" style={{ background: '#fff' }}>
                          {scopeSummary(providerScopeChips.length, 'link')}
                        </span>
                      </div>
                      <ChipRow
                        items={providerScopeChips}
                        emptyLabel="No location or provider group links wired yet"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>Assignable locations</div>
                          <span className="badge badge-outline" style={{ background: '#fff' }}>
                            {scopeSummary(selectedStaffLocationChips.length, 'location')}
                          </span>
                        </div>
                        <ChipRow items={selectedStaffLocationChips} emptyLabel={locations.length ? 'No location links selected' : 'Location lookup not provided'} />
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.06em' }}>Allowed provider groups</div>
                          <span className="badge badge-outline" style={{ background: '#fff' }}>
                            {scopeSummary(selectedStaffGroupChips.length, 'group')}
                          </span>
                        </div>
                        <ChipRow items={selectedStaffGroupChips} emptyLabel={providerGroups.length ? 'No provider group links selected' : 'Provider group lookup not provided'} />
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-light)' }}>
                      {locations.length || providerGroups.length
                        ? 'This profile reads live admin lookup props first, so availability and operator context stay aligned with the configured locations and provider groups.'
                        : 'Scope lookups are not available yet, so the profile falls back to staff record fields for backward compatibility.'}
                    </div>

                    <Label>
                      Daily break window
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="time" value={selectedStaff.break_start || '15:00'} onChange={(e) => onUpdateField(selectedStaff.id, 'break_start', e.target.value)} style={{ ...fieldStyle, width: '130px', padding: '8px 10px' }} />
                        <span style={{ fontWeight: 800, color: 'var(--text-light)' }}>to</span>
                        <input type="time" value={selectedStaff.break_end || '16:00'} onChange={(e) => onUpdateField(selectedStaff.id, 'break_end', e.target.value)} style={{ ...fieldStyle, width: '130px', padding: '8px 10px' }} />
                      </div>
                    </Label>
                  </div>
                </div>
              </Panel>

              <Panel title="Services" subtitle="Toggle the services this provider can handle." soft>
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

              <Panel title="Weekly timetable" subtitle="Set the recurring baseline hours for each weekday.">
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
                          <div style={{ fontSize: '14px', fontWeight: 800 }}>{off ? 'Day off' : 'Working'}</div>
                          <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.5, color: off ? '#B91C1C' : 'var(--text-light)' }}>
                            {off ? 'Closed' : schedule?.start ? `${schedule.start} - ${schedule.end}` : 'Tap to set'}
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
                          <span style={{ fontWeight: 800, color: 'var(--text-light)' }}>to</span>
                          <input type="time" value={schedule.end || '20:00'} onChange={(e) => onUpdateSchedule(selectedStaff.id, key, 'end', e.target.value)} style={{ ...fieldStyle, padding: '8px 10px', fontSize: '12px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Panel>

              <Panel
                title="Date overrides"
                subtitle="Use a calendar to flip a single date on or off without changing the weekly baseline."
                soft
                actions={
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setMonth((m) => (m === 0 ? (setYear((y) => y - 1), 11) : m - 1))} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                      Prev
                    </button>
                    <button type="button" onClick={() => setMonth((m) => (m === 11 ? (setYear((y) => y + 1), 0) : m + 1))} className="btn btn-small btn-interactive" style={{ background: '#fff' }}>
                      Next
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
              <Panel title="Recurring breaks" subtitle="Weekly break windows that always block availability." actions={<button type="button" onClick={() => setLocalBreaks((current) => [...current, { id: tempId(), staff_id: selectedStaffId, day_of_week: '1', start_time: '12:00', end_time: '13:00', label: 'Break', enabled: true }])} className="btn btn-small btn-interactive">+ Add</button>}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedBreaks.length === 0 ? (
                      <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-light)', background: '#FAF8F5', borderRadius: '12px' }}>No recurring breaks yet.</div>
                    ) : (
                      selectedBreaks.map((row) => (
                        <div key={row.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                              <select value={row.day_of_week} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, day_of_week: e.target.value } : item)))} style={fieldStyle}>
                                {DAYS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                              </select>
                              <input value={row.label || ''} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, label: e.target.value } : item)))} placeholder="Label" style={fieldStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                              <input type="time" value={row.start_time || ''} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, start_time: e.target.value } : item)))} style={fieldStyle} />
                              <input type="time" value={row.end_time || ''} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, end_time: e.target.value } : item)))} style={fieldStyle} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                                <input type="checkbox" checked={row.enabled !== false} onChange={(e) => setLocalBreaks((cur) => cur.map((item) => (item.id === row.id ? { ...item, enabled: e.target.checked } : item)))} />
                                Enabled
                              </label>
                            </div>
                            <button type="button" onClick={() => removeRow(setLocalBreaks, setDeletedBreakIds, row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', width: 'fit-content' }}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

              <Panel title="Time off" subtitle="Leave or one-off schedule gaps that override the timetable." actions={<button type="button" onClick={() => setLocalTimeOff((current) => [...current, { id: tempId(), staff_id: selectedStaffId, date: previewDate, start_time: '', end_time: '', is_all_day: true, reason: '' }])} className="btn btn-small btn-interactive">+ Add</button>}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {selectedTimeOff.length === 0 ? (
                      <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-light)', background: '#FAF8F5', borderRadius: '12px' }}>No time-off entries yet.</div>
                    ) : (
                      selectedTimeOff.map((row) => (
                        <div key={row.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <input type="date" value={row.date || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, date: e.target.value } : item)))} style={fieldStyle} />
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                                <input type="checkbox" checked={Boolean(row.is_all_day)} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, is_all_day: e.target.checked } : item)))} />
                                All day
                              </label>
                            </div>
                            {!row.is_all_day && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                                <input type="time" value={row.start_time || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, start_time: e.target.value } : item)))} style={fieldStyle} />
                                <input type="time" value={row.end_time || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, end_time: e.target.value } : item)))} style={fieldStyle} />
                              </div>
                            )}
                            <input type="text" value={row.reason || ''} onChange={(e) => setLocalTimeOff((cur) => cur.map((item) => (item.id === row.id ? { ...item, reason: e.target.value } : item)))} placeholder="Reason" style={fieldStyle} />
                            <button type="button" onClick={() => removeRow(setLocalTimeOff, setDeletedTimeOffIds, row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', width: 'fit-content' }}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>
              </div>

              <Panel title="Blocked slots" subtitle="Manual blocks for holidays, maintenance, or private appointments." actions={<button type="button" onClick={() => setLocalBlocked((current) => [...current, { id: tempId(), staff_id: selectedStaffId, date: previewDate, start_time: '15:00', end_time: '16:00', reason: '', source: 'manual' }])} className="btn btn-small btn-interactive">+ Add</button>}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedBlocked.length === 0 ? (
                    <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-light)', background: '#FAF8F5', borderRadius: '12px' }}>No blocked slots yet.</div>
                  ) : (
                    selectedBlocked.map((row) => (
                      <div key={row.id} className="admin-card" style={{ padding: '14px', border: '1px solid var(--gray)' }}>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                            <input type="date" value={row.date || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, date: e.target.value } : item)))} style={fieldStyle} />
                            <input type="time" value={row.start_time || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, start_time: e.target.value } : item)))} style={fieldStyle} />
                            <input type="time" value={row.end_time || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, end_time: e.target.value } : item)))} style={fieldStyle} />
                          </div>
                          <input type="text" value={row.reason || ''} onChange={(e) => setLocalBlocked((cur) => cur.map((item) => (item.id === row.id ? { ...item, reason: e.target.value } : item)))} placeholder="Reason" style={fieldStyle} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-outline" style={{ background: '#fff' }}>Source: {row.source || 'manual'}</span>
                            <button type="button" onClick={() => removeRow(setLocalBlocked, setDeletedBlockedIds, row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Live slot preview" subtitle="Confirm that the frontend slots reflect the current schedule." soft actions={<button type="button" onClick={loadAvailability} className="btn btn-small btn-interactive">Check availability</button>}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <Label>
                    Date
                    <input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} style={fieldStyle} />
                  </Label>
                  <Label>
                    Service
                    <select value={previewServiceId} onChange={(e) => setPreviewServiceId(Number(e.target.value))} style={fieldStyle}>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label>
                    Staff
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
                    <div style={{ color: 'var(--text-light)' }}>Loading availability...</div>
                  ) : previewError ? (
                    <div style={{ color: '#DC2626' }}>{previewError}</div>
                  ) : previewSlotMatrix.length ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="badge badge-outline" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#047857' }}>Available</span>
                        <span className="badge badge-outline" style={{ background: '#F3F4F6', borderColor: '#E5E7EB', color: '#6B7280' }}>Unavailable</span>
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
                    <div style={{ color: 'var(--text-light)' }}>Choose a date, service, and staff, then click Check availability.</div>
                  )}
                </div>
              </Panel>
            </div>
          ) : (
            <div className="admin-card" style={{ padding: '100px 40px', textAlign: 'center', color: 'var(--text-light)', border: '1px dashed var(--gray)', background: 'linear-gradient(180deg, #fff, #FAF8F5)' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>Select a staff member</div>
              <div style={{ fontSize: '14px', lineHeight: 1.7 }}>Manage profile, services, weekly hours, monthly overrides, breaks, time off, and blocked slots from one place.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

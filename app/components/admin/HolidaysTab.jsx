'use client'

import { useEffect, useState } from 'react'

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--gray)',
  background: '#fff',
  fontSize: '14px',
  color: 'var(--text)',
}

const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647
const normalizeDate = (value) => (value ? String(value).slice(0, 10) : '')
const getNameById = (rows = [], id) => {
  const row = rows.find((item) => String(item?.id) === String(id))
  return row?.name || row?.title || row?.label || row?.code || ''
}

const getTargetScopeLabel = (row, locations = [], providerGroups = [], staff = [], providerGroupsReady = true) => {
  const locationLabel = row?.location_id ? getNameById(locations, row.location_id) || `#${row.location_id}` : 'All locations'
  const providerGroupLabel = row?.provider_group_id
    ? getNameById(providerGroups, row.provider_group_id) || `#${row.provider_group_id}`
    : providerGroupsReady
      ? 'All provider groups'
      : 'Provider group unavailable'
  const staffLabel = row?.staff_id ? getNameById(staff, row.staff_id) || `#${row.staff_id}` : 'All staff'
  return `${locationLabel} / ${providerGroupLabel} / ${staffLabel}`
}

const normalizeRow = (row) => ({
  id: row?.id ?? tempId(),
  title: row?.title || '',
  holiday_date: normalizeDate(row?.holiday_date),
  end_date: normalizeDate(row?.end_date),
  location_id: row?.location_id ?? '',
  provider_group_id: row?.provider_group_id ?? '',
  staff_id: row?.staff_id ?? '',
  is_closed: row?.is_closed !== false,
  note: row?.note || '',
})

export default function HolidaysTab({
  holidays = [],
  locations = [],
  providerGroups = [],
  providerGroupsAvailable = true,
  staff = [],
  saveHolidays,
  saving = false,
  available = true,
}) {
  const [rows, setRows] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const providerGroupsReady = providerGroupsAvailable
  const providerGroupsUnavailable = !providerGroupsAvailable

  useEffect(() => {
    setRows((holidays || []).map(normalizeRow))
    setDeletedIds([])
  }, [holidays])

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setRows((current) =>
      [...current, normalizeRow({ title: '', holiday_date: '', location_id: '', provider_group_id: '', staff_id: '', is_closed: true, note: '' })],
    )
  }

  const removeRow = (id) => {
    setRows((current) => current.filter((row) => row.id !== id))
    if (isPersisted(id)) {
      setDeletedIds((current) => (current.includes(id) ? current : [...current, id]))
    }
  }

  if (!available) {
    return (
      <div className="admin-card" style={{ padding: '28px', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>Holidays table unavailable</div>
        <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.6 }}>
          Run the latest migration before using holiday scope targeting. This page stays read-only until the holiday lookup tables are available.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div className="admin-card" style={{ padding: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>OPERATIONS</div>
          <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>Holidays</h3>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-light)' }}>
            Create branch closures, provider-group scoped blackouts, staff leave days, and special operational blackout dates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            + Add holiday
          </button>
          <button
            type="button"
            onClick={() => saveHolidays?.({ rows, deletedIds })}
            disabled={saving}
            className="btn btn-small btn-interactive"
            style={{ minWidth: '120px' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {providerGroupsUnavailable && (
        <div className="admin-card" style={{ padding: '14px 16px', border: '1px solid #FCD34D', background: '#FFFBEB', color: '#92400E', fontSize: '13px', lineHeight: 1.6 }}>
          Provider groups are not loaded yet. Location and staff targeting still work, but provider-group targeting cannot be added or changed until the lookup table is available.
        </div>
      )}

      <div className="admin-card" style={{ display: 'grid', gap: '12px', padding: '20px' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>No holidays configured yet.</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gap: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>TARGETING</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{getTargetScopeLabel(row, locations, providerGroups, staff, providerGroupsReady)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-outline" style={{ background: '#fff' }}>
                    Location: {row.location_id ? getNameById(locations, row.location_id) || `#${row.location_id}` : 'All'}
                  </span>
                  <span className="badge badge-outline" style={{ background: '#fff' }}>
                    Provider group: {row.provider_group_id ? getNameById(providerGroups, row.provider_group_id) || `#${row.provider_group_id}` : providerGroupsReady ? 'All' : 'Unavailable'}
                  </span>
                  <span className="badge badge-outline" style={{ background: '#fff' }}>
                    Staff: {row.staff_id ? getNameById(staff, row.staff_id) || `#${row.staff_id}` : 'All'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr 1fr auto' }}>
                <input value={row.title} onChange={(e) => updateRow(row.id, { title: e.target.value })} placeholder="Holiday title" style={fieldStyle} />
                <input type="date" value={row.holiday_date} onChange={(e) => updateRow(row.id, { holiday_date: e.target.value })} style={fieldStyle} />
                <input type="date" value={row.end_date} onChange={(e) => updateRow(row.id, { end_date: e.target.value })} style={fieldStyle} />
                <select value={row.location_id} onChange={(e) => updateRow(row.id, { location_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle}>
                  <option value="">All locations</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <select
                  value={row.provider_group_id}
                  onChange={(e) => updateRow(row.id, { provider_group_id: e.target.value === '' ? '' : Number(e.target.value) })}
                  style={fieldStyle}
                  disabled={providerGroupsUnavailable}
                >
                  <option value="">{providerGroupsUnavailable ? 'Provider group unavailable' : 'All provider groups'}</option>
                  {providerGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name || group.title || group.label || group.code || `#${group.id}`}
                    </option>
                  ))}
                </select>
                <select value={row.staff_id} onChange={(e) => updateRow(row.id, { staff_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle}>
                  <option value="">All staff</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeRow(row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  Remove
                </button>
              </div>

              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '120px minmax(0, 1fr)', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <input type="checkbox" checked={row.is_closed !== false} onChange={(e) => updateRow(row.id, { is_closed: e.target.checked })} />
                  Closed
                </label>
                <input value={row.note} onChange={(e) => updateRow(row.id, { note: e.target.value })} placeholder="Internal note" style={fieldStyle} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

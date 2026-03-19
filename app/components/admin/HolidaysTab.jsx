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

const normalizeRow = (row) => ({
  id: row?.id ?? tempId(),
  title: row?.title || '',
  holiday_date: normalizeDate(row?.holiday_date),
  end_date: normalizeDate(row?.end_date),
  location_id: row?.location_id ?? '',
  staff_id: row?.staff_id ?? '',
  is_closed: row?.is_closed !== false,
  note: row?.note || '',
})

export default function HolidaysTab({ holidays = [], locations = [], staff = [], saveHolidays, saving = false, available = true }) {
  const [rows, setRows] = useState([])
  const [deletedIds, setDeletedIds] = useState([])

  useEffect(() => {
    setRows((holidays || []).map(normalizeRow))
    setDeletedIds([])
  }, [holidays])

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setRows((current) => [...current, normalizeRow({ title: '', holiday_date: '', location_id: '', staff_id: '', is_closed: true, note: '' })])
  }

  const removeRow = (id) => {
    setRows((current) => current.filter((row) => row.id !== id))
    if (isPersisted(id)) {
      setDeletedIds((current) => (current.includes(id) ? current : [...current, id]))
    }
  }

  if (!available) {
    return <div className="admin-card" style={{ padding: '28px', color: 'var(--text-light)' }}>Holidays table is not available yet. Run the latest migration to enable holiday rules.</div>
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div className="admin-card" style={{ padding: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>OPERATIONS</div>
          <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>Holidays</h3>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-light)' }}>Create branch closures, staff leave days, and special operational blackout dates.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            + Add holiday
          </button>
          <button type="button" onClick={() => saveHolidays?.({ rows, deletedIds })} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ display: 'grid', gap: '12px', padding: '20px' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>No holidays configured yet.</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr auto' }}>
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
                <select value={row.staff_id} onChange={(e) => updateRow(row.id, { staff_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle}>
                  <option value="">No staff limit</option>
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

              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '120px minmax(0, 1fr)' , marginTop: '12px'}}>
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

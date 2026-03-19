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

const normalizeRow = (row) => ({
  id: row?.id ?? tempId(),
  name: row?.name || '',
  type: row?.type || 'room',
  location_id: row?.location_id ?? '',
  capacity: Number(row?.capacity || 1),
  enabled: row?.enabled !== false,
  sort_order: Number(row?.sort_order || 0),
})

export default function ResourcesTab({ resources = [], locations = [], saveResources, saving = false, available = true }) {
  const [rows, setRows] = useState([])
  const [deletedIds, setDeletedIds] = useState([])

  useEffect(() => {
    setRows((resources || []).map(normalizeRow))
    setDeletedIds([])
  }, [resources])

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setRows((current) => [...current, normalizeRow({ name: '', type: 'room', location_id: '', capacity: 1, enabled: true, sort_order: current.length })])
  }

  const removeRow = (id) => {
    setRows((current) => current.filter((row) => row.id !== id))
    if (isPersisted(id)) {
      setDeletedIds((current) => (current.includes(id) ? current : [...current, id]))
    }
  }

  if (!available) {
    return <div className="admin-card" style={{ padding: '28px', color: 'var(--text-light)' }}>Resources table is not available yet. Run the latest migration to manage rooms, seats, and equipment.</div>
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div className="admin-card" style={{ padding: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>OPERATIONS</div>
          <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>Resources</h3>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-light)' }}>Track treatment rooms, seats, devices, or other inventory that can block booking capacity.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            + Add resource
          </button>
          <button type="button" onClick={() => saveResources?.({ rows, deletedIds })} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Capacity</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Sort</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Enabled</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '52px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No resources yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="admin-table-row" style={{ borderBottom: '1px solid #f6f6f6' }}>
                    <td style={{ padding: '12px' }}><input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px' }}>
                      <select value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value })} style={fieldStyle}>
                        <option value="room">Room</option>
                        <option value="seat">Seat</option>
                        <option value="device">Device</option>
                        <option value="bed">Bed</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select value={row.location_id} onChange={(e) => updateRow(row.id, { location_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle}>
                        <option value="">No location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px', width: '110px' }}><input type="number" min="1" value={row.capacity} onChange={(e) => updateRow(row.id, { capacity: Number(e.target.value || 1) })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px', width: '90px' }}><input type="number" value={row.sort_order} onChange={(e) => updateRow(row.id, { sort_order: Number(e.target.value || 0) })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px', textAlign: 'center' }}><input type="checkbox" checked={row.enabled !== false} onChange={(e) => updateRow(row.id, { enabled: e.target.checked })} /></td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeRow(row.id)} className="btn btn-small btn-interactive" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

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
  code: row?.code || '',
  address: row?.address || '',
  contact_phone: row?.contact_phone || '',
  timezone: row?.timezone || 'Asia/Hong_Kong',
  enabled: row?.enabled !== false,
  sort_order: Number(row?.sort_order || 0),
})

export default function LocationsTab({ locations = [], saveLocations, saving = false, available = true }) {
  const [rows, setRows] = useState([])
  const [deletedIds, setDeletedIds] = useState([])

  useEffect(() => {
    setRows((locations || []).map(normalizeRow))
    setDeletedIds([])
  }, [locations])

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    setRows((current) => [
      ...current,
      normalizeRow({
        name: '',
        code: '',
        address: '',
        contact_phone: '',
        enabled: true,
        sort_order: current.length,
      }),
    ])
  }

  const removeRow = (id) => {
    setRows((current) => current.filter((row) => row.id !== id))
    if (isPersisted(id)) {
      setDeletedIds((current) => (current.includes(id) ? current : [...current, id]))
    }
  }

  if (!available) {
    return <div className="admin-card" style={{ padding: '28px', color: 'var(--text-light)' }}>Locations table is not available yet. Run the latest migration to enable multi-location operations.</div>
  }

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div className="admin-card" style={{ padding: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>OPERATIONS</div>
          <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>Locations</h3>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-light)' }}>Manage salon branches, booking availability scope, and branch contact details.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            + Add location
          </button>
          <button type="button" onClick={() => saveLocations?.({ rows, deletedIds })} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Code</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Address</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Phone</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Timezone</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Sort</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Enabled</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '52px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No locations yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="admin-table-row" style={{ borderBottom: '1px solid #f6f6f6' }}>
                    <td style={{ padding: '12px' }}><input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px' }}><input value={row.code} onChange={(e) => updateRow(row.id, { code: e.target.value })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px' }}><input value={row.address} onChange={(e) => updateRow(row.id, { address: e.target.value })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px' }}><input value={row.contact_phone} onChange={(e) => updateRow(row.id, { contact_phone: e.target.value })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px' }}><input value={row.timezone} onChange={(e) => updateRow(row.id, { timezone: e.target.value })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px', width: '90px' }}><input type="number" value={row.sort_order} onChange={(e) => updateRow(row.id, { sort_order: Number(e.target.value || 0) })} style={fieldStyle} /></td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input type="checkbox" checked={row.enabled !== false} onChange={(e) => updateRow(row.id, { enabled: e.target.checked })} />
                    </td>
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

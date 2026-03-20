'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'
import { fieldStyle } from './opsUi'

const RESOURCE_TYPES = [
  { value: 'room', label: '房間' },
  { value: 'seat', label: '座位' },
  { value: 'device', label: '設備' },
  { value: 'bed', label: '床位' },
  { value: 'other', label: '其他' },
]

const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647
const lookupLocationName = (locations, id) => locations.find((row) => String(row.id) === String(id))?.name || '未指定地點'

const normalizeResource = (row, fallbackSortOrder = 0) => ({
  id: row?.id ?? tempId(),
  name: row?.name || '',
  type: row?.type || 'room',
  location_id: row?.location_id ?? '',
  capacity: Number(row?.capacity || 1),
  enabled: row?.enabled !== false,
  sort_order: Number(row?.sort_order ?? fallbackSortOrder),
  __isNew: Boolean(row?.__isNew),
})

const listItemStyle = (selected) => ({
  width: '100%',
  textAlign: 'left',
  padding: '14px 16px',
  borderRadius: '14px',
  border: `1px solid ${selected ? 'rgba(166, 139, 106, 0.45)' : '#EEE7DE'}`,
  background: selected ? 'linear-gradient(180deg, #fff, #FBF8F4)' : '#fff',
  cursor: 'pointer',
  display: 'grid',
  gap: '6px',
})

export default function ResourcesTab({ resources = [], locations = [], saveResources, saving = false, available = true }) {
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [deletedIds, setDeletedIds] = useState([])

  useEffect(() => {
    const nextRows = (resources || []).map((row, index) => normalizeResource(row, index))
    setRows(nextRows)
    setDeletedIds([])
    setSelectedId((current) => current ?? nextRows[0]?.id ?? null)
  }, [resources])

  const visibleRows = useMemo(
    () => [...rows].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [rows]
  )
  const selectedRow = useMemo(
    () => visibleRows.find((row) => String(row.id) === String(selectedId)) || null,
    [selectedId, visibleRows]
  )

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => (String(row.id) === String(id) ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    const draft = normalizeResource({ __isNew: true }, rows.length)
    setRows((current) => [draft, ...current])
    setSelectedId(draft.id)
  }

  const removeRow = (id) => {
    const target = rows.find((row) => String(row.id) === String(id))
    setRows((current) => current.filter((row) => String(row.id) !== String(id)))
    if (isPersisted(target?.id)) {
      setDeletedIds((current) => (current.includes(target.id) ? current : [...current, target.id]))
    }
    setSelectedId((current) => (String(current) === String(id) ? null : current))
  }

  if (!available) {
    return <EmptyState title="資源資料表未啟用" description="請先套用最新 migration，才可管理房間、座位與設備容量。" />
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '20px 22px',
          background: 'linear-gradient(135deg, #fff, #FBF8F4)',
          border: '1px solid rgba(166, 139, 106, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>資源設定</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>列表管理房間、座位與設備</div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.6 }}>
            用列表挑選資源，再在右邊修改類型、容量、地點與啟用狀態。
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone="accent">{visibleRows.length} 個資源</StatusPill>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            新增資源
          </button>
          <button type="button" onClick={() => saveResources?.({ rows, deletedIds })} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
            {saving ? '儲存中…' : '儲存目前清單'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <AdminSection eyebrow="資源列表" title="選擇要編輯的資源" description="列表只保留摘要，方便快速瀏覽容量與地點。">
          <div style={{ display: 'grid', gap: '12px' }}>
            {visibleRows.length === 0 ? (
              <EmptyState title="尚未建立資源" description="按右上角「新增資源」建立第一個房間、座位或設備。" />
            ) : (
              visibleRows.map((row) => {
                const selected = String(row.id) === String(selectedId)
                const typeLabel = RESOURCE_TYPES.find((item) => item.value === row.type)?.label || row.type
                return (
                  <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} style={listItemStyle(selected)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{row.name || '未命名資源'}</div>
                      <StatusPill tone={row.enabled !== false ? 'success' : 'warning'}>{row.enabled !== false ? '啟用中' : '已停用'}</StatusPill>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{typeLabel} · 容量 {row.capacity || 1}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{lookupLocationName(locations, row.location_id)}</div>
                  </button>
                )
              })
            )}
          </div>
        </AdminSection>

        <AdminSection
          eyebrow="資源編輯"
          title={selectedRow ? `編輯：${selectedRow.name || '未命名資源'}` : '請先選擇資源'}
          description="儲存時只更新資源 lane，不會影響其他設定頁。"
          actions={
            selectedRow ? (
              <button
                type="button"
                onClick={() => removeRow(selectedRow.id)}
                className="btn btn-small btn-interactive"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                刪除此資源
              </button>
            ) : null
          }
        >
          {!selectedRow ? (
            <EmptyState title="未選擇資源" description="從左側列表選擇資源，或新增資源開始編輯。" />
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>資源名稱</span>
                  <input value={selectedRow.name} onChange={(event) => updateRow(selectedRow.id, { name: event.target.value })} style={fieldStyle} placeholder="例如：A 房 / 洗頭床 1" />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>資源類型</span>
                  <select value={selectedRow.type} onChange={(event) => updateRow(selectedRow.id, { type: event.target.value })} style={fieldStyle}>
                    {RESOURCE_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>所屬地點</span>
                  <select value={selectedRow.location_id} onChange={(event) => updateRow(selectedRow.id, { location_id: event.target.value === '' ? '' : Number(event.target.value) })} style={fieldStyle}>
                    <option value="">未指定地點</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>容量</span>
                  <input type="number" min="1" value={selectedRow.capacity} onChange={(event) => updateRow(selectedRow.id, { capacity: Number(event.target.value || 1) })} style={fieldStyle} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '220px 220px', gap: '14px', alignItems: 'start' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>排序</span>
                  <input type="number" value={selectedRow.sort_order} onChange={(event) => updateRow(selectedRow.id, { sort_order: Number(event.target.value || 0) })} style={fieldStyle} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '30px', fontSize: '13px', fontWeight: 800 }}>
                  <input type="checkbox" checked={selectedRow.enabled !== false} onChange={(event) => updateRow(selectedRow.id, { enabled: event.target.checked })} />
                  啟用這個資源
                </label>
              </div>
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  )
}

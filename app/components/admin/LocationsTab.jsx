'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'
import { fieldStyle } from './opsUi'

const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647

const normalizeLocation = (row, fallbackSortOrder = 0) => ({
  id: row?.id ?? tempId(),
  name: row?.name || '',
  code: row?.code || '',
  address: row?.address || '',
  contact_phone: row?.contact_phone || '',
  timezone: row?.timezone || 'Asia/Hong_Kong',
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

export default function LocationsTab({ locations = [], saveLocations, saving = false, available = true }) {
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [deletedIds, setDeletedIds] = useState([])

  useEffect(() => {
    const nextRows = (locations || []).map((row, index) => normalizeLocation(row, index))
    setRows(nextRows)
    setDeletedIds([])
    setSelectedId((current) => current ?? nextRows[0]?.id ?? null)
  }, [locations])

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
    const draft = normalizeLocation({ __isNew: true }, rows.length)
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
    return <EmptyState title="地點資料表未啟用" description="請先套用最新 migration，才可管理多地點營運設定。" />
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
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>地點設定</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>列表管理門店與聯絡資料</div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.6 }}>
            先從列表選擇門店，再在右側修改地址、電話、時區與啟用狀態。
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone="accent">{visibleRows.length} 個地點</StatusPill>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            新增地點
          </button>
          <button type="button" onClick={() => saveLocations?.({ rows, deletedIds })} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
            {saving ? '儲存中…' : '儲存目前清單'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <AdminSection
          eyebrow="地點列表"
          title="選擇要編輯的地點"
          description="列表只顯示重點摘要，避免整頁同時打開多個表單。"
        >
          <div style={{ display: 'grid', gap: '12px' }}>
            {visibleRows.length === 0 ? (
              <EmptyState title="尚未建立地點" description="按右上角「新增地點」建立第一個門店。" />
            ) : (
              visibleRows.map((row) => {
                const selected = String(row.id) === String(selectedId)
                return (
                  <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} style={listItemStyle(selected)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{row.name || '未命名地點'}</div>
                      <StatusPill tone={row.enabled !== false ? 'success' : 'warning'}>{row.enabled !== false ? '啟用中' : '已停用'}</StatusPill>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{row.code || '未設定代碼'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.5 }}>{row.address || '未設定地址'}</div>
                  </button>
                )
              })
            )}
          </div>
        </AdminSection>

        <AdminSection
          eyebrow="地點編輯"
          title={selectedRow ? `編輯：${selectedRow.name || '未命名地點'}` : '請先選擇地點'}
          description="儲存時只會更新這個設定 lane，不會重新載入整個後台。"
          actions={
            selectedRow ? (
              <button
                type="button"
                onClick={() => removeRow(selectedRow.id)}
                className="btn btn-small btn-interactive"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                刪除此地點
              </button>
            ) : null
          }
        >
          {!selectedRow ? (
            <EmptyState title="未選擇地點" description="從左側列表選擇一個地點，或新增地點開始編輯。" />
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>地點名稱</span>
                  <input value={selectedRow.name} onChange={(event) => updateRow(selectedRow.id, { name: event.target.value })} style={fieldStyle} placeholder="例如：尖沙咀店" />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>地點代碼</span>
                  <input value={selectedRow.code} onChange={(event) => updateRow(selectedRow.id, { code: event.target.value })} style={fieldStyle} placeholder="例如：TSM" />
                </label>
              </div>

              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>地址</span>
                <input value={selectedRow.address} onChange={(event) => updateRow(selectedRow.id, { address: event.target.value })} style={fieldStyle} placeholder="完整地址" />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>聯絡電話</span>
                  <input value={selectedRow.contact_phone} onChange={(event) => updateRow(selectedRow.id, { contact_phone: event.target.value })} style={fieldStyle} placeholder="+852 1234 5678" />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>時區</span>
                  <input value={selectedRow.timezone} onChange={(event) => updateRow(selectedRow.id, { timezone: event.target.value })} style={fieldStyle} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '220px 220px', gap: '14px', alignItems: 'start' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>排序</span>
                  <input type="number" value={selectedRow.sort_order} onChange={(event) => updateRow(selectedRow.id, { sort_order: Number(event.target.value || 0) })} style={fieldStyle} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '30px', fontSize: '13px', fontWeight: 800 }}>
                  <input type="checkbox" checked={selectedRow.enabled !== false} onChange={(event) => updateRow(selectedRow.id, { enabled: event.target.checked })} />
                  啟用這個地點
                </label>
              </div>
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  )
}

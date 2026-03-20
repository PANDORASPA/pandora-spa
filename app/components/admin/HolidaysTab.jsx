'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'
import { fieldStyle } from './opsUi'

const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647
const normalizeDate = (value) => (value ? String(value).slice(0, 10) : '')

const getNameById = (rows = [], id) => rows.find((row) => String(row?.id) === String(id))?.name || rows.find((row) => String(row?.id) === String(id))?.title || ''

const normalizeHoliday = (row) => ({
  id: row?.id ?? tempId(),
  title: row?.title || '',
  holiday_date: normalizeDate(row?.holiday_date),
  end_date: normalizeDate(row?.end_date),
  location_id: row?.location_id ?? '',
  provider_group_id: row?.provider_group_id ?? '',
  staff_id: row?.staff_id ?? '',
  is_closed: row?.is_closed !== false,
  note: row?.note || '',
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

const scopeLabel = (row, { locations, providerGroups, staff, providerGroupsAvailable }) => {
  const locationText = row?.location_id ? getNameById(locations, row.location_id) || `#${row.location_id}` : '所有地點'
  const providerGroupText = row?.provider_group_id
    ? getNameById(providerGroups, row.provider_group_id) || `#${row.provider_group_id}`
    : providerGroupsAvailable
      ? '所有服務群組'
      : '服務群組未啟用'
  const staffText = row?.staff_id ? getNameById(staff, row.staff_id) || `#${row.staff_id}` : '所有服務供應者'
  return `${locationText} / ${providerGroupText} / ${staffText}`
}

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
  const [selectedId, setSelectedId] = useState(null)
  const [deletedIds, setDeletedIds] = useState([])

  useEffect(() => {
    const nextRows = (holidays || []).map(normalizeHoliday)
    setRows(nextRows)
    setDeletedIds([])
    setSelectedId((current) => current ?? nextRows[0]?.id ?? null)
  }, [holidays])

  const visibleRows = useMemo(
    () => [...rows].sort((a, b) => String(a.holiday_date || '').localeCompare(String(b.holiday_date || ''))),
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
    const draft = normalizeHoliday({ __isNew: true, is_closed: true })
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
    return <EmptyState title="假期資料表未啟用" description="請先套用最新 migration，才可管理假期與封店日。" />
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
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>假期設定</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>列表管理封店日與範圍假期</div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.6 }}>
            先從列表選擇假期，再在右側調整日期、地點、服務群組與服務供應者範圍。
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone="accent">{visibleRows.length} 個假期設定</StatusPill>
          <button type="button" onClick={addRow} className="btn btn-small btn-interactive">
            新增假期
          </button>
          <button type="button" onClick={() => saveHolidays?.({ rows, deletedIds })} disabled={saving} className="btn btn-small btn-interactive" style={{ minWidth: '120px' }}>
            {saving ? '儲存中…' : '儲存目前清單'}
          </button>
        </div>
      </div>

      {!providerGroupsAvailable && (
        <div className="admin-card" style={{ padding: '14px 16px', border: '1px solid #FCD34D', background: '#FFFBEB', color: '#92400E', fontSize: '13px', lineHeight: 1.6 }}>
          服務群組資料表尚未啟用，目前仍可設定全店、地點與個別服務供應者的假期範圍。
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <AdminSection eyebrow="假期列表" title="選擇要編輯的假期" description="列表先顯示日期與適用範圍，避免同時打開太多卡片。">
          <div style={{ display: 'grid', gap: '12px' }}>
            {visibleRows.length === 0 ? (
              <EmptyState title="尚未建立假期" description="按右上角「新增假期」建立封店日或指定範圍假期。" />
            ) : (
              visibleRows.map((row) => {
                const selected = String(row.id) === String(selectedId)
                return (
                  <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} style={listItemStyle(selected)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{row.title || '未命名假期'}</div>
                      <StatusPill tone={row.is_closed !== false ? 'warning' : 'neutral'}>{row.is_closed !== false ? '封店' : '提醒'}</StatusPill>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      {row.holiday_date || '未設定開始日期'}
                      {row.end_date ? ` 至 ${row.end_date}` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.5 }}>{scopeLabel(row, { locations, providerGroups, staff, providerGroupsAvailable })}</div>
                  </button>
                )
              })
            )}
          </div>
        </AdminSection>

        <AdminSection
          eyebrow="假期編輯"
          title={selectedRow ? `編輯：${selectedRow.title || '未命名假期'}` : '請先選擇假期'}
          description="這些設定會直接影響前台可預約日期與排班預覽。"
          actions={
            selectedRow ? (
              <button
                type="button"
                onClick={() => removeRow(selectedRow.id)}
                className="btn btn-small btn-interactive"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                刪除此假期
              </button>
            ) : null
          }
        >
          {!selectedRow ? (
            <EmptyState title="未選擇假期" description="從左側列表選擇一個假期，或新增假期開始編輯。" />
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>假期名稱</span>
                <input value={selectedRow.title} onChange={(event) => updateRow(selectedRow.id, { title: event.target.value })} style={fieldStyle} placeholder="例如：復活節 / 店內活動" />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>開始日期</span>
                  <input type="date" value={selectedRow.holiday_date} onChange={(event) => updateRow(selectedRow.id, { holiday_date: event.target.value })} style={fieldStyle} />
                </label>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>結束日期</span>
                  <input type="date" value={selectedRow.end_date} onChange={(event) => updateRow(selectedRow.id, { end_date: event.target.value })} style={fieldStyle} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>適用地點</span>
                  <select value={selectedRow.location_id} onChange={(event) => updateRow(selectedRow.id, { location_id: event.target.value === '' ? '' : Number(event.target.value) })} style={fieldStyle}>
                    <option value="">所有地點</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>服務群組</span>
                  <select
                    value={selectedRow.provider_group_id}
                    onChange={(event) => updateRow(selectedRow.id, { provider_group_id: event.target.value === '' ? '' : Number(event.target.value) })}
                    style={fieldStyle}
                    disabled={!providerGroupsAvailable}
                  >
                    <option value="">{providerGroupsAvailable ? '所有服務群組' : '服務群組未啟用'}</option>
                    {providerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || group.title || `#${group.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>服務供應者</span>
                  <select value={selectedRow.staff_id} onChange={(event) => updateRow(selectedRow.id, { staff_id: event.target.value === '' ? '' : Number(event.target.value) })} style={fieldStyle}>
                    <option value="">所有服務供應者</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.full_name || `#${member.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>內部備註</span>
                <input value={selectedRow.note} onChange={(event) => updateRow(selectedRow.id, { note: event.target.value })} style={fieldStyle} placeholder="例如：復活節加開半天 / 只適用某組服務供應者" />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 800 }}>
                <input type="checkbox" checked={selectedRow.is_closed !== false} onChange={(event) => updateRow(selectedRow.id, { is_closed: event.target.checked })} />
                視作封店 / 全不可約
              </label>
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  )
}

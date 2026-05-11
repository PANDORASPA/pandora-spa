'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { EmptyState, Pill, RecordFilterBar, fieldStyle } from './opsUi'

const TAB_META = {
  products: { label: '產品', addLabel: '新增產品', table: 'products' },
  packages: { label: '展示套票', addLabel: '新增展示套票', table: 'service_packages' },
  tickets: { label: '會員套票', addLabel: '新增會員套票', table: 'tickets' },
}

const normalizeItem = (item) => ({
  ...item,
  __isNew: Boolean(item?.__isNew),
  __deleted: Boolean(item?.__deleted),
})

const normalizeTicketItem = (item) => ({
  ...normalizeItem(item),
  times: Number(item?.times ?? item?.count ?? 0),
  orig: Number(item?.orig ?? item?.price ?? 0),
  features: item?.features || '',
  emoji: item?.emoji || 'SP',
})

const stripTransientFields = (item) => {
  const payload = { ...item }
  delete payload.__isNew
  delete payload.__deleted
  return payload
}

const normalizeImportMessage = (message) => {
  if (typeof message === 'string') return message
  if (!message || typeof message !== 'object') return ''
  const row = message.row || message.line || message.rowNumber
  const text = message.message || message.error || message.warning || message.detail || JSON.stringify(message)
  return row ? `第 ${row} 行：${text}` : text
}

const normalizeImportResult = (result = {}) => {
  const data = result.data || result
  const rows = data.rows || data.preview || data.records || data.validRows || []
  const rowErrors = rows.flatMap((row) => (row?.errors || []).map((message) => ({ row: row.rowNumber, message })))
  const rowWarnings = rows.flatMap((row) => (row?.warnings || []).map((message) => ({ row: row.rowNumber, message })))
  return {
    previewId: data.previewId || data.preview_id || data.importId || data.import_id || data.token || '',
    rows,
    errors: [...(data.errors || data.rowErrors || []), ...rowErrors].map(normalizeImportMessage).filter(Boolean),
    warnings: [...(data.warnings || data.rowWarnings || []), ...rowWarnings].map(normalizeImportMessage).filter(Boolean),
    summary: data.summary || data.stats || null,
  }
}

export default function InventoryTab({ products: initialProducts, packages: initialPackages, tickets: initialTickets, fetchData, saveInventory }) {
  const [products, setProducts] = useState(() => (initialProducts || []).map(normalizeItem))
  const [packagesState, setPackagesState] = useState(() => (initialPackages || []).map(normalizeItem))
  const [ticketsState, setTicketsState] = useState(() => (initialTickets || []).map(normalizeTicketItem))
  const [subTab, setSubTab] = useState('products')
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [ticketCsv, setTicketCsv] = useState('')
  const [ticketImportPreview, setTicketImportPreview] = useState(null)
  const [ticketImportLoading, setTicketImportLoading] = useState(false)
  const [ticketImportCommitting, setTicketImportCommitting] = useState(false)

  useEffect(() => setProducts((initialProducts || []).map(normalizeItem)), [initialProducts])
  useEffect(() => setPackagesState((initialPackages || []).map(normalizeItem)), [initialPackages])
  useEffect(() => setTicketsState((initialTickets || []).map(normalizeTicketItem)), [initialTickets])

  const getStateForKind = (kind) => {
    if (kind === 'packages') return [packagesState, setPackagesState]
    if (kind === 'tickets') return [ticketsState, setTicketsState]
    return [products, setProducts]
  }

  const createItemForKind = (kind) => {
    const id = Date.now()
    if (kind === 'packages') return { id, name: '新展示套票', price: 0, description: '', enabled: true, __isNew: true, __deleted: false }
    if (kind === 'tickets') return { id, name: '新會員套票', price: 0, times: 10, orig: 0, features: '', emoji: 'SP', enabled: true, __isNew: true, __deleted: false }
    return { id, name: '新產品', price: 0, stock: 0, enabled: true, __isNew: true, __deleted: false }
  }

  const allRows = { products, packages: packagesState, tickets: ticketsState }
  const [activeRows] = getStateForKind(subTab)
  const filteredRows = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    return (activeRows || []).filter((item) => {
      const haystack = [item.name, item.description, item.features, item.price, item.stock, item.times].filter(Boolean).join(' ').toLowerCase()
      return !needle || haystack.includes(needle)
    })
  }, [activeRows, searchTerm])

  const summary = useMemo(() => {
    const rows = allRows[subTab] || []
    return {
      total: rows.length,
      enabled: rows.filter((item) => item.enabled && !item.__deleted).length,
      pendingDelete: rows.filter((item) => item.__deleted).length,
    }
  }, [allRows, subTab])

  const updateItem = (kind, id, updater) => {
    const [, setState] = getStateForKind(kind)
    setState((current) => current.map((item) => (item.id === id ? updater(item) : item)))
  }

  const addItem = (kind) => {
    const [, setState] = getStateForKind(kind)
    setState((current) => [createItemForKind(kind), ...current])
  }

  const toggleDelete = (kind, id) => {
    const [, setState] = getStateForKind(kind)
    setState((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item
          if (item.__isNew) return null
          return { ...item, __deleted: !item.__deleted }
        })
        .filter(Boolean),
    )
  }

  const persistCollection = async (kind, items) => {
    const activeItems = items.filter((item) => !item.__deleted)
    const deletedIds = items.filter((item) => item.__deleted && !item.__isNew).map((item) => item.id)

    if (saveInventory) {
      await saveInventory({ kind, items: activeItems.map(stripTransientFields), deletedIds })
      return
    }

    const table = TAB_META[kind]?.table
    if (!table) throw new Error('Unknown inventory kind')

    for (const item of activeItems) {
      const payload = stripTransientFields(item)
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      const { error } = await supabase.from(table).upsert(payload)
      if (error) throw error
    }

    if (deletedIds.length > 0) {
      const { error } = await supabase.from(table).delete().in('id', deletedIds)
      if (error) throw error
    }

    if (fetchData) await fetchData()
  }

  const handleSave = async (kind) => {
    const [state] = getStateForKind(kind)
    setSaving(true)
    try {
      await persistCollection(kind, state)
      toast.success('已儲存變更')
    } catch (error) {
      toast.error(`儲存失敗：${error?.message || '未知錯誤'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTicketImportPreview = async () => {
    const csvText = ticketCsv.trim()
    if (!csvText) {
      toast.error('請先貼上 CSV 內容')
      return
    }

    setTicketImportLoading(true)
    try {
      const response = await fetch('/api/admin/tickets/import-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, csv: csvText }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || result?.message || '預覽失敗')
      const normalized = normalizeImportResult(result)
      setTicketImportPreview(normalized)
      if (normalized.errors.length > 0) toast.error('CSV 預覽有錯誤')
      else toast.success('CSV 預覽完成')
    } catch (error) {
      toast.error(error?.message || 'CSV 預覽失敗')
    } finally {
      setTicketImportLoading(false)
    }
  }

  const handleTicketImportCommit = async () => {
    if (!ticketImportPreview || ticketImportPreview.errors.length > 0) return

    setTicketImportCommitting(true)
    try {
      const csvText = ticketCsv.trim()
      const response = await fetch('/api/admin/tickets/import-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, csv: csvText, previewId: ticketImportPreview.previewId, importId: ticketImportPreview.previewId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || result?.message || '匯入失敗')
      toast.success('套票 CSV 已匯入')
      setTicketCsv('')
      setTicketImportPreview(null)
      if (fetchData) await fetchData()
    } catch (error) {
      toast.error(error?.message || '套票 CSV 匯入失敗')
    } finally {
      setTicketImportCommitting(false)
    }
  }

  return (
    <div className="admin-page-stack">
      <div className="admin-card admin-command-panel">
        <div>
          <div className="admin-eyebrow">庫存 / 套票</div>
          <div className="admin-command-title">產品、展示套票與會員套票</div>
          <div className="admin-command-description">以同一套後台工作台管理可售產品、前台展示套票，以及可購買/發放的會員套票。</div>
        </div>
        <div className="admin-inline-actions">
          <Pill>{summary.total} 筆</Pill>
          <Pill tone="success">{summary.enabled} 啟用</Pill>
          {summary.pendingDelete ? <Pill tone="danger">{summary.pendingDelete} 待刪除</Pill> : null}
        </div>
      </div>

      <div className="admin-card admin-subnav">
        {Object.entries(TAB_META).map(([key, meta]) => (
          <button key={key} onClick={() => setSubTab(key)} className={`admin-subnav-button ${subTab === key ? 'active' : ''}`} type="button">
            {meta.label}
            <span>{(allRows[key] || []).length}</span>
          </button>
        ))}
      </div>

      <RecordFilterBar columns="minmax(220px, 1fr) auto auto">
        <input type="text" placeholder="搜尋名稱、描述、價錢..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={fieldStyle} />
        <button onClick={() => addItem(subTab)} className="btn btn-small btn-interactive" type="button">
          {TAB_META[subTab].addLabel}
        </button>
        <button onClick={() => handleSave(subTab)} disabled={saving} className="btn btn-small btn-interactive" type="button" style={{ background: '#34D399' }}>
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </RecordFilterBar>

      {subTab === 'tickets' ? (
        <TicketImportPanel
          ticketCsv={ticketCsv}
          setTicketCsv={(value) => {
            setTicketCsv(value)
            setTicketImportPreview(null)
          }}
          preview={ticketImportPreview}
          loading={ticketImportLoading}
          committing={ticketImportCommitting}
          onPreview={handleTicketImportPreview}
          onCommit={handleTicketImportCommit}
        />
      ) : null}

      {filteredRows.length === 0 ? (
        <EmptyState title="暫時沒有資料" description="請新增項目，或放寬搜尋條件。" />
      ) : (
        <div className="admin-inventory-grid">
          {filteredRows.map((item) => (
            <InventoryCard key={item.id} kind={subTab} item={item} updateItem={updateItem} toggleDelete={toggleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function InventoryCard({ kind, item, updateItem, toggleDelete }) {
  const deleted = Boolean(item.__deleted)
  return (
    <div className="admin-card admin-inventory-card" style={{ opacity: deleted ? 0.55 : 1, border: deleted ? '1px dashed #dc2626' : undefined }}>
      <div className="admin-inline-actions" style={{ justifyContent: 'space-between' }}>
        <Pill tone={deleted ? 'danger' : item.enabled ? 'success' : 'muted'}>{deleted ? '待刪除' : item.enabled ? '啟用中' : '已隱藏'}</Pill>
        {item.__isNew ? <Pill>新草稿</Pill> : null}
      </div>
      <div className="admin-form-grid compact">
        <Field label={kind === 'products' ? '產品名稱' : kind === 'packages' ? '展示套票名稱' : '套票名稱'} value={item.name || ''} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, name: value }))} />
        <Field label="價格 ($)" type="number" value={item.price || 0} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, price: parseInt(value, 10) || 0 }))} />
        {kind === 'products' ? (
          <Field label="庫存" type="number" value={item.stock || 0} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, stock: parseInt(value, 10) || 0 }))} />
        ) : null}
        {kind === 'tickets' ? (
          <>
            <Field label="可用次數" type="number" value={item.times || 0} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, times: parseInt(value, 10) || 0 }))} />
            <Field label="原價 ($)" type="number" value={item.orig || 0} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, orig: parseInt(value, 10) || 0 }))} />
            <Field label="圖示文字" value={item.emoji || ''} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, emoji: value }))} />
          </>
        ) : null}
      </div>
      {kind !== 'products' ? (
        <TextArea label={kind === 'tickets' ? '套票特色 / 條款' : '描述'} value={kind === 'tickets' ? item.features || '' : item.description || ''} disabled={deleted} onChange={(value) => updateItem(kind, item.id, (row) => ({ ...row, [kind === 'tickets' ? 'features' : 'description']: value }))} />
      ) : null}
      <div className="admin-detail-actions">
        <label className="admin-inline-actions" style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>
          <input type="checkbox" checked={Boolean(item.enabled)} onChange={(event) => updateItem(kind, item.id, (current) => ({ ...current, enabled: event.target.checked }))} style={{ width: 'auto' }} disabled={deleted} />
          啟用
        </label>
        <button onClick={() => toggleDelete(kind, item.id)} className="btn btn-small btn-interactive" type="button" style={{ background: deleted ? '#ECFDF5' : '#FEF2F2', color: deleted ? '#166534' : '#DC2626', border: deleted ? '1px solid #BBF7D0' : '1px solid #FECACA' }}>
          {deleted ? '還原' : '刪除'}
        </button>
      </div>
      {deleted ? <div className="admin-muted-line" style={{ color: '#B91C1C', fontWeight: 800 }}>儲存後會刪除此項目。</div> : null}
    </div>
  )
}

function TicketImportPanel({ ticketCsv, setTicketCsv, preview, loading, committing, onPreview, onCommit }) {
  return (
    <div className="admin-card admin-command-panel" style={{ alignItems: 'stretch' }}>
      <div style={{ flex: '1 1 420px' }}>
        <div className="admin-eyebrow">CSV 匯入</div>
        <div className="admin-command-title">舊會員套票餘額</div>
        <div className="admin-command-description">貼上 CSV 後先預覽錯誤，再確認匯入。固定欄位：email, phone, full_name, ticket_name, service_name, remaining_count, expiry_date, note。</div>
        <textarea
          value={ticketCsv}
          onChange={(event) => setTicketCsv(event.target.value)}
          placeholder={'email,phone,full_name,ticket_name,service_name,remaining_count,expiry_date,note\ncustomer@example.com,91234567,陳小姐,頭皮護理套票,深層頭皮潔淨,10,2027-04-29,BANK-001'}
          style={{ ...fieldStyle, minHeight: '140px', resize: 'vertical', marginTop: '14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
        />
      </div>
      <div style={{ flex: '0 1 320px', display: 'grid', gap: '12px', alignContent: 'start' }}>
        <button onClick={onPreview} disabled={loading || committing} className="btn btn-small btn-interactive" type="button" style={{ background: '#fff' }}>
          {loading ? '預覽中...' : '預覽 CSV'}
        </button>
        <button onClick={onCommit} disabled={!preview || preview.errors.length > 0 || committing || loading} className="btn btn-small btn-interactive" type="button" style={{ background: '#34D399' }}>
          {committing ? '匯入中...' : '確認匯入'}
        </button>
        {preview ? <ImportResult preview={preview} /> : null}
      </div>
    </div>
  )
}

function ImportResult({ preview }) {
  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <div className="admin-inline-actions">
        <Pill>{preview.rows.length} 行</Pill>
        <Pill tone={preview.errors.length ? 'danger' : 'success'}>{preview.errors.length} 錯誤</Pill>
        <Pill tone={preview.warnings.length ? 'warning' : 'muted'}>{preview.warnings.length} 警告</Pill>
      </div>
      {preview.errors.length ? <MessageList title="錯誤" messages={preview.errors} tone="danger" /> : null}
      {preview.warnings.length ? <MessageList title="警告" messages={preview.warnings} tone="warning" /> : null}
      {preview.rows.length ? <ImportPreviewTable rows={preview.rows} /> : null}
    </div>
  )
}

function MessageList({ title, messages, tone }) {
  const colors = tone === 'danger' ? { background: '#FEF2F2', color: '#B91C1C', border: '#FECACA' } : { background: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
  return (
    <div style={{ background: colors.background, color: colors.color, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '13px', lineHeight: 1.5 }}>
        {messages.slice(0, 6).map((message, index) => <div key={`${title}-${index}`}>{message}</div>)}
        {messages.length > 6 ? <div style={{ fontWeight: 700 }}>另有 {messages.length - 6} 項</div> : null}
      </div>
    </div>
  )
}

function ImportPreviewTable({ rows }) {
  const normalizedRows = rows.slice(0, 6).map((row) => {
    if (!row || typeof row !== 'object') return { value: row }
    const { member, ticket, service, ...rest } = row
    return { ...rest, member: member?.full_name || member?.email || member?.phone || '', ticket: ticket?.name || '', service: service?.name || '' }
  })
  const columns = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row)))).slice(0, 6)
  if (!columns.length) return null
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--gray)', borderRadius: '8px' }}>
      <table className="admin-data-table" style={{ minWidth: '520px' }}>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column}>{Array.isArray(row[column]) ? row[column].join('; ') : String(row[column] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > normalizedRows.length ? <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-light)' }}>只顯示前 {normalizedRows.length} 行，共 {rows.length} 行。</div> : null}
    </div>
  )
}

function Field({ label, value, onChange, disabled, type = 'text' }) {
  return (
    <label style={{ display: 'grid', gap: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 800 }}>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={fieldStyle} disabled={disabled} />
    </label>
  )
}

function TextArea({ label, value, onChange, disabled }) {
  return (
    <label style={{ display: 'grid', gap: '8px', marginTop: '14px' }}>
      <span style={{ fontSize: '13px', fontWeight: 800 }}>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} style={{ ...fieldStyle, minHeight: '92px', resize: 'vertical' }} disabled={disabled} />
    </label>
  )
}

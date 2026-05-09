'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

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

const tableMap = {
  products: 'products',
  packages: 'service_packages',
  tickets: 'tickets',
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

export default function InventoryTab({
  products: initialProducts,
  packages: initialPackages,
  tickets: initialTickets,
  services,
  fetchData,
  saveInventory,
}) {
  const [products, setProducts] = useState(() => (initialProducts || []).map(normalizeItem))
  const [packagesState, setPackagesState] = useState(() => (initialPackages || []).map(normalizeItem))
  const [ticketsState, setTicketsState] = useState(() => (initialTickets || []).map(normalizeTicketItem))
  const [subTab, setSubTab] = useState('products')
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
    if (kind === 'packages') {
      return { id: Date.now(), name: '新套票展示', price: 0, description: '', enabled: true, __isNew: true, __deleted: false }
    }
    if (kind === 'tickets') {
      return { id: Date.now(), name: '新會員套票', price: 0, times: 10, orig: 0, features: '', emoji: 'SP', enabled: true, __isNew: true, __deleted: false }
    }
    return { id: Date.now(), name: '新產品', price: 0, stock: 0, enabled: true, __isNew: true, __deleted: false }
  }

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
        .filter(Boolean)
    )
  }

  const persistCollection = async (kind, items) => {
    const activeItems = items.filter((item) => !item.__deleted)
    const deletedIds = items.filter((item) => item.__deleted && !item.__isNew).map((item) => item.id)

    if (saveInventory) {
      await saveInventory({ kind, items: activeItems.map(stripTransientFields), deletedIds })
      return
    }

    const table = tableMap[kind]
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
      if (!saveInventory) toast.success('已儲存')
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

  const renderItemCard = (kind, item, renderFields) => {
    const deleted = Boolean(item.__deleted)
    return (
      <div key={item.id} className="admin-card" style={{ padding: '20px', opacity: deleted ? 0.55 : 1, border: deleted ? '1px dashed #dc2626' : undefined }}>
        {renderFields(item, deleted)}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
            <input type="checkbox" checked={Boolean(item.enabled)} onChange={(e) => updateItem(kind, item.id, (current) => ({ ...current, enabled: e.target.checked }))} style={{ width: 'auto' }} disabled={deleted} />
            <span style={{ fontSize: '14px' }}>啟用</span>
          </label>
          <button onClick={() => toggleDelete(kind, item.id)} className="btn-interactive" type="button" style={{ color: deleted ? '#166534' : '#ef4444', background: deleted ? '#ecfdf5' : '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            {deleted ? '還原' : '刪除'}
          </button>
        </div>
        {deleted && <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>儲存後會刪除此項目</div>}
      </div>
    )
  }

  const renderProducts = () => (
    <div>
      <Toolbar onAdd={() => addItem('products')} onSave={() => handleSave('products')} saving={saving} addLabel="新增產品" />
      <div className="grid">
        {products.map((item) =>
          renderItemCard('products', item, (current, deleted) => (
            <>
              <Field label="產品名稱" value={current.name || ''} disabled={deleted} onChange={(value) => updateItem('products', current.id, (row) => ({ ...row, name: value }))} bold />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <Field label="價格 ($)" type="number" value={current.price || 0} disabled={deleted} onChange={(value) => updateItem('products', current.id, (row) => ({ ...row, price: parseInt(value) || 0 }))} />
                <Field label="庫存" type="number" value={current.stock || 0} disabled={deleted} onChange={(value) => updateItem('products', current.id, (row) => ({ ...row, stock: parseInt(value) || 0 }))} />
              </div>
            </>
          )),
        )}
      </div>
    </div>
  )

  const renderPackages = () => (
    <div>
      <Toolbar onAdd={() => addItem('packages')} onSave={() => handleSave('packages')} saving={saving} addLabel="新增展示套票" />
      <div className="grid">
        {packagesState.map((item) =>
          renderItemCard('packages', item, (current, deleted) => (
            <>
              <Field label="展示套票名稱" value={current.name || ''} disabled={deleted} onChange={(value) => updateItem('packages', current.id, (row) => ({ ...row, name: value }))} bold />
              <Field label="價格 ($)" type="number" value={current.price || 0} disabled={deleted} onChange={(value) => updateItem('packages', current.id, (row) => ({ ...row, price: parseInt(value) || 0 }))} />
              <TextArea label="描述" value={current.description || ''} disabled={deleted} placeholder="輸入展示套票描述..." onChange={(value) => updateItem('packages', current.id, (row) => ({ ...row, description: value }))} />
            </>
          )),
        )}
      </div>
    </div>
  )

  const renderTickets = () => (
    <div>
      <Toolbar onAdd={() => addItem('tickets')} onSave={() => handleSave('tickets')} saving={saving} addLabel="新增會員套票" />
      <div className="admin-card" style={{ padding: '20px', border: '1px solid var(--gray)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>CSV 匯入</div>
            <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 800 }}>舊會員套票餘額</div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)' }}>
              貼上 CSV，先預覽每行錯誤，再提交乾淨的匯入批次。
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <button onClick={handleTicketImportPreview} disabled={ticketImportLoading || ticketImportCommitting} className="btn btn-small btn-interactive" type="button" style={{ background: '#fff' }}>
              {ticketImportLoading ? '預覽中...' : '預覽 CSV'}
            </button>
            <button onClick={handleTicketImportCommit} disabled={!ticketImportPreview || ticketImportPreview.errors.length > 0 || ticketImportCommitting || ticketImportLoading} className="btn btn-small btn-interactive" type="button" style={{ background: '#34D399' }}>
              {ticketImportCommitting ? '匯入中...' : '確認匯入'}
            </button>
          </div>
        </div>
        <textarea value={ticketCsv} onChange={(e) => { setTicketCsv(e.target.value); setTicketImportPreview(null) }} placeholder={'email,phone,full_name,ticket_name,service_name,remaining_count,expiry_date,note\ncustomer@example.com,91234567,陳小姐,頭皮護理套票,深層頭皮潔淨,10,2027-04-29,BANK-001'} style={{ minHeight: '140px', resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }} />
        {ticketImportPreview ? (
          <div style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className="badge badge-outline">預覽行數：{ticketImportPreview.rows.length}</span>
              <span className="badge badge-outline" style={{ background: ticketImportPreview.errors.length ? '#FEF2F2' : '#ECFDF5', color: ticketImportPreview.errors.length ? '#DC2626' : '#047857' }}>錯誤：{ticketImportPreview.errors.length}</span>
              <span className="badge badge-outline" style={{ background: ticketImportPreview.warnings.length ? '#FEF3C7' : '#F8FAFC', color: ticketImportPreview.warnings.length ? '#B45309' : 'var(--text-light)' }}>警告：{ticketImportPreview.warnings.length}</span>
            </div>
            {ticketImportPreview.errors.length > 0 ? <ImportMessageList title="錯誤" tone="danger" messages={ticketImportPreview.errors} /> : null}
            {ticketImportPreview.warnings.length > 0 ? <ImportMessageList title="警告" tone="warning" messages={ticketImportPreview.warnings} /> : null}
            {ticketImportPreview.rows.length > 0 ? <ImportPreviewTable rows={ticketImportPreview.rows} /> : null}
          </div>
        ) : null}
      </div>
      <div className="grid">
        {ticketsState.map((item) =>
          renderItemCard('tickets', item, (current, deleted) => (
            <>
              <Field label="套票名稱" value={current.name || ''} disabled={deleted} onChange={(value) => updateItem('tickets', current.id, (row) => ({ ...row, name: value }))} bold />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <Field label="價格 ($)" type="number" value={current.price || 0} disabled={deleted} onChange={(value) => updateItem('tickets', current.id, (row) => ({ ...row, price: parseInt(value) || 0 }))} />
                <Field label="可用次數" type="number" value={current.times || 0} disabled={deleted} onChange={(value) => updateItem('tickets', current.id, (row) => ({ ...row, times: parseInt(value) || 0 }))} />
              </div>
              <Field label="原價 ($)" type="number" value={current.orig || 0} disabled={deleted} onChange={(value) => updateItem('tickets', current.id, (row) => ({ ...row, orig: parseInt(value) || 0 }))} />
              <TextArea label="套票特色 / 條款" value={current.features || ''} disabled={deleted} onChange={(value) => updateItem('tickets', current.id, (row) => ({ ...row, features: value }))} />
              <Field label="圖示文字" value={current.emoji || ''} disabled={deleted} onChange={(value) => updateItem('tickets', current.id, (row) => ({ ...row, emoji: value }))} />
            </>
          )),
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div className="admin-card hide-scrollbar" style={{ display: 'flex', gap: '10px', marginBottom: '24px', padding: '12px', overflowX: 'auto' }}>
        <SubTabButton active={subTab === 'products'} onClick={() => setSubTab('products')}>產品</SubTabButton>
        <SubTabButton active={subTab === 'packages'} onClick={() => setSubTab('packages')}>展示套票</SubTabButton>
        <SubTabButton active={subTab === 'tickets'} onClick={() => setSubTab('tickets')}>會員套票</SubTabButton>
      </div>
      {subTab === 'products' && renderProducts()}
      {subTab === 'packages' && renderPackages()}
      {subTab === 'tickets' && renderTickets()}
    </div>
  )
}

function Toolbar({ onAdd, onSave, saving, addLabel }) {
  return (
    <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <button onClick={onAdd} className="btn btn-small btn-interactive" type="button">+ {addLabel}</button>
      <button onClick={onSave} disabled={saving} className="btn btn-small btn-interactive" type="button" style={{ background: '#34D399' }}>
        {saving && <span className="spinner"></span>}
        {saving ? '儲存中...' : '儲存變更'}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, disabled, type = 'text', bold = false }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={{ fontWeight: bold ? 700 : undefined }} disabled={disabled} />
    </div>
  )
}

function TextArea({ label, value, onChange, disabled, placeholder = '' }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ minHeight: '100px', resize: 'vertical' }} disabled={disabled} />
    </div>
  )
}

function SubTabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`admin-tab-btn ${active ? 'active' : ''}`} type="button" style={{ padding: '10px 20px', background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text-light)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

function ImportMessageList({ title, tone, messages }) {
  const colors = tone === 'danger' ? { background: '#FEF2F2', color: '#B91C1C', border: '#FECACA' } : { background: '#FEF3C7', color: '#92400E', border: '#FDE68A' }
  return (
    <div style={{ background: colors.background, color: colors.color, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '13px', lineHeight: 1.5 }}>
        {messages.slice(0, 8).map((message, index) => <div key={`${title}-${index}`}>{message}</div>)}
        {messages.length > 8 ? <div style={{ fontWeight: 700 }}>另有 {messages.length - 8} 項</div> : null}
      </div>
    </div>
  )
}

function ImportPreviewTable({ rows }) {
  const normalizedRows = rows.slice(0, 8).map((row) => {
    if (!row || typeof row !== 'object') return { value: row }
    const { member, ticket, service, ...rest } = row
    return { ...rest, member: member?.full_name || member?.email || member?.phone || '', ticket: ticket?.name || '', service: service?.name || '' }
  })
  const columns = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row)))).slice(0, 8)
  if (columns.length === 0) return null
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--gray)', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '620px' }}>
        <thead>
          <tr style={{ background: '#FAF8F5' }}>
            {columns.map((column) => <th key={column} style={{ padding: '10px', textAlign: 'left', color: 'var(--text-light)', borderBottom: '1px solid var(--gray)' }}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #f6f6f6' }}>
              {columns.map((column) => <td key={column} style={{ padding: '10px', verticalAlign: 'top' }}>{Array.isArray(row[column]) ? row[column].join('; ') : String(row[column] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > normalizedRows.length ? <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-light)' }}>只顯示前 {normalizedRows.length} 行，共 {rows.length} 行。</div> : null}
    </div>
  )
}

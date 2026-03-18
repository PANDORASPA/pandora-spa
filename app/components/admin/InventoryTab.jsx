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
  emoji: item?.emoji || '🎁',
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
      return {
        id: Date.now(),
        name: 'New Package',
        price: 0,
        description: '',
        enabled: true,
        __isNew: true,
        __deleted: false,
      }
    }

    if (kind === 'tickets') {
      return {
        id: Date.now(),
        name: 'New Ticket',
        price: 0,
        times: 10,
        orig: 0,
        features: '',
        emoji: '🎁',
        enabled: true,
        __isNew: true,
        __deleted: false,
      }
    }

    return {
      id: Date.now(),
      name: 'New Product',
      price: 0,
      stock: 0,
      enabled: true,
      __isNew: true,
      __deleted: false,
    }
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
      await saveInventory({
        kind,
        items: activeItems.map(stripTransientFields),
        deletedIds,
      })
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
      if (!saveInventory) toast.success('Saved')
    } catch (error) {
      toast.error('Save failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const renderItemCard = (kind, item, renderFields) => {
    const deleted = Boolean(item.__deleted)

    return (
      <div
        key={item.id}
        className="admin-card"
        style={{
          padding: '20px',
          opacity: deleted ? 0.55 : 1,
          border: deleted ? '1px dashed #dc2626' : undefined,
        }}
      >
        {renderFields(item, deleted)}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--gray)',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={Boolean(item.enabled)}
              onChange={(e) => updateItem(kind, item.id, (current) => ({ ...current, enabled: e.target.checked }))}
              style={{ width: 'auto' }}
              disabled={deleted}
            />
            <span style={{ fontSize: '14px' }}>Enabled</span>
          </label>
          <button
            onClick={() => toggleDelete(kind, item.id)}
            className="btn-interactive"
            type="button"
            style={{
              color: deleted ? '#166534' : '#ef4444',
              background: deleted ? '#ecfdf5' : '#fef2f2',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {deleted ? 'Restore' : 'Delete'}
          </button>
        </div>
        {deleted && <div style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>Will be removed on save</div>}
      </div>
    )
  }

  const renderProducts = () => (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => addItem('products')} className="btn btn-small btn-interactive" type="button">
          + Add Product
        </button>
        <button
          onClick={() => handleSave('products')}
          disabled={saving}
          className="btn btn-small btn-interactive"
          type="button"
          style={{ background: '#34D399' }}
        >
          {saving && <span className="spinner"></span>}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="grid">
        {products.map((item) =>
          renderItemCard('products', item, (current, deleted) => (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label>Product Name</label>
                <input
                  value={current.name || ''}
                  onChange={(e) => updateItem('products', current.id, (row) => ({ ...row, name: e.target.value }))}
                  style={{ fontWeight: 600 }}
                  disabled={deleted}
                />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label>Price ($)</label>
                  <input
                    type="number"
                    value={current.price || 0}
                    onChange={(e) =>
                      updateItem('products', current.id, (row) => ({ ...row, price: parseInt(e.target.value) || 0 }))
                    }
                    disabled={deleted}
                  />
                </div>
                <div>
                  <label>Stock</label>
                  <input
                    type="number"
                    value={current.stock || 0}
                    onChange={(e) =>
                      updateItem('products', current.id, (row) => ({ ...row, stock: parseInt(e.target.value) || 0 }))
                    }
                    disabled={deleted}
                  />
                </div>
              </div>
            </>
          ))
        )}
      </div>
    </div>
  )

  const renderPackages = () => (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => addItem('packages')} className="btn btn-small btn-interactive" type="button">
          + Add Package
        </button>
        <button
          onClick={() => handleSave('packages')}
          disabled={saving}
          className="btn btn-small btn-interactive"
          type="button"
          style={{ background: '#34D399' }}
        >
          {saving && <span className="spinner"></span>}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="grid">
        {packagesState.map((item) =>
          renderItemCard('packages', item, (current, deleted) => (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label>Package Name</label>
                <input
                  value={current.name || ''}
                  onChange={(e) => updateItem('packages', current.id, (row) => ({ ...row, name: e.target.value }))}
                  style={{ fontWeight: 700 }}
                  disabled={deleted}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Price ($)</label>
                <input
                  type="number"
                  value={current.price || 0}
                  onChange={(e) =>
                    updateItem('packages', current.id, (row) => ({ ...row, price: parseInt(e.target.value) || 0 }))
                  }
                  disabled={deleted}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Description</label>
                <textarea
                  value={current.description || ''}
                  onChange={(e) =>
                    updateItem('packages', current.id, (row) => ({ ...row, description: e.target.value }))
                  }
                  placeholder="Describe the package..."
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  disabled={deleted}
                />
              </div>
            </>
          ))
        )}
      </div>
    </div>
  )

  const renderTickets = () => (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => addItem('tickets')} className="btn btn-small btn-interactive" type="button">
          + Add Ticket
        </button>
        <button
          onClick={() => handleSave('tickets')}
          disabled={saving}
          className="btn btn-small btn-interactive"
          type="button"
          style={{ background: '#34D399' }}
        >
          {saving && <span className="spinner"></span>}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="grid">
        {ticketsState.map((item) =>
          renderItemCard('tickets', item, (current, deleted) => (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label>Ticket Name</label>
                <input
                  value={current.name || ''}
                  onChange={(e) => updateItem('tickets', current.id, (row) => ({ ...row, name: e.target.value }))}
                  style={{ fontWeight: 700 }}
                  disabled={deleted}
                />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label>Price ($)</label>
                  <input
                    type="number"
                    value={current.price || 0}
                    onChange={(e) =>
                      updateItem('tickets', current.id, (row) => ({ ...row, price: parseInt(e.target.value) || 0 }))
                    }
                    disabled={deleted}
                  />
                </div>
                <div>
                  <label>Uses</label>
                  <input
                    type="number"
                    value={current.times || 0}
                    onChange={(e) =>
                      updateItem('tickets', current.id, (row) => ({ ...row, times: parseInt(e.target.value) || 0 }))
                    }
                    disabled={deleted}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Original Price ($)</label>
                <input
                  type="number"
                  value={current.orig || 0}
                  onChange={(e) =>
                    updateItem('tickets', current.id, (row) => ({ ...row, orig: parseInt(e.target.value) || 0 }))
                  }
                  disabled={deleted}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Features</label>
                <textarea
                  value={current.features || ''}
                  onChange={(e) => updateItem('tickets', current.id, (row) => ({ ...row, features: e.target.value }))}
                  disabled={deleted}
                  style={{ minHeight: '90px', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Emoji</label>
                <input
                  value={current.emoji || ''}
                  onChange={(e) => updateItem('tickets', current.id, (row) => ({ ...row, emoji: e.target.value }))}
                  disabled={deleted}
                />
              </div>
            </>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div className="admin-card hide-scrollbar" style={{ display: 'flex', gap: '10px', marginBottom: '24px', padding: '12px', overflowX: 'auto' }}>
        <button
          onClick={() => setSubTab('products')}
          className={`admin-tab-btn ${subTab === 'products' ? 'active' : ''}`}
          type="button"
          style={{
            padding: '10px 20px',
            background: subTab === 'products' ? 'var(--primary)' : 'transparent',
            color: subTab === 'products' ? '#fff' : 'var(--text-light)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Products
        </button>
        <button
          onClick={() => setSubTab('packages')}
          className={`admin-tab-btn ${subTab === 'packages' ? 'active' : ''}`}
          type="button"
          style={{
            padding: '10px 20px',
            background: subTab === 'packages' ? 'var(--primary)' : 'transparent',
            color: subTab === 'packages' ? '#fff' : 'var(--text-light)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Packages
        </button>
        <button
          onClick={() => setSubTab('tickets')}
          className={`admin-tab-btn ${subTab === 'tickets' ? 'active' : ''}`}
          type="button"
          style={{
            padding: '10px 20px',
            background: subTab === 'tickets' ? 'var(--primary)' : 'transparent',
            color: subTab === 'tickets' ? '#fff' : 'var(--text-light)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Tickets
        </button>
      </div>

      {subTab === 'products' && renderProducts()}
      {subTab === 'packages' && renderPackages()}
      {subTab === 'tickets' && renderTickets()}
    </div>
  )
}

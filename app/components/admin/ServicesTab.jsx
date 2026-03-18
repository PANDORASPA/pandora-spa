'use client'

import { useEffect, useState } from 'react'

const normalizeService = (service) => ({
  ...service,
  __isNew: Boolean(service?.__isNew),
  __deleted: Boolean(service?.__deleted),
})

export default function ServicesTab({ services: initialServices, saveServices }) {
  const [services, setServices] = useState(() => (initialServices || []).map(normalizeService))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setServices((initialServices || []).map(normalizeService))
  }, [initialServices])

  const updateService = (id, updater) => {
    setServices((current) => current.map((item) => (item.id === id ? updater(item) : item)))
  }

  const addService = () => {
    setServices((current) => [
      {
        id: Date.now(),
        name: '',
        price: 0,
        time: 60,
        emoji: '✂️',
        enabled: true,
        sort_order: current.length,
        category: '',
        description: '',
        __isNew: true,
        __deleted: false,
      },
      ...current,
    ])
  }

  const toggleDelete = (id) => {
    setServices((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item
          if (item.__isNew) return null
          return { ...item, __deleted: !item.__deleted }
        })
        .filter(Boolean)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveServices({
        services,
        deletedIds: services.filter((item) => item.__deleted && !item.__isNew).map((item) => item.id),
      })
    } finally {
      setSaving(false)
    }
  }

  const visibleServices = [...services].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={addService} className="btn btn-small btn-interactive" type="button">
          + Add Service
        </button>
        <button
          onClick={handleSave}
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
        {visibleServices.map((service) => (
          <div
            key={service.id}
            className="admin-card"
            style={{
              padding: '24px',
              opacity: service.__deleted ? 0.55 : 1,
              border: service.__deleted ? '1px dashed #dc2626' : undefined,
            }}
          >
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <label>Icon</label>
                <input
                  value={service.emoji || ''}
                  onChange={(e) => updateService(service.id, (item) => ({ ...item, emoji: e.target.value }))}
                  style={{ width: '64px', height: '64px', fontSize: '32px', textAlign: 'center', padding: 0 }}
                  disabled={service.__deleted}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Service Name</label>
                <input
                  value={service.name || ''}
                  onChange={(e) => updateService(service.id, (item) => ({ ...item, name: e.target.value }))}
                  placeholder="e.g. Hair Cut"
                  style={{ fontWeight: 700, fontSize: '16px' }}
                  disabled={service.__deleted}
                />
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label>Price ($)</label>
                <input
                  value={service.price || 0}
                  onChange={(e) =>
                    updateService(service.id, (item) => ({ ...item, price: parseInt(e.target.value) || 0 }))
                  }
                  type="number"
                  disabled={service.__deleted}
                />
              </div>
              <div>
                <label>Duration (min)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    value={service.time || 60}
                    onChange={(e) =>
                      updateService(service.id, (item) => ({ ...item, time: parseInt(e.target.value) || 60 }))
                    }
                    type="number"
                    disabled={service.__deleted}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-light)' }}>min</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Category</label>
              <input
                value={service.category || ''}
                onChange={(e) => updateService(service.id, (item) => ({ ...item, category: e.target.value }))}
                placeholder="e.g. Cut, Color, Treatment"
                disabled={service.__deleted}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>Description</label>
              <textarea
                value={service.description || ''}
                onChange={(e) =>
                  updateService(service.id, (item) => ({ ...item, description: e.target.value }))
                }
                placeholder="Service notes..."
                style={{ minHeight: '80px', resize: 'vertical' }}
                disabled={service.__deleted}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={Boolean(service.enabled)}
                  onChange={(e) => updateService(service.id, (item) => ({ ...item, enabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                  disabled={service.__deleted}
                />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Enabled</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>Order:</span>
                  <input
                    type="number"
                    value={service.sort_order || 0}
                    onChange={(e) =>
                      updateService(service.id, (item) => ({ ...item, sort_order: parseInt(e.target.value) || 0 }))
                    }
                    style={{ width: '50px', padding: '6px', fontSize: '12px' }}
                    disabled={service.__deleted}
                  />
                </div>
                <button
                  onClick={() => toggleDelete(service.id)}
                  className="btn-interactive"
                  type="button"
                  style={{
                    padding: '6px 12px',
                    background: service.__deleted ? '#ecfdf5' : '#fee2e2',
                    color: service.__deleted ? '#166534' : '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {service.__deleted ? 'Restore' : 'Delete'}
                </button>
              </div>
            </div>

            {service.__deleted && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>
                This item will be removed on save
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

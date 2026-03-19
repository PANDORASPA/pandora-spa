'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, ChipRow, EmptyState, StatusPill } from './AdminConfigKit'

const normalizeService = (service) => ({
  ...service,
  __isNew: Boolean(service?.__isNew),
  __deleted: Boolean(service?.__deleted),
})

const toId = (value) => {
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

const textOf = (value) => String(value || '').trim()

const relationKey = (row) => `${row?.service_id ?? 'x'}-${row?.location_id ?? row?.provider_group_id ?? row?.resource_id ?? row?.id ?? '0'}`

const buildLookup = (rows = []) =>
  rows.reduce((acc, row) => {
    const id = toId(row?.id)
    if (id != null) acc[id] = row
    return acc
  }, {})

const buildServiceLinks = (sourceRows = [], serviceId, key, lookup) =>
  sourceRows
    .filter((row) => toId(row?.service_id) === serviceId)
    .map((row) => {
      const linkedId = toId(row?.[key])
      const related = lookup[linkedId]
      const label = row?.name || related?.name || related?.title || `#${linkedId || row?.id}`
      return {
        key: relationKey(row),
        label: row?.quantity && Number(row.quantity) > 1 ? `${label} x${row.quantity}` : label,
      }
    })

export default function ServicesTab({
  services: initialServices,
  saveServices,
  locations = [],
  providerGroups = [],
  resources = [],
  serviceLocations = [],
  serviceProviderGroups = [],
  serviceResources = [],
}) {
  const [services, setServices] = useState(() => (initialServices || []).map(normalizeService))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setServices((initialServices || []).map(normalizeService))
  }, [initialServices])

  const locationLookup = useMemo(() => buildLookup(locations), [locations])
  const providerGroupLookup = useMemo(() => buildLookup(providerGroups), [providerGroups])
  const resourceLookup = useMemo(() => buildLookup(resources), [resources])

  const visibleServices = [...services].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

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
        buffer_min: 0,
        image_url: '',
        emoji: '*',
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

  const getLinks = (service) => {
    const serviceId = toId(service?.id)
    return {
      locations: buildServiceLinks(serviceLocations, serviceId, 'location_id', locationLookup),
      providerGroups: buildServiceLinks(serviceProviderGroups, serviceId, 'provider_group_id', providerGroupLookup),
      resources: buildServiceLinks(serviceResources, serviceId, 'resource_id', resourceLookup),
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="admin-card"
        style={{
          padding: '20px 22px',
          background: 'linear-gradient(135deg, #fff, #fbf7f1)',
          border: '1px solid rgba(166, 139, 106, 0.22)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>SERVICE CONFIG</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>Core service setup and operational links</div>
          <div style={{ marginTop: '4px', color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>
            Keep the editable catalog in one place while location, provider group, and resource links can be wired later without changing the layout.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone="accent">{visibleServices.length} services</StatusPill>
          <button onClick={addService} className="btn btn-small btn-interactive" type="button">
            + Add service
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-small btn-interactive"
            type="button"
            style={{ background: '#34D399', minWidth: '122px' }}
          >
            {saving && <span className="spinner"></span>}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '18px' }}>
        {visibleServices.map((service) => {
          const links = getLinks(service)

          return (
            <div
              key={service.id}
              className="admin-card"
              style={{
                padding: '22px',
                opacity: service.__deleted ? 0.55 : 1,
                border: service.__deleted ? '1px dashed #dc2626' : '1px solid rgba(166, 139, 106, 0.16)',
                background: service.__deleted ? '#FFF9F9' : '#fff',
                display: 'grid',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', minWidth: 0 }}>
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #f6efe4, #ffffff)',
                      border: '1px solid var(--gray)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      flexShrink: 0,
                    }}
                  >
                    {textOf(service.emoji) || '*'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={service.name || ''}
                        onChange={(e) => updateService(service.id, (item) => ({ ...item, name: e.target.value }))}
                        placeholder="Service name"
                        style={{ fontWeight: 800, fontSize: '18px', minWidth: '240px' }}
                        disabled={service.__deleted}
                      />
                      <StatusPill tone={service.enabled ? 'success' : 'neutral'}>{service.enabled ? 'Enabled' : 'Hidden'}</StatusPill>
                      {service.__isNew && <StatusPill tone="warning">Draft</StatusPill>}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-light)' }}>
                      Order {service.sort_order || 0}
                      {service.category ? ` - ${service.category}` : ''}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleDelete(service.id)}
                  className="btn-interactive"
                  type="button"
                  style={{
                    padding: '8px 14px',
                    background: service.__deleted ? '#ecfdf5' : '#fee2e2',
                    color: service.__deleted ? '#166534' : '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {service.__deleted ? 'Restore' : 'Delete'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <AdminSection
                  eyebrow="BASIC DATA"
                  title="Identity and public copy"
                  description="Keep the public-facing label, hero text, and visual identity in one block."
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <label>
                      <span>Icon / emoji</span>
                      <input
                        value={service.emoji || ''}
                        onChange={(e) => updateService(service.id, (item) => ({ ...item, emoji: e.target.value }))}
                        placeholder="*"
                        style={{ width: '100%', fontSize: '24px', textAlign: 'center' }}
                        disabled={service.__deleted}
                      />
                    </label>
                    <label>
                      <span>Category</span>
                      <input
                        value={service.category || ''}
                        onChange={(e) => updateService(service.id, (item) => ({ ...item, category: e.target.value }))}
                        placeholder="Cut, Color, Treatment"
                        disabled={service.__deleted}
                      />
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      <span>Description</span>
                      <textarea
                        value={service.description || ''}
                        onChange={(e) => updateService(service.id, (item) => ({ ...item, description: e.target.value }))}
                        placeholder="Short notes shown in admin and public service cards."
                        style={{ minHeight: '92px', resize: 'vertical' }}
                        disabled={service.__deleted}
                      />
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      <span>Image URL</span>
                      <input
                        value={service.image_url || ''}
                        onChange={(e) => updateService(service.id, (item) => ({ ...item, image_url: e.target.value }))}
                        placeholder="https://..."
                        disabled={service.__deleted}
                      />
                    </label>
                  </div>
                </AdminSection>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <AdminSection
                    eyebrow="PRICING / TIME"
                    title="Price, duration, and slot behavior"
                    description="These are the fields the current booking flow already understands."
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                      <label>
                        <span>Price ($)</span>
                        <input
                          value={service.price || 0}
                          onChange={(e) => updateService(service.id, (item) => ({ ...item, price: parseInt(e.target.value, 10) || 0 }))}
                          type="number"
                          disabled={service.__deleted}
                        />
                      </label>
                      <label>
                        <span>Duration (min)</span>
                        <input
                          value={service.time || 60}
                          onChange={(e) => updateService(service.id, (item) => ({ ...item, time: parseInt(e.target.value, 10) || 60 }))}
                          type="number"
                          disabled={service.__deleted}
                        />
                      </label>
                      <label>
                        <span>Buffer (min)</span>
                        <input
                          value={service.buffer_min || 0}
                          onChange={(e) => updateService(service.id, (item) => ({ ...item, buffer_min: parseInt(e.target.value, 10) || 0 }))}
                          type="number"
                          disabled={service.__deleted}
                        />
                      </label>
                      <label>
                        <span>Sort order</span>
                        <input
                          type="number"
                          value={service.sort_order || 0}
                          onChange={(e) => updateService(service.id, (item) => ({ ...item, sort_order: parseInt(e.target.value, 10) || 0 }))}
                          disabled={service.__deleted}
                        />
                      </label>
                    </div>
                  </AdminSection>

                  <AdminSection
                    eyebrow="STATUS"
                    title="Availability controls"
                    description="Keep a clean enable / hide state for the public catalog."
                    tone="accent"
                    actions={
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(service.enabled)}
                          onChange={(e) => updateService(service.id, (item) => ({ ...item, enabled: e.target.checked }))}
                          style={{ width: 'auto' }}
                          disabled={service.__deleted}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>Enabled</span>
                      </label>
                    }
                  >
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <StatusPill tone="accent">{service.price ? `$${Number(service.price).toLocaleString()}` : 'Free'}</StatusPill>
                        <StatusPill tone="neutral">{service.time || 60} min</StatusPill>
                        <StatusPill tone="neutral">Buffer {service.buffer_min || 0} min</StatusPill>
                      </div>
                      {service.__deleted && (
                        <EmptyState title="Marked for removal" description="This service will be deleted when the next save is confirmed." />
                      )}
                    </div>
                  </AdminSection>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <AdminSection
                    eyebrow="LOCATIONS"
                    title="Where this service can be booked"
                    description="Reads from service_locations when the parent shell passes the relation rows."
                  >
                    <ChipRow
                      items={links.locations}
                      emptyLabel={locations.length ? 'No location linked yet' : 'No location contract yet'}
                    />
                  </AdminSection>

                  <AdminSection
                    eyebrow="PROVIDER GROUPS"
                    title="Who can perform it"
                    description="Link this service to provider groups to keep scheduling rules tidy."
                  >
                    <ChipRow
                      items={links.providerGroups}
                      emptyLabel={providerGroups.length ? 'No provider group linked yet' : 'No provider group contract yet'}
                    />
                  </AdminSection>

                  <AdminSection
                    eyebrow="RESOURCES"
                    title="Operational resources"
                    description="Track consumables, chairs, rooms, or tools needed to execute the service."
                  >
                    <ChipRow
                      items={links.resources}
                      emptyLabel={resources.length ? 'No resource linked yet' : 'No resource contract yet'}
                    />
                  </AdminSection>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


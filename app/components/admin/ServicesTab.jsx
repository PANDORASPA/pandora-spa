'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'

const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647
const toId = (value) => {
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--gray)',
  background: '#fff',
  fontSize: '14px',
  color: 'var(--text)',
}

const helperTextStyle = { fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.5 }

const normalizeService = (service) => ({
  ...service,
  id: service?.id ?? tempId(),
  price: Number(service?.price || 0),
  time: Number(service?.time || 60),
  buffer_min: Number(service?.buffer_min || 0),
  sort_order: Number(service?.sort_order || 0),
  slot_step_min: service?.slot_step_min == null ? '' : Number(service.slot_step_min || 0),
  min_booking_qty: Number(service?.min_booking_qty || 1),
  max_booking_qty: Number(service?.max_booking_qty || 1),
  booking_mode: service?.booking_mode || 'staff',
  default_location_id: service?.default_location_id ?? '',
  default_provider_group_id: service?.default_provider_group_id ?? '',
  enabled: service?.enabled !== false,
  __isNew: Boolean(service?.__isNew),
  __deleted: Boolean(service?.__deleted),
})

const normalizeLocationLink = (row) => ({
  ...row,
  id: row?.id ?? tempId(),
  service_id: row?.service_id,
  location_id: row?.location_id ?? '',
  extra_price: Number(row?.extra_price || 0),
  enabled: row?.enabled !== false,
})

const normalizeProviderGroupLink = (row) => ({
  ...row,
  id: row?.id ?? tempId(),
  service_id: row?.service_id,
  provider_group_id: row?.provider_group_id ?? '',
  assignment_mode: row?.assignment_mode || 'any',
})

const normalizeResourceLink = (row) => ({
  ...row,
  id: row?.id ?? tempId(),
  service_id: row?.service_id,
  resource_id: row?.resource_id ?? '',
  quantity: Number(row?.quantity || 1),
  required: row?.required !== false,
})

const buildLookup = (rows = []) => Object.fromEntries(rows.map((row) => [Number(row.id), row]))

const lookupLabel = (lookup, id) => lookup[toId(id)]?.name || lookup[toId(id)]?.title || `#${id}`

export default function ServicesTab({
  services: initialServices,
  saveServices,
  locations = [],
  providerGroups = [],
  resources = [],
  serviceLocations = [],
  serviceProviderGroups = [],
  serviceResources = [],
  availableTables = {},
}) {
  const [services, setServices] = useState([])
  const [locationLinks, setLocationLinks] = useState([])
  const [providerGroupLinks, setProviderGroupLinks] = useState([])
  const [resourceLinks, setResourceLinks] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const [deletedServiceLocationIds, setDeletedServiceLocationIds] = useState([])
  const [deletedServiceProviderGroupIds, setDeletedServiceProviderGroupIds] = useState([])
  const [deletedServiceResourceIds, setDeletedServiceResourceIds] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setServices((initialServices || []).map(normalizeService))
    setLocationLinks((serviceLocations || []).map(normalizeLocationLink))
    setProviderGroupLinks((serviceProviderGroups || []).map(normalizeProviderGroupLink))
    setResourceLinks((serviceResources || []).map(normalizeResourceLink))
    setDeletedIds([])
    setDeletedServiceLocationIds([])
    setDeletedServiceProviderGroupIds([])
    setDeletedServiceResourceIds([])
  }, [initialServices, serviceLocations, serviceProviderGroups, serviceResources])

  const locationLookup = useMemo(() => buildLookup(locations), [locations])
  const providerGroupLookup = useMemo(() => buildLookup(providerGroups), [providerGroups])
  const resourceLookup = useMemo(() => buildLookup(resources), [resources])

  const relationAvailability = {
    locations: availableTables?.locations !== false && availableTables?.serviceLocations !== false,
    providerGroups: availableTables?.providerGroups !== false && availableTables?.serviceProviderGroups !== false,
    resources: availableTables?.resources !== false && availableTables?.serviceResources !== false,
  }

  const visibleServices = [...services].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  const updateService = (id, updater) => {
    setServices((current) => current.map((item) => (item.id === id ? updater(item) : item)))
  }

  const updateRelation = (setter, id, patch) => {
    setter((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const relationsForService = (rows, serviceId, { hideDisabled = false } = {}) =>
    rows.filter((row) => String(row.service_id) === String(serviceId) && (!hideDisabled || row.enabled !== false))

  const addService = () => {
    setServices((current) => [
      {
        id: tempId(),
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
        slot_step_min: '',
        min_booking_qty: 1,
        max_booking_qty: 1,
        booking_mode: 'staff',
        default_location_id: '',
        default_provider_group_id: '',
        __isNew: true,
        __deleted: false,
      },
      ...current,
    ])
  }

  const toggleDeleteService = (id) => {
    const service = services.find((item) => item.id === id)
    if (!service) return

    if (service.__isNew) {
      setServices((current) => current.filter((item) => item.id !== id))
      setLocationLinks((current) => current.filter((row) => String(row.service_id) !== String(id)))
      setProviderGroupLinks((current) => current.filter((row) => String(row.service_id) !== String(id)))
      setResourceLinks((current) => current.filter((row) => String(row.service_id) !== String(id)))
      return
    }

    setServices((current) => current.map((item) => (item.id === id ? { ...item, __deleted: !item.__deleted } : item)))
    setDeletedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const addLocationLink = (serviceId) => {
    const unused = (locations || []).find(
      (location) => !locationLinks.some((row) => String(row.service_id) === String(serviceId) && Number(row.location_id) === Number(location.id))
    )
    setLocationLinks((current) => [...current, normalizeLocationLink({ service_id: serviceId, location_id: unused?.id ?? '', extra_price: 0, enabled: true })])
  }

  const addProviderGroupLink = (serviceId) => {
    const unused = (providerGroups || []).find(
      (group) => !providerGroupLinks.some((row) => String(row.service_id) === String(serviceId) && Number(row.provider_group_id) === Number(group.id))
    )
    setProviderGroupLinks((current) => [...current, normalizeProviderGroupLink({ service_id: serviceId, provider_group_id: unused?.id ?? '', assignment_mode: 'any' })])
  }

  const addResourceLink = (serviceId) => {
    const unused = (resources || []).find(
      (resource) => !resourceLinks.some((row) => String(row.service_id) === String(serviceId) && Number(row.resource_id) === Number(resource.id))
    )
    setResourceLinks((current) => [...current, normalizeResourceLink({ service_id: serviceId, resource_id: unused?.id ?? '', quantity: 1, required: true })])
  }

  const removeRelation = ({ id, setter, deletedSetter }) => {
    setter((current) => current.filter((row) => row.id !== id))
    if (isPersisted(id)) {
      deletedSetter((current) => (current.includes(id) ? current : [...current, id]))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveServices({
        services,
        serviceLocations: locationLinks,
        serviceProviderGroups: providerGroupLinks,
        serviceResources: resourceLinks,
        deletedIds,
        deletedServiceLocationIds,
        deletedServiceProviderGroupIds,
        deletedServiceResourceIds,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="admin-card" style={{ padding: '20px 22px', background: 'linear-gradient(135deg, #fff, #fbf7f1)', border: '1px solid rgba(166, 139, 106, 0.22)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#A68B6A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em' }}>SERVICE CONFIG</div>
          <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800 }}>Phase 2 operational service rules</div>
          <div style={{ marginTop: '4px', color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>
            Keep service basics, slot behavior, locations, provider groups, and resource requirements under one save flow.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <StatusPill tone="accent">{visibleServices.length} services</StatusPill>
          <button onClick={addService} className="btn btn-small btn-interactive" type="button">
            + Add service
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-small btn-interactive" type="button" style={{ background: '#34D399', minWidth: '122px' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '18px' }}>
        {visibleServices.map((service) => {
          const currentLocationLinks = relationsForService(locationLinks, service.id)
          const currentProviderGroupLinks = relationsForService(providerGroupLinks, service.id)
          const currentResourceLinks = relationsForService(resourceLinks, service.id)

          return (
            <div key={service.id} className="admin-card" style={{ padding: '22px', opacity: service.__deleted ? 0.55 : 1, border: service.__deleted ? '1px dashed #dc2626' : '1px solid rgba(166, 139, 106, 0.16)', background: service.__deleted ? '#FFF9F9' : '#fff', display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', minWidth: 0 }}>
                  <div style={{ width: '58px', height: '58px', borderRadius: '16px', background: 'linear-gradient(135deg, #f6efe4, #ffffff)', border: '1px solid var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
                    {service.emoji || '*'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input value={service.name || ''} onChange={(e) => updateService(service.id, (item) => ({ ...item, name: e.target.value }))} placeholder="Service name" style={{ fontWeight: 800, fontSize: '18px', minWidth: '240px' }} disabled={service.__deleted} />
                      <StatusPill tone={service.enabled ? 'success' : 'neutral'}>{service.enabled ? 'Enabled' : 'Hidden'}</StatusPill>
                      {service.__isNew && <StatusPill tone="warning">Draft</StatusPill>}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-light)' }}>
                      Order {service.sort_order || 0}
                      {service.category ? ` - ${service.category}` : ''}
                    </div>
                  </div>
                </div>

                <button onClick={() => toggleDeleteService(service.id)} className="btn-interactive" type="button" style={{ padding: '8px 14px', background: service.__deleted ? '#ecfdf5' : '#fee2e2', color: service.__deleted ? '#166534' : '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                  {service.__deleted ? 'Restore' : 'Delete'}
                </button>
              </div>

              <AdminSection eyebrow="BASIC DATA" title="Identity and copy" description="Keep the public-facing label, visual identity, and notes aligned with the original SAAS service record.">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <label><span>Icon / emoji</span><input value={service.emoji || ''} onChange={(e) => updateService(service.id, (item) => ({ ...item, emoji: e.target.value }))} disabled={service.__deleted} /></label>
                  <label><span>Category</span><input value={service.category || ''} onChange={(e) => updateService(service.id, (item) => ({ ...item, category: e.target.value }))} disabled={service.__deleted} /></label>
                  <label style={{ gridColumn: '1 / -1' }}><span>Description</span><textarea value={service.description || ''} onChange={(e) => updateService(service.id, (item) => ({ ...item, description: e.target.value }))} style={{ minHeight: '92px', resize: 'vertical' }} disabled={service.__deleted} /></label>
                  <label style={{ gridColumn: '1 / -1' }}><span>Image URL</span><input value={service.image_url || ''} onChange={(e) => updateService(service.id, (item) => ({ ...item, image_url: e.target.value }))} disabled={service.__deleted} /></label>
                </div>
              </AdminSection>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                <AdminSection eyebrow="PRICING / TIME" title="Commercial + slot controls" description="These fields feed the phase2 booking engine directly.">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    <label><span>Price ($)</span><input type="number" value={service.price} onChange={(e) => updateService(service.id, (item) => ({ ...item, price: Number(e.target.value || 0) }))} disabled={service.__deleted} /></label>
                    <label><span>Duration (min)</span><input type="number" value={service.time} onChange={(e) => updateService(service.id, (item) => ({ ...item, time: Number(e.target.value || 60) }))} disabled={service.__deleted} /></label>
                    <label><span>Buffer (min)</span><input type="number" value={service.buffer_min} onChange={(e) => updateService(service.id, (item) => ({ ...item, buffer_min: Number(e.target.value || 0) }))} disabled={service.__deleted} /></label>
                    <label><span>Slot step</span><input type="number" value={service.slot_step_min} onChange={(e) => updateService(service.id, (item) => ({ ...item, slot_step_min: e.target.value === '' ? '' : Number(e.target.value || 0) }))} disabled={service.__deleted} /></label>
                    <label><span>Min qty</span><input type="number" min="1" value={service.min_booking_qty} onChange={(e) => updateService(service.id, (item) => ({ ...item, min_booking_qty: Number(e.target.value || 1) }))} disabled={service.__deleted} /></label>
                    <label><span>Max qty</span><input type="number" min="1" value={service.max_booking_qty} onChange={(e) => updateService(service.id, (item) => ({ ...item, max_booking_qty: Number(e.target.value || 1) }))} disabled={service.__deleted} /></label>
                    <label>
                      <span>Booking mode</span>
                      <select value={service.booking_mode} onChange={(e) => updateService(service.id, (item) => ({ ...item, booking_mode: e.target.value }))} style={fieldStyle} disabled={service.__deleted}>
                        <option value="staff">Staff</option>
                        <option value="provider_group">Provider group</option>
                        <option value="resource">Resource</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </label>
                    <label><span>Sort order</span><input type="number" value={service.sort_order} onChange={(e) => updateService(service.id, (item) => ({ ...item, sort_order: Number(e.target.value || 0) }))} disabled={service.__deleted} /></label>
                  </div>
                </AdminSection>

                <AdminSection eyebrow="STATUS" title="Default routing" description="Use default location / provider group when the service has one safe fallback route." tone="accent" actions={<label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}><input type="checkbox" checked={Boolean(service.enabled)} onChange={(e) => updateService(service.id, (item) => ({ ...item, enabled: e.target.checked }))} style={{ width: 'auto' }} disabled={service.__deleted} /><span style={{ fontSize: '14px', fontWeight: 700 }}>Enabled</span></label>}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label>
                      <span>Default location</span>
                      <select value={service.default_location_id} onChange={(e) => updateService(service.id, (item) => ({ ...item, default_location_id: e.target.value }))} style={fieldStyle} disabled={service.__deleted || !locations.length}>
                        <option value="">No default</option>
                        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Default provider group</span>
                      <select value={service.default_provider_group_id} onChange={(e) => updateService(service.id, (item) => ({ ...item, default_provider_group_id: e.target.value }))} style={fieldStyle} disabled={service.__deleted || !providerGroups.length}>
                        <option value="">No default</option>
                        {providerGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                      </select>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <StatusPill tone="accent">{service.price ? `$${Number(service.price).toLocaleString()}` : 'Free'}</StatusPill>
                      <StatusPill tone="neutral">{service.time || 60} min</StatusPill>
                      <StatusPill tone="neutral">Buffer {service.buffer_min || 0} min</StatusPill>
                      <StatusPill tone="neutral">Step {service.slot_step_min || 'shop default'}</StatusPill>
                    </div>
                    {service.__deleted && <EmptyState title="Marked for removal" description="This service will be deleted on the next save, together with its phase2 links." />}
                  </div>
                </AdminSection>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <AdminSection eyebrow="LOCATIONS" title="Where this service can be booked" description="Each link becomes source-of-truth input for availability and booking validation." actions={relationAvailability.locations ? <button type="button" className="btn btn-small btn-interactive" onClick={() => addLocationLink(service.id)} disabled={service.__deleted}>+ Add location</button> : null}>
                  {!relationAvailability.locations ? (
                    <EmptyState title="Location links unavailable" description="Locations or service_locations table is missing. Run the latest migration before wiring service-to-location rules." />
                  ) : currentLocationLinks.length === 0 ? (
                    <EmptyState title="No location linked yet" description="Add one or more salon locations. If a service has multiple locations and no frontend picker, the engine will stay conservative." />
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {currentLocationLinks.map((row) => (
                        <div key={row.id} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '12px', display: 'grid', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px auto auto', gap: '10px', alignItems: 'end' }}>
                            <label>
                              <span>Location</span>
                              <select value={row.location_id} onChange={(e) => updateRelation(setLocationLinks, row.id, { location_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle} disabled={service.__deleted}>
                                <option value="">Select location</option>
                                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                              </select>
                            </label>
                            <label><span>Extra price</span><input type="number" value={row.extra_price} onChange={(e) => updateRelation(setLocationLinks, row.id, { extra_price: Number(e.target.value || 0) })} disabled={service.__deleted} /></label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px' }}><input type="checkbox" checked={row.enabled !== false} onChange={(e) => updateRelation(setLocationLinks, row.id, { enabled: e.target.checked })} disabled={service.__deleted} /><span>Enabled</span></label>
                            <button type="button" className="btn btn-small btn-interactive" onClick={() => removeRelation({ id: row.id, setter: setLocationLinks, deletedSetter: setDeletedServiceLocationIds })} disabled={service.__deleted} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Remove</button>
                          </div>
                          <div style={helperTextStyle}>Current link: {row.location_id ? lookupLabel(locationLookup, row.location_id) : 'Unassigned'}{row.extra_price ? `, +$${row.extra_price}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </AdminSection>

                <AdminSection eyebrow="PROVIDER GROUPS" title="Which provider groups may perform it" description="Use group links so availability, create booking, and reschedule obey the same staff gate." actions={relationAvailability.providerGroups ? <button type="button" className="btn btn-small btn-interactive" onClick={() => addProviderGroupLink(service.id)} disabled={service.__deleted}>+ Add group</button> : null}>
                  {!relationAvailability.providerGroups ? (
                    <EmptyState title="Provider-group links unavailable" description="provider_groups or service_provider_groups table is missing. Service-to-staff group routing cannot be configured yet." />
                  ) : currentProviderGroupLinks.length === 0 ? (
                    <EmptyState title="No provider group linked yet" description="Leave this empty only if any qualified staff can perform the service. Otherwise add the allowed operational group." />
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {currentProviderGroupLinks.map((row) => (
                        <div key={row.id} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '12px', display: 'grid', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px auto', gap: '10px', alignItems: 'end' }}>
                            <label>
                              <span>Provider group</span>
                              <select value={row.provider_group_id} onChange={(e) => updateRelation(setProviderGroupLinks, row.id, { provider_group_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle} disabled={service.__deleted}>
                                <option value="">Select group</option>
                                {providerGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                              </select>
                            </label>
                            <label>
                              <span>Assignment mode</span>
                              <select value={row.assignment_mode} onChange={(e) => updateRelation(setProviderGroupLinks, row.id, { assignment_mode: e.target.value })} style={fieldStyle} disabled={service.__deleted}>
                                <option value="any">Any</option>
                                <option value="preferred">Preferred</option>
                                <option value="required">Required</option>
                              </select>
                            </label>
                            <button type="button" className="btn btn-small btn-interactive" onClick={() => removeRelation({ id: row.id, setter: setProviderGroupLinks, deletedSetter: setDeletedServiceProviderGroupIds })} disabled={service.__deleted} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Remove</button>
                          </div>
                          <div style={helperTextStyle}>Current link: {row.provider_group_id ? lookupLabel(providerGroupLookup, row.provider_group_id) : 'Unassigned'} ({row.assignment_mode})</div>
                        </div>
                      ))}
                    </div>
                  )}
                </AdminSection>

                <AdminSection eyebrow="RESOURCES" title="Operational resources" description="Resource links enforce room / chair / device capacity during availability, booking, and reschedule." actions={relationAvailability.resources ? <button type="button" className="btn btn-small btn-interactive" onClick={() => addResourceLink(service.id)} disabled={service.__deleted}>+ Add resource</button> : null}>
                  {!relationAvailability.resources ? (
                    <EmptyState title="Resource links unavailable" description="resources or service_resources table is missing. Resource-capacity rules cannot be activated yet." />
                  ) : currentResourceLinks.length === 0 ? (
                    <EmptyState title="No resource linked yet" description="Add chairs, rooms, devices, or equipment when this service consumes finite operational inventory." />
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {currentResourceLinks.map((row) => (
                        <div key={row.id} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '12px', display: 'grid', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 100px auto auto', gap: '10px', alignItems: 'end' }}>
                            <label>
                              <span>Resource</span>
                              <select value={row.resource_id} onChange={(e) => updateRelation(setResourceLinks, row.id, { resource_id: e.target.value === '' ? '' : Number(e.target.value) })} style={fieldStyle} disabled={service.__deleted}>
                                <option value="">Select resource</option>
                                {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                              </select>
                            </label>
                            <label><span>Qty</span><input type="number" min="1" value={row.quantity} onChange={(e) => updateRelation(setResourceLinks, row.id, { quantity: Number(e.target.value || 1) })} disabled={service.__deleted} /></label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px' }}><input type="checkbox" checked={row.required !== false} onChange={(e) => updateRelation(setResourceLinks, row.id, { required: e.target.checked })} disabled={service.__deleted} /><span>Required</span></label>
                            <button type="button" className="btn btn-small btn-interactive" onClick={() => removeRelation({ id: row.id, setter: setResourceLinks, deletedSetter: setDeletedServiceResourceIds })} disabled={service.__deleted} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Remove</button>
                          </div>
                          <div style={helperTextStyle}>Current link: {row.resource_id ? lookupLabel(resourceLookup, row.resource_id) : 'Unassigned'} x{row.quantity}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </AdminSection>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

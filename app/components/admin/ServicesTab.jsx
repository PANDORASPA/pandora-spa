'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminSection, EmptyState, StatusPill } from './AdminConfigKit'
import { fieldStyle } from './opsUi'

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240]
const SLOT_STEP_OPTIONS = ['', 30, 60]

const tempId = () => Math.floor(Date.now() * 100 + Math.random() * 99)
const isPersisted = (id) => Number.isInteger(id) && id > 0 && id < 2147483647
const toId = (value) => {
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

const helperTextStyle = { fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.5 }
const listTableCellStyle = { padding: '12px 10px', borderBottom: '1px solid #F0ECE6', verticalAlign: 'middle' }

const normalizeService = (service) => ({
  ...service,
  id: service?.id ?? tempId(),
  price: Number(service?.price || 0),
  time: DURATION_OPTIONS.includes(Number(service?.time)) ? Number(service.time) : 60,
  buffer_min: Number(service?.buffer_min || 0),
  sort_order: Number(service?.sort_order || 0),
  slot_step_min: service?.slot_step_min == null || service?.slot_step_min === '' ? '' : Number(service.slot_step_min || 0),
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
const lookupLabel = (lookup, id) => lookup[toId(id)]?.name || lookup[toId(id)]?.title || '-'

function SectionField({ label, children, hint }) {
  return (
    <label style={{ display: 'grid', gap: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{label}</span>
      {children}
      {hint ? <span style={helperTextStyle}>{hint}</span> : null}
    </label>
  )
}

function RelationRow({ children, meta }) {
  return (
    <div className="admin-relation-row">
      {children}
      {meta ? <div style={helperTextStyle}>{meta}</div> : null}
    </div>
  )
}

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
  compact = false,
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
  const [selectedServiceId, setSelectedServiceId] = useState(null)

  useEffect(() => {
    const nextServices = (initialServices || []).map(normalizeService)
    setServices(nextServices)
    setLocationLinks((serviceLocations || []).map(normalizeLocationLink))
    setProviderGroupLinks((serviceProviderGroups || []).map(normalizeProviderGroupLink))
    setResourceLinks((serviceResources || []).map(normalizeResourceLink))
    setDeletedIds([])
    setDeletedServiceLocationIds([])
    setDeletedServiceProviderGroupIds([])
    setDeletedServiceResourceIds([])
    setSelectedServiceId((current) => current ?? nextServices[0]?.id ?? null)
  }, [initialServices, serviceLocations, serviceProviderGroups, serviceResources])

  const locationLookup = useMemo(() => buildLookup(locations), [locations])
  const providerGroupLookup = useMemo(() => buildLookup(providerGroups), [providerGroups])
  const resourceLookup = useMemo(() => buildLookup(resources), [resources])

  const relationAvailability = {
    locations: availableTables?.locations !== false && availableTables?.serviceLocations !== false,
    providerGroups: availableTables?.providerGroups !== false && availableTables?.serviceProviderGroups !== false,
    resources: availableTables?.resources !== false && availableTables?.serviceResources !== false,
  }

  const visibleServices = useMemo(() => [...services].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [services])
  const selectedService = useMemo(
    () => visibleServices.find((service) => String(service.id) === String(selectedServiceId)) || null,
    [selectedServiceId, visibleServices],
  )

  const activeCount = visibleServices.filter((service) => service.enabled && !service.__deleted).length
  const deletedCount = visibleServices.filter((service) => service.__deleted).length

  const updateService = (id, updater) => {
    setServices((current) => current.map((item) => (item.id === id ? updater(item) : item)))
  }

  const updateRelation = (setter, id, patch) => {
    setter((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const relationsForService = (rows, serviceId) => rows.filter((row) => String(row.service_id) === String(serviceId))

  const addService = () => {
    const nextId = tempId()
    const draft = normalizeService({
      id: nextId,
      name: '',
      price: 0,
      time: 60,
      buffer_min: 0,
      image_url: '',
      emoji: '*',
      enabled: true,
      sort_order: services.length,
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
    })

    setServices((current) => [draft, ...current])
    setSelectedServiceId(nextId)
  }

  const toggleDeleteService = (id) => {
    const service = services.find((item) => item.id === id)
    if (!service) return

    if (service.__isNew) {
      setServices((current) => current.filter((item) => item.id !== id))
      setLocationLinks((current) => current.filter((row) => String(row.service_id) !== String(id)))
      setProviderGroupLinks((current) => current.filter((row) => String(row.service_id) !== String(id)))
      setResourceLinks((current) => current.filter((row) => String(row.service_id) !== String(id)))
      setSelectedServiceId((current) => (String(current) === String(id) ? null : current))
      return
    }

    setServices((current) => current.map((item) => (item.id === id ? { ...item, __deleted: !item.__deleted } : item)))
    setDeletedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const addLocationLink = (serviceId) => {
    const unused = (locations || []).find(
      (location) => !locationLinks.some((row) => String(row.service_id) === String(serviceId) && Number(row.location_id) === Number(location.id)),
    )
    setLocationLinks((current) => [...current, normalizeLocationLink({ service_id: serviceId, location_id: unused?.id ?? '', extra_price: 0, enabled: true })])
  }

  const addProviderGroupLink = (serviceId) => {
    const unused = (providerGroups || []).find(
      (group) => !providerGroupLinks.some((row) => String(row.service_id) === String(serviceId) && Number(row.provider_group_id) === Number(group.id)),
    )
    setProviderGroupLinks((current) => [...current, normalizeProviderGroupLink({ service_id: serviceId, provider_group_id: unused?.id ?? '', assignment_mode: 'any' })])
  }

  const addResourceLink = (serviceId) => {
    const unused = (resources || []).find(
      (resource) => !resourceLinks.some((row) => String(row.service_id) === String(serviceId) && Number(row.resource_id) === Number(resource.id)),
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

  const currentLocationLinks = selectedService ? relationsForService(locationLinks, selectedService.id) : []
  const currentProviderGroupLinks = selectedService ? relationsForService(providerGroupLinks, selectedService.id) : []
  const currentResourceLinks = selectedService ? relationsForService(resourceLinks, selectedService.id) : []

  return (
    <div className="admin-page-stack">
      <div className="admin-card admin-command-panel">
        <div>
          <div className="admin-eyebrow">服務設定</div>
          <div className="admin-command-title">服務內容與預約規則</div>
          <div className="admin-command-description">
            左側管理服務列表，右側編輯價格、時長、預約模式、地點、服務人員群組與資源容量。
          </div>
        </div>
        <div className="admin-inline-actions">
          <StatusPill tone="success">{activeCount} 項啟用</StatusPill>
          {deletedCount ? <StatusPill tone="danger">{deletedCount} 項待刪除</StatusPill> : null}
          <StatusPill tone="accent">{visibleServices.length} 項服務</StatusPill>
          <button onClick={addService} className="btn btn-small btn-interactive" type="button">
            新增服務
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-small btn-interactive" type="button" style={{ background: '#34D399', minWidth: '122px' }}>
            {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(360px, 420px) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <div className="admin-card admin-table-shell">
          {visibleServices.length === 0 ? (
            <EmptyState title="尚未建立服務" description="請先新增服務，再設定價格、時長與預約規則。" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-data-table">
                <thead>
                  <tr>
                    {['服務', '價格', '時長', '狀態', '操作'].map((label) => (
                      <th key={label} style={{ textAlign: 'left' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleServices.map((service) => {
                    const isSelected = String(service.id) === String(selectedServiceId)
                    return (
                      <tr key={service.id} className={isSelected ? 'admin-row-selected' : ''}>
                        <td style={listTableCellStyle}>
                          <div style={{ fontWeight: 800, color: 'var(--text)' }}>{service.name || '未命名服務'}</div>
                          <div className="admin-muted-line">
                            {service.category || '未分類'}
                            {service.__isNew ? ' / 新增草稿' : ''}
                          </div>
                        </td>
                        <td style={listTableCellStyle}>${Number(service.price || 0).toLocaleString()}</td>
                        <td style={listTableCellStyle}>{service.time} 分鐘</td>
                        <td style={listTableCellStyle}>
                          <StatusPill tone={service.__deleted ? 'danger' : service.enabled ? 'success' : 'neutral'}>
                            {service.__deleted ? '待刪除' : service.enabled ? '啟用中' : '已隱藏'}
                          </StatusPill>
                        </td>
                        <td style={listTableCellStyle}>
                          <div className="admin-row-actions" style={{ justifyContent: 'flex-start' }}>
                            <button type="button" className="btn btn-small btn-interactive" onClick={() => setSelectedServiceId(service.id)}>
                              {isSelected ? '編輯中' : '編輯'}
                            </button>
                            <button onClick={() => toggleDeleteService(service.id)} className="btn btn-small btn-interactive" type="button" style={{ background: service.__deleted ? '#ECFDF5' : '#FEF2F2', color: service.__deleted ? '#166534' : '#DC2626', border: '1px solid rgba(220,38,38,0.15)' }}>
                              {service.__deleted ? '還原' : '刪除'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedService ? (
          <div className="admin-page-stack">
            <div className="admin-card admin-command-panel">
              <div>
                <div className="admin-eyebrow">編輯服務</div>
                <div className="admin-command-title">{selectedService.name || '未命名服務'}</div>
                <div className="admin-command-description">
                  預設地點：{selectedService.default_location_id ? lookupLabel(locationLookup, selectedService.default_location_id) : '未設定'} / 預設群組：{selectedService.default_provider_group_id ? lookupLabel(providerGroupLookup, selectedService.default_provider_group_id) : '未設定'}
                </div>
              </div>
              <StatusPill tone={selectedService.enabled ? 'success' : 'neutral'}>{selectedService.enabled ? '啟用中' : '已隱藏'}</StatusPill>
            </div>

            <AdminSection eyebrow="基本資料" title="服務資訊" description="管理前台顯示名稱、分類、介紹與圖片。">
              <div className="admin-form-grid">
                <SectionField label="服務名稱">
                  <input value={selectedService.name || ''} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, name: event.target.value }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="分類">
                  <input value={selectedService.category || ''} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, category: event.target.value }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="圖示 / Emoji">
                  <input value={selectedService.emoji || ''} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, emoji: event.target.value }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="排序">
                  <input type="number" value={selectedService.sort_order} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, sort_order: Number(event.target.value || 0) }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="圖片 URL" hint="可留空，前台會使用預設視覺。">
                  <input value={selectedService.image_url || ''} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, image_url: event.target.value }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="狀態">
                  <select value={selectedService.enabled ? 'enabled' : 'hidden'} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, enabled: event.target.value === 'enabled' }))} style={fieldStyle}>
                    <option value="enabled">啟用</option>
                    <option value="hidden">隱藏</option>
                  </select>
                </SectionField>
                <div style={{ gridColumn: '1 / -1' }}>
                  <SectionField label="描述">
                    <textarea value={selectedService.description || ''} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, description: event.target.value }))} style={{ ...fieldStyle, minHeight: '96px', resize: 'vertical' }} />
                  </SectionField>
                </div>
              </div>
            </AdminSection>

            <AdminSection eyebrow="價格與時長" title="商業與預約規則" description="控制前台價格、服務時長、緩衝時間與可預約數量。">
              <div className="admin-form-grid compact">
                <SectionField label="價格">
                  <input type="number" min="0" value={selectedService.price} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, price: Number(event.target.value || 0) }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="服務時長">
                  <select value={selectedService.time} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, time: Number(event.target.value || 60) }))} style={fieldStyle}>
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} 分鐘
                      </option>
                    ))}
                  </select>
                </SectionField>
                <SectionField label="緩衝時間">
                  <input type="number" min="0" step="5" value={selectedService.buffer_min} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, buffer_min: Number(event.target.value || 0) }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="時段步長" hint="未設定時使用系統預設。">
                  <select value={selectedService.slot_step_min === '' ? '' : Number(selectedService.slot_step_min)} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, slot_step_min: event.target.value === '' ? '' : Number(event.target.value) }))} style={fieldStyle}>
                    <option value="">跟隨系統預設</option>
                    {SLOT_STEP_OPTIONS.filter(Boolean).map((step) => (
                      <option key={step} value={step}>
                        {step} 分鐘
                      </option>
                    ))}
                  </select>
                </SectionField>
                <SectionField label="最少數量">
                  <input type="number" min="1" value={selectedService.min_booking_qty} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, min_booking_qty: Number(event.target.value || 1) }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="最多數量">
                  <input type="number" min="1" value={selectedService.max_booking_qty} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, max_booking_qty: Number(event.target.value || 1) }))} style={fieldStyle} />
                </SectionField>
                <SectionField label="預約模式" hint="支援現有 availability routing。">
                  <select value={selectedService.booking_mode} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, booking_mode: event.target.value }))} style={fieldStyle}>
                    <option value="staff">服務供應者</option>
                    <option value="provider_group">服務供應者群組</option>
                    <option value="resource">資源設備</option>
                    <option value="hybrid">混合模式</option>
                  </select>
                </SectionField>
              </div>
            </AdminSection>

            <AdminSection eyebrow="預設對應" title="地點與群組預設" description="設定安全 fallback，不取代下方 relation 規則。">
              <div className="admin-form-grid">
                <SectionField label="預設地點">
                  <select value={selectedService.default_location_id} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, default_location_id: event.target.value }))} style={fieldStyle}>
                    <option value="">未設定</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </SectionField>
                <SectionField label="預設服務供應者群組">
                  <select value={selectedService.default_provider_group_id} onChange={(event) => updateService(selectedService.id, (item) => ({ ...item, default_provider_group_id: event.target.value }))} style={fieldStyle}>
                    <option value="">未設定</option>
                    {providerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </SectionField>
              </div>
            </AdminSection>

            <div className="admin-relation-grid">
              <AdminSection eyebrow="地點關聯" title="可預約地點" description="設定這項服務可在哪些地點提供。" actions={relationAvailability.locations ? <button type="button" className="btn btn-small btn-interactive" onClick={() => addLocationLink(selectedService.id)}>新增地點</button> : null}>
                {!relationAvailability.locations ? (
                  <EmptyState title="地點關聯未啟用" description="locations 或 service_locations 尚未可用。" />
                ) : currentLocationLinks.length === 0 ? (
                  <EmptyState title="未連結地點" description="請至少加入一個地點，避免前台使用保守 fallback。" />
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {currentLocationLinks.map((row) => (
                      <RelationRow key={row.id} meta={`目前地點：${row.location_id ? lookupLabel(locationLookup, row.location_id) : '未指定'}`}>
                        <div className="admin-relation-controls">
                          <SectionField label="地點">
                            <select value={row.location_id} onChange={(event) => updateRelation(setLocationLinks, row.id, { location_id: event.target.value === '' ? '' : Number(event.target.value) })} style={fieldStyle}>
                              <option value="">選擇地點</option>
                              {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.name}
                                </option>
                              ))}
                            </select>
                          </SectionField>
                          <SectionField label="額外價格">
                            <input type="number" value={row.extra_price} onChange={(event) => updateRelation(setLocationLinks, row.id, { extra_price: Number(event.target.value || 0) })} style={fieldStyle} />
                          </SectionField>
                          <SectionField label="狀態">
                            <select value={row.enabled !== false ? 'enabled' : 'hidden'} onChange={(event) => updateRelation(setLocationLinks, row.id, { enabled: event.target.value === 'enabled' })} style={fieldStyle}>
                              <option value="enabled">啟用</option>
                              <option value="hidden">停用</option>
                            </select>
                          </SectionField>
                          <button type="button" className="btn btn-small btn-interactive" onClick={() => removeRelation({ id: row.id, setter: setLocationLinks, deletedSetter: setDeletedServiceLocationIds })} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                            移除
                          </button>
                        </div>
                      </RelationRow>
                    ))}
                  </div>
                )}
              </AdminSection>

              <AdminSection eyebrow="群組關聯" title="可用服務供應者群組" description="控制這項服務可由哪些服務人員群組提供。" actions={relationAvailability.providerGroups ? <button type="button" className="btn btn-small btn-interactive" onClick={() => addProviderGroupLink(selectedService.id)}>新增群組</button> : null}>
                {!relationAvailability.providerGroups ? (
                  <EmptyState title="群組關聯未啟用" description="provider_groups 或 service_provider_groups 尚未可用。" />
                ) : currentProviderGroupLinks.length === 0 ? (
                  <EmptyState title="未連結群組" description="如服務需要限定特定群組，請在此加入。" />
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {currentProviderGroupLinks.map((row) => (
                      <RelationRow key={row.id} meta={`目前群組：${row.provider_group_id ? lookupLabel(providerGroupLookup, row.provider_group_id) : '未指定'}`}>
                        <div className="admin-relation-controls provider">
                          <SectionField label="服務供應者群組">
                            <select value={row.provider_group_id} onChange={(event) => updateRelation(setProviderGroupLinks, row.id, { provider_group_id: event.target.value === '' ? '' : Number(event.target.value) })} style={fieldStyle}>
                              <option value="">選擇群組</option>
                              {providerGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </SectionField>
                          <SectionField label="分派模式">
                            <select value={row.assignment_mode} onChange={(event) => updateRelation(setProviderGroupLinks, row.id, { assignment_mode: event.target.value })} style={fieldStyle}>
                              <option value="any">任何</option>
                              <option value="preferred">優先</option>
                              <option value="required">必須</option>
                            </select>
                          </SectionField>
                          <button type="button" className="btn btn-small btn-interactive" onClick={() => removeRelation({ id: row.id, setter: setProviderGroupLinks, deletedSetter: setDeletedServiceProviderGroupIds })} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                            移除
                          </button>
                        </div>
                      </RelationRow>
                    ))}
                  </div>
                )}
              </AdminSection>
            </div>

            <AdminSection eyebrow="資源設備" title="服務所需資源" description="設定會影響 availability / create / reschedule 的資源容量。" actions={relationAvailability.resources ? <button type="button" className="btn btn-small btn-interactive" onClick={() => addResourceLink(selectedService.id)}>新增資源</button> : null}>
              {!relationAvailability.resources ? (
                <EmptyState title="資源關聯未啟用" description="resources 或 service_resources 尚未可用。" />
              ) : currentResourceLinks.length === 0 ? (
                <EmptyState title="未連結資源" description="如服務會使用房間、座位或設備，請在此加入。" />
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {currentResourceLinks.map((row) => (
                    <RelationRow key={row.id} meta={`目前資源：${row.resource_id ? lookupLabel(resourceLookup, row.resource_id) : '未指定'} x${row.quantity}`}>
                      <div className="admin-relation-controls">
                        <SectionField label="資源設備">
                          <select value={row.resource_id} onChange={(event) => updateRelation(setResourceLinks, row.id, { resource_id: event.target.value === '' ? '' : Number(event.target.value) })} style={fieldStyle}>
                            <option value="">選擇資源</option>
                            {resources.map((resource) => (
                              <option key={resource.id} value={resource.id}>
                                {resource.name}
                              </option>
                            ))}
                          </select>
                        </SectionField>
                        <SectionField label="數量">
                          <input type="number" min="1" value={row.quantity} onChange={(event) => updateRelation(setResourceLinks, row.id, { quantity: Number(event.target.value || 1) })} style={fieldStyle} />
                        </SectionField>
                        <SectionField label="是否必須">
                          <select value={row.required !== false ? 'required' : 'optional'} onChange={(event) => updateRelation(setResourceLinks, row.id, { required: event.target.value === 'required' })} style={fieldStyle}>
                            <option value="required">必須</option>
                            <option value="optional">可選</option>
                          </select>
                        </SectionField>
                        <button type="button" className="btn btn-small btn-interactive" onClick={() => removeRelation({ id: row.id, setter: setResourceLinks, deletedSetter: setDeletedServiceResourceIds })} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                          移除
                        </button>
                      </div>
                    </RelationRow>
                  ))}
                </div>
              )}
            </AdminSection>
          </div>
        ) : (
          <EmptyState title="請先選擇服務" description="從左邊列表選擇一項服務，或先新增服務。" />
        )}
      </div>
    </div>
  )
}

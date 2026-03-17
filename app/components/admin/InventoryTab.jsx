'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

async function syncTable(table, rows) {
  const { data: existingRows, error: fetchError } = await supabase.from(table).select('id')
  if (fetchError) throw fetchError

  const existingIds = (existingRows || []).map((item) => item.id).filter(Boolean)
  const nextIds = rows.map((item) => item.id).filter((id) => typeof id === 'number' && id <= 2147483647)
  const deletedIds = existingIds.filter((id) => !nextIds.includes(id))

  if (deletedIds.length > 0) {
    const { error: deleteError } = await supabase.from(table).delete().in('id', deletedIds)
    if (deleteError) throw deleteError
  }

  for (const row of rows) {
    const payload = { ...row }
    if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
    const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' })
    if (error) throw error
  }
}

export default function InventoryTab({ products: initialProducts, packages: initialPackages, tickets: initialTickets, services, fetchData }) {
  const [products, setProducts] = useState(initialProducts)
  const [packages, setPackages] = useState(initialPackages)
  const [tickets, setTickets] = useState(initialTickets)
  const [subTab, setSubTab] = useState('products')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  useEffect(() => {
    setPackages(initialPackages)
  }, [initialPackages])

  useEffect(() => {
    setTickets(initialTickets)
  }, [initialTickets])

  const saveProducts = async () => {
    setSaving(true)
    try {
      await syncTable('products', products)
      if (fetchData) await fetchData()
      toast.success('產品已保存')
    } catch (error) {
      toast.error('產品保存失敗: ' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const savePackages = async () => {
    setSaving(true)
    try {
      await syncTable('service_packages', packages)
      if (fetchData) await fetchData()
      toast.success('套餐已保存')
    } catch (error) {
      toast.error('套餐保存失敗: ' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  const saveTickets = async () => {
    setSaving(true)
    try {
      await syncTable('tickets', tickets)
      if (fetchData) await fetchData()
      toast.success('套票已保存')
    } catch (error) {
      toast.error('套票保存失敗: ' + (error?.message || '未知錯誤'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="admin-card hide-scrollbar" style={{ display: 'flex', gap: '10px', marginBottom: '24px', padding: '12px', overflowX: 'auto' }}>
        {[
          ['products', '產品'],
          ['packages', '套餐'],
          ['tickets', '套票'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`admin-tab-btn ${subTab === key ? 'active' : ''}`}
            style={{
              padding: '10px 20px',
              background: subTab === key ? 'var(--primary)' : 'transparent',
              color: subTab === key ? '#fff' : 'var(--text-light)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'products' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <button onClick={() => setProducts([{ id: Date.now(), name: '新產品', price: 0, stock: 0, enabled: true }, ...products])} className="btn btn-small btn-interactive">
              + 新增產品
            </button>
            <button onClick={saveProducts} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
              {saving ? '保存中...' : '保存產品'}
            </button>
          </div>
          <div className="grid">
            {products.map((product) => (
              <div key={product.id} className="admin-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label>產品名稱</label>
                  <input value={product.name} onChange={(event) => setProducts(products.map((item) => (item.id === product.id ? { ...item, name: event.target.value } : item)))} style={{ fontWeight: 600 }} />
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label>價格</label>
                    <input type="number" value={product.price || 0} onChange={(event) => setProducts(products.map((item) => (item.id === product.id ? { ...item, price: parseInt(event.target.value, 10) || 0 } : item)))} />
                  </div>
                  <div>
                    <label>庫存</label>
                    <input type="number" value={product.stock || 0} onChange={(event) => setProducts(products.map((item) => (item.id === product.id ? { ...item, stock: parseInt(event.target.value, 10) || 0 } : item)))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={!!product.enabled} onChange={(event) => setProducts(products.map((item) => (item.id === product.id ? { ...item, enabled: event.target.checked } : item)))} style={{ width: 'auto' }} />
                    <span style={{ fontSize: '14px' }}>啟用</span>
                  </label>
                  <button onClick={() => setProducts(products.filter((item) => item.id !== product.id))} className="btn-interactive" style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'packages' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <button onClick={() => setPackages([{ id: Date.now(), name: '新套餐', price: 0, description: '', enabled: true }, ...packages])} className="btn btn-small btn-interactive">
              + 新增套餐
            </button>
            <button onClick={savePackages} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
              {saving ? '保存中...' : '保存套餐'}
            </button>
          </div>
          <div className="grid">
            {packages.map((pkg) => (
              <div key={pkg.id} className="admin-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label>套餐名稱</label>
                  <input value={pkg.name} onChange={(event) => setPackages(packages.map((item) => (item.id === pkg.id ? { ...item, name: event.target.value } : item)))} style={{ fontWeight: 700 }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>價格</label>
                  <input type="number" value={pkg.price || 0} onChange={(event) => setPackages(packages.map((item) => (item.id === pkg.id ? { ...item, price: parseInt(event.target.value, 10) || 0 } : item)))} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>內容描述</label>
                  <textarea value={pkg.description || ''} onChange={(event) => setPackages(packages.map((item) => (item.id === pkg.id ? { ...item, description: event.target.value } : item)))} style={{ minHeight: '100px', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={!!pkg.enabled} onChange={(event) => setPackages(packages.map((item) => (item.id === pkg.id ? { ...item, enabled: event.target.checked } : item)))} style={{ width: 'auto' }} />
                    <span style={{ fontSize: '14px' }}>啟用</span>
                  </label>
                  <button onClick={() => setPackages(packages.filter((item) => item.id !== pkg.id))} className="btn-interactive" style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'tickets' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <button onClick={() => setTickets([{ id: Date.now(), name: '新套票', price: 0, count: 10, enabled: true }, ...tickets])} className="btn btn-small btn-interactive">
              + 新增套票
            </button>
            <button onClick={saveTickets} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
              {saving ? '保存中...' : '保存套票'}
            </button>
          </div>
          <div className="grid">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="admin-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label>套票名稱</label>
                  <input value={ticket.name} onChange={(event) => setTickets(tickets.map((item) => (item.id === ticket.id ? { ...item, name: event.target.value } : item)))} style={{ fontWeight: 700 }} />
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label>價格</label>
                    <input type="number" value={ticket.price || 0} onChange={(event) => setTickets(tickets.map((item) => (item.id === ticket.id ? { ...item, price: parseInt(event.target.value, 10) || 0 } : item)))} />
                  </div>
                  <div>
                    <label>次數</label>
                    <input type="number" value={ticket.count || 0} onChange={(event) => setTickets(tickets.map((item) => (item.id === ticket.id ? { ...item, count: parseInt(event.target.value, 10) || 0 } : item)))} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>綁定服務</label>
                  <select value={ticket.service_id || ''} onChange={(event) => setTickets(tickets.map((item) => (item.id === ticket.id ? { ...item, service_id: event.target.value ? parseInt(event.target.value, 10) : null } : item)))}>
                    <option value="">不限制</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={!!ticket.enabled} onChange={(event) => setTickets(tickets.map((item) => (item.id === ticket.id ? { ...item, enabled: event.target.checked } : item)))} style={{ width: 'auto' }} />
                    <span style={{ fontSize: '14px' }}>啟用</span>
                  </label>
                  <button onClick={() => setTickets(tickets.filter((item) => item.id !== ticket.id))} className="btn-interactive" style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

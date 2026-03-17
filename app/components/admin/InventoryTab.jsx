'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

export default function InventoryTab({ products: initialProducts, packages: initialPackages, tickets: initialTickets, services, fetchData }) {
  const [products, setProducts] = useState(initialProducts)
  const [packages, setPackages] = useState(initialPackages)
  const [tickets, setTickets] = useState(initialTickets)
  const [subTab, setSubTab] = useState('products')
  const [saving, setSaving] = useState(false)

  // Sync state with props when data is refreshed
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
    for (const p of products) {
      const payload = { ...p }
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      await supabase.from('products').upsert(payload)
    }
    if (fetchData) await fetchData()
    toast.success('產品已保存')
    setSaving(false)
  }

  const savePackages = async () => {
    setSaving(true)
    for (const p of packages) {
      const payload = { ...p }
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      await supabase.from('service_packages').upsert(payload)
    }
    if (fetchData) await fetchData()
    toast.success('套餐已保存')
    setSaving(false)
  }

  const saveTickets = async () => {
    setSaving(true)
    for (const t of tickets) {
      const payload = { ...t }
      if (typeof payload.id === 'number' && payload.id > 2147483647) delete payload.id
      await supabase.from('tickets').upsert(payload)
    }
    if (fetchData) await fetchData()
    toast.success('套票已保存')
    setSaving(false)
  }

  return (
    <div>
      <div className="admin-card hide-scrollbar" style={{ display: 'flex', gap: '10px', marginBottom: '24px', padding: '12px', overflowX: 'auto' }}>
        <button 
          onClick={() => setSubTab('products')} 
          className={`admin-tab-btn ${subTab === 'products' ? 'active' : ''}`} 
          style={{ 
            padding: '10px 20px', 
            background: subTab === 'products' ? 'var(--primary)' : 'transparent', 
            color: subTab === 'products' ? '#fff' : 'var(--text-light)', 
            borderRadius: '10px', 
            fontSize: '14px', 
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          🛒 產品管理
        </button>
        <button 
          onClick={() => setSubTab('packages')} 
          className={`admin-tab-btn ${subTab === 'packages' ? 'active' : ''}`} 
          style={{ 
            padding: '10px 20px', 
            background: subTab === 'packages' ? 'var(--primary)' : 'transparent', 
            color: subTab === 'packages' ? '#fff' : 'var(--text-light)', 
            borderRadius: '10px', 
            fontSize: '14px', 
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          🎁 服務套餐
        </button>
        <button 
          onClick={() => setSubTab('tickets')} 
          className={`admin-tab-btn ${subTab === 'tickets' ? 'active' : ''}`} 
          style={{ 
            padding: '10px 20px', 
            background: subTab === 'tickets' ? 'var(--primary)' : 'transparent', 
            color: subTab === 'tickets' ? '#fff' : 'var(--text-light)', 
            borderRadius: '10px', 
            fontSize: '14px', 
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          🎫 儲值套票
        </button>
      </div>

      {subTab === 'products' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setProducts([{ id: Date.now(), name: '新產品', price: 0, stock: 0, enabled: true }, ...products])} 
              className="btn btn-small btn-interactive"
            >
              + 新增產品
            </button>
            <button 
              onClick={saveProducts} 
              disabled={saving} 
              className="btn btn-small btn-interactive" 
              style={{ background: '#34D399' }}
            >
              {saving && <span className="spinner"></span>}
              {saving ? '儲存中...' : '💾 儲存變更'}
            </button>
          </div>
          <div className="grid">
            {products.map(p => (
              <div key={p.id} className="admin-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label>產品名稱</label>
                  <input 
                    value={p.name} 
                    onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} 
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label>價格 ($)</label>
                    <input 
                      type="number" 
                      value={p.price} 
                      onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, price: parseInt(e.target.value)} : x))} 
                    />
                  </div>
                  <div>
                    <label>庫存</label>
                    <input 
                      type="number" 
                      value={p.stock} 
                      onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, stock: parseInt(e.target.value)} : x))} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={p.enabled} 
                      onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, enabled: e.target.checked} : x))} 
                      style={{ width: 'auto' }}
                    /> 
                    <span style={{ fontSize: '14px' }}>啟用銷售</span>
                  </label>
                  <button 
                    onClick={() => setProducts(products.filter(x => x.id !== p.id))} 
                    className="btn-interactive" 
                    style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  >
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
            <button 
              onClick={() => setPackages([{ id: Date.now(), name: '新套餐', price: 0, description: '', enabled: true }, ...packages])} 
              className="btn btn-small btn-interactive"
            >
              + 新增套餐
            </button>
            <button 
              onClick={savePackages} 
              disabled={saving} 
              className="btn btn-small btn-interactive" 
              style={{ background: '#34D399' }}
            >
              {saving && <span className="spinner"></span>}
              {saving ? '儲存中...' : '💾 儲存變更'}
            </button>
          </div>
          <div className="grid">
            {packages.map(p => (
              <div key={p.id} className="admin-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label>套餐名稱</label>
                  <input 
                    value={p.name} 
                    onChange={e => setPackages(packages.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} 
                    style={{ fontWeight: 700 }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>價格 ($)</label>
                  <input 
                    type="number" 
                    value={p.price} 
                    onChange={e => setPackages(packages.map(x => x.id === p.id ? {...x, price: parseInt(e.target.value)} : x))} 
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>套餐內容描述</label>
                  <textarea 
                    value={p.description || ''} 
                    onChange={e => setPackages(packages.map(x => x.id === p.id ? {...x, description: e.target.value} : x))} 
                    placeholder="例如：剪髮 + 染髮 + 護理 (送產品乙件)" 
                    style={{ minHeight: '100px', resize: 'vertical' }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={p.enabled} 
                      onChange={e => setPackages(packages.map(x => x.id === p.id ? {...x, enabled: e.target.checked} : x))} 
                      style={{ width: 'auto' }}
                    /> 
                    <span style={{ fontSize: '14px' }}>啟用</span>
                  </label>
                  <button 
                    onClick={() => setPackages(packages.filter(x => x.id !== p.id))} 
                    className="btn-interactive" 
                    style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  >
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
            <button 
              onClick={() => setTickets([{ id: Date.now(), name: '新套票', price: 0, count: 10, enabled: true }, ...tickets])} 
              className="btn btn-small btn-interactive"
            >
              + 新增套票
            </button>
            <button 
              onClick={saveTickets} 
              disabled={saving} 
              className="btn btn-small btn-interactive" 
              style={{ background: '#34D399' }}
            >
              {saving && <span className="spinner"></span>}
              {saving ? '儲存中...' : '💾 儲存變更'}
            </button>
          </div>
          <div className="grid">
            {tickets.map(t => (
              <div key={t.id} className="admin-card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label>套票名稱</label>
                  <input 
                    value={t.name} 
                    onChange={e => setTickets(tickets.map(x => x.id === t.id ? {...x, name: e.target.value} : x))} 
                    style={{ fontWeight: 700 }}
                  />
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label>價格 ($)</label>
                    <input 
                      type="number" 
                      value={t.price} 
                      onChange={e => setTickets(tickets.map(x => x.id === t.id ? {...x, price: parseInt(e.target.value)} : x))} 
                    />
                  </div>
                  <div>
                    <label>包含次數</label>
                    <input 
                      type="number" 
                      value={t.count} 
                      onChange={e => setTickets(tickets.map(x => x.id === t.id ? {...x, count: parseInt(e.target.value)} : x))} 
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label>對應服務項目</label>
                  <select 
                    value={t.service_id || ''} 
                    onChange={e => setTickets(tickets.map(x => x.id === t.id ? {...x, service_id: parseInt(e.target.value)} : x))}
                  >
                    <option value="">選擇服務項目...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={t.enabled} 
                      onChange={e => setTickets(tickets.map(x => x.id === t.id ? {...x, enabled: e.target.checked} : x))} 
                      style={{ width: 'auto' }}
                    /> 
                    <span style={{ fontSize: '14px' }}>啟用</span>
                  </label>
                  <button 
                    onClick={() => setTickets(tickets.filter(x => x.id !== t.id))} 
                    className="btn-interactive" 
                    style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  >
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

'use client'
import { useState } from 'react'

// Services Tab Component
export default function ServicesTab({ services: initialServices, saveServices }) {
  const [services, setServices] = useState(initialServices);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const handleSave = async () => {
    setSaving(true);
    await saveServices(services);
    setSaving(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setServices([{ id: Date.now(), name: '', price: 0, time: 60, emoji: '✂️', enabled: true, sort_order: services.length, category: '', description: '' }, ...services])} 
          className="btn btn-small btn-interactive"
        >
          + 新增服務項目
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="btn btn-small btn-interactive" 
          style={{ background: '#34D399' }}
        >
          {saving && <span className="spinner"></span>}
          {saving ? '儲存中...' : '💾 儲存變更'}
        </button>
      </div>

      <div className="grid">
        {services.sort((a,b) => (a.sort_order||0) - (b.sort_order||0)).map(s => (
          <div key={s.id} className="admin-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <label>圖標</label>
                <input 
                  value={s.emoji} 
                  onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).emoji = e.target.value; setServices(n); }} 
                  style={{ width: '64px', height: '64px', fontSize: '32px', textAlign: 'center', padding: 0 }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>服務名稱</label>
                <input 
                  value={s.name} 
                  onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).name = e.target.value; setServices(n); }} 
                  placeholder="例如: 韓式剪髮" 
                  style={{ fontWeight: 700, fontSize: '16px' }} 
                />
              </div>
            </div>
            
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label>價格 ($)</label>
                <input 
                  value={s.price} 
                  onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).price = parseInt(e.target.value) || 0; setServices(n); }} 
                  type="number" 
                />
              </div>
              <div>
                <label>所需時間 (分鐘)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    value={s.time} 
                    onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).time = parseInt(e.target.value) || 60; setServices(n); }} 
                    type="number" 
                  />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-light)' }}>min</span>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label>服務分類</label>
              <input 
                value={s.category || ''} 
                onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).category = e.target.value; setServices(n); }} 
                placeholder="例如: 剪髮, 染髮, 護理" 
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label>服務詳情描述</label>
              <textarea 
                value={s.description || ''} 
                onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).description = e.target.value; setServices(n); }} 
                placeholder="輸入服務的特色或注意事項..." 
                style={{ minHeight: '80px', resize: 'vertical' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--gray)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={s.enabled} 
                  onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).enabled = e.target.checked; setServices(n); }} 
                  style={{ width: 'auto' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>啟用服務</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>排序:</span>
                  <input 
                    type="number" 
                    value={s.sort_order || 0} 
                    onChange={(e) => { const n = [...services]; n.find(x => x.id === s.id).sort_order = parseInt(e.target.value) || 0; setServices(n); }} 
                    style={{ width: '50px', padding: '6px', fontSize: '12px' }} 
                  />
                </div>
                <button 
                  onClick={() => setServices(services.filter(x => x.id !== s.id))} 
                  className="btn-interactive"
                  style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

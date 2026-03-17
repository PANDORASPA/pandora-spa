'use client'

import { useEffect, useState } from 'react'

export default function SettingsTab({ settings, saveSettings }) {
  const [draft, setDraft] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(settings || {})
  }, [settings])

  const handleChange = (key, value) => {
    setDraft(prev => ({ ...(prev || {}), [key]: value }))
  };

  const toggleDayOff = (dayName) => {
    let currentDaysOff = [];
    try {
      // Handle both string and array formats
      currentDaysOff = typeof draft.days_off === 'string' 
        ? (draft.days_off.includes('[') ? JSON.parse(draft.days_off) : draft.days_off.split(',')) 
        : (draft.days_off || []);
    } catch (e) {
      currentDaysOff = draft.days_off ? [draft.days_off] : [];
    }
    
    const newDaysOff = currentDaysOff.includes(dayName)
      ? currentDaysOff.filter(d => d !== dayName)
      : [...currentDaysOff, dayName];
    
    handleChange('days_off', JSON.stringify(newDaysOff));
  };

  const getDaysOff = () => {
    try {
      if (!draft.days_off) return [];
      if (typeof draft.days_off === 'string' && draft.days_off.includes('[')) {
        return JSON.parse(draft.days_off);
      }
      return typeof draft.days_off === 'string' ? draft.days_off.split(',') : (draft.days_off || []);
    } catch (e) {
      return [];
    }
  };

  const daysOff = getDaysOff();

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings(draft || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
      <div className="admin-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🏠 店舖基本設定</h3>
        <div style={{ marginBottom: '16px' }}>
          <label>店名</label>
          <input 
            type="text" 
            value={draft.shop_name || ''} 
            onChange={(e) => handleChange('shop_name', e.target.value)} 
            placeholder="例如: VIVA SALON"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>地址</label>
          <input 
            type="text" 
            value={draft.address || ''} 
            onChange={(e) => handleChange('address', e.target.value)} 
            placeholder="店舖詳細地址"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>電話 / WhatsApp</label>
          <input 
            type="text" 
            value={draft.phone || ''} 
            onChange={(e) => handleChange('phone', e.target.value)} 
            placeholder="聯絡電話"
          />
        </div>
      </div>

      <div className="admin-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🕒 營業與休息設定</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label>營業時間</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="time" 
              value={draft.business_hours?.split('-')[0]?.trim() || '11:00'} 
              onChange={(e) => {
                const end = draft.business_hours?.split('-')[1]?.trim() || '20:00';
                handleChange('business_hours', `${e.target.value} - ${end}`);
              }} 
              style={{ padding: '10px' }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>至</span>
            <input 
              type="time" 
              value={draft.business_hours?.split('-')[1]?.trim() || '20:00'} 
              onChange={(e) => {
                const start = draft.business_hours?.split('-')[0]?.trim() || '11:00';
                handleChange('business_hours', `${start} - ${e.target.value}`);
              }} 
              style={{ padding: '10px' }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '8px' }}>* 將影響預約頁面的可用時段</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>每週休息日</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <button
                key={day}
                onClick={() => toggleDayOff(day)}
                className="btn-interactive"
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  border: '1px solid ' + (daysOff.includes(day) ? '#ef4444' : 'var(--gray)'),
                  background: daysOff.includes(day) ? '#fef2f2' : '#fff',
                  color: daysOff.includes(day) ? '#ef4444' : 'var(--text)',
                  fontWeight: daysOff.includes(day) ? 700 : 500,
                }}
              >
                {day}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '10px' }}>* 紅色標記為店舖全體休息日</p>
        </div>
      </div>

      <div className="admin-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>📜 預約與取消政策</h3>
        <div style={{ marginBottom: '16px' }}>
          <label>預約須知</label>
          <textarea 
            value={draft.booking_policy || ''} 
            onChange={(e) => handleChange('booking_policy', e.target.value)} 
            placeholder="顯示在預約確認頁面的條款..."
            style={{ minHeight: '100px' }} 
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>取消政策</label>
          <textarea 
            value={draft.cancellation_policy || ''} 
            onChange={(e) => handleChange('cancellation_policy', e.target.value)} 
            placeholder="說明取消預約的時限與規則..."
            style={{ minHeight: '100px' }} 
          />
        </div>
      </div>
      </div>
    </div>
  );
}

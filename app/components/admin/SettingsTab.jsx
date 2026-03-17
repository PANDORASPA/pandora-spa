'use client'

export default function SettingsTab({ settings, saveSettings }) {
  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const toggleDayOff = (dayName) => {
    let currentDaysOff = [];
    try {
      // Handle both string and array formats
      currentDaysOff = typeof settings.days_off === 'string' 
        ? (settings.days_off.includes('[') ? JSON.parse(settings.days_off) : settings.days_off.split(',')) 
        : (settings.days_off || []);
    } catch (e) {
      currentDaysOff = settings.days_off ? [settings.days_off] : [];
    }
    
    const newDaysOff = currentDaysOff.includes(dayName)
      ? currentDaysOff.filter(d => d !== dayName)
      : [...currentDaysOff, dayName];
    
    handleChange('days_off', JSON.stringify(newDaysOff));
  };

  const getDaysOff = () => {
    try {
      if (!settings.days_off) return [];
      if (typeof settings.days_off === 'string' && settings.days_off.includes('[')) {
        return JSON.parse(settings.days_off);
      }
      return typeof settings.days_off === 'string' ? settings.days_off.split(',') : (settings.days_off || []);
    } catch (e) {
      return [];
    }
  };

  const daysOff = getDaysOff();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
      <div className="admin-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>🏠 店舖基本設定</h3>
        <div style={{ marginBottom: '16px' }}>
          <label>店名</label>
          <input 
            type="text" 
            value={settings.shop_name || ''} 
            onChange={(e) => handleChange('shop_name', e.target.value)} 
            placeholder="例如: VIVA SALON"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>地址</label>
          <input 
            type="text" 
            value={settings.address || ''} 
            onChange={(e) => handleChange('address', e.target.value)} 
            placeholder="店舖詳細地址"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>電話 / WhatsApp</label>
          <input 
            type="text" 
            value={settings.phone || ''} 
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
              value={settings.business_hours?.split('-')[0]?.trim() || '11:00'} 
              onChange={(e) => {
                const end = settings.business_hours?.split('-')[1]?.trim() || '20:00';
                handleChange('business_hours', `${e.target.value} - ${end}`);
              }} 
              style={{ padding: '10px' }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>至</span>
            <input 
              type="time" 
              value={settings.business_hours?.split('-')[1]?.trim() || '20:00'} 
              onChange={(e) => {
                const start = settings.business_hours?.split('-')[0]?.trim() || '11:00';
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
            value={settings.booking_policy || ''} 
            onChange={(e) => handleChange('booking_policy', e.target.value)} 
            placeholder="顯示在預約確認頁面的條款..."
            style={{ minHeight: '100px' }} 
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>取消政策</label>
          <textarea 
            value={settings.cancellation_policy || ''} 
            onChange={(e) => handleChange('cancellation_policy', e.target.value)} 
            placeholder="說明取消預約的時限與規則..."
            style={{ minHeight: '100px' }} 
          />
        </div>
      </div>
    </div>
  );
}

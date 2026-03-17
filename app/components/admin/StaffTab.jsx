'use client'
import { useState, useEffect } from 'react'

export default function StaffTab({ 
  staff, 
  services, 
  staffShifts = [],
  onAddStaff, 
  onDeleteStaff, 
  onUpdateField, 
  onToggleService, 
  onToggleDailyOff, 
  onUpdateSchedule, 
  onSave, 
  onSaveShifts,
  saving 
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [localShifts, setLocalShifts] = useState(staffShifts)

  useEffect(() => {
    setLocalShifts(staffShifts)
  }, [staffShifts])

  useEffect(() => {
    if (staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id)
    }
  }, [staff])

  const selectedStaff = staff.find(s => s.id === selectedStaffId)

  const handleShiftUpdate = (date, field, value) => {
    const existing = localShifts.find(s => s.staff_id === selectedStaffId && s.date === date)
    let newShifts
    if (existing) {
      newShifts = localShifts.map(s => s === existing ? { ...s, [field]: value } : s)
    } else {
      newShifts = [...localShifts, { staff_id: selectedStaffId, date, [field]: value, is_off: false }]
    }
    setLocalShifts(newShifts)
  }

  const toggleShiftOff = (date) => {
    const existing = localShifts.find(s => s.staff_id === selectedStaffId && s.date === date)
    let newShifts
    if (existing) {
      newShifts = localShifts.map(s => s === existing ? { ...s, is_off: !s.is_off } : s)
    } else {
      newShifts = [...localShifts, { staff_id: selectedStaffId, date, is_off: true }]
    }
    setLocalShifts(newShifts)
  }

  const renderShiftCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const days = []
    
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />)
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const shift = localShifts.find(s => s.staff_id === selectedStaffId && s.date === dateStr)
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay().toString()
      
      // Default from weekly schedule if no specific shift
      const defaultSchedule = selectedStaff?.schedule?.[dayOfWeek]
      const defaultIsOff = selectedStaff?.daysOff?.includes(dayOfWeek)
      
      const isOff = shift ? shift.is_off : defaultIsOff
      const startTime = shift?.start_time || defaultSchedule?.start || '11:00'
      const endTime = shift?.end_time || defaultSchedule?.end || '20:00'

      days.push(
        <div key={d} className="admin-card" style={{ 
          padding: '8px', 
          fontSize: '12px', 
          background: isOff ? '#fef2f2' : '#fff',
          border: shift ? '1px solid var(--primary)' : '1px solid var(--gray)',
          minHeight: '100px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>{d}</span>
            <button 
              onClick={() => toggleShiftOff(dateStr)}
              style={{ 
                padding: '2px 6px', 
                fontSize: '10px', 
                background: isOff ? 'var(--primary)' : '#eee', 
                color: isOff ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isOff ? '休假中' : '上班'}
            </button>
          </div>
          
          {!isOff && (
            <>
              <input 
                type="time" 
                value={startTime.substring(0, 5)} 
                onChange={e => handleShiftUpdate(dateStr, 'start_time', e.target.value)}
                style={{ padding: '2px', fontSize: '11px', width: '100%' }}
              />
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#999' }}>至</div>
              <input 
                type="time" 
                value={endTime.substring(0, 5)} 
                onChange={e => handleShiftUpdate(dateStr, 'end_time', e.target.value)}
                style={{ padding: '2px', fontSize: '11px', width: '100%' }}
              />
            </>
          )}
          {shift && <div style={{ fontSize: '9px', color: 'var(--primary)', textAlign: 'right' }}>已自定義</div>}
        </div>
      )
    }
    return days
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '18px' }}>💇 髮型師管理</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onAddStaff} className="btn btn-small btn-interactive">+ 新增員工</button>
          <button 
            onClick={async () => {
              await onSave();
              if (onSaveShifts) await onSaveShifts(localShifts);
            }} 
            disabled={saving} 
            className="btn btn-small btn-interactive" 
            style={{ background: '#34D399' }}
          >
            {saving && <span className="spinner"></span>}
            {saving ? '儲存中...' : '💾 儲存所有'}
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Staff List */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            {staff.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>尚未有員工</div>
            ) : (
              staff.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedStaffId(s.id)} 
                  className="admin-table-row" 
                  style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    background: selectedStaffId === s.id ? 'rgba(166, 139, 106, 0.05)' : 'transparent',
                    borderLeft: selectedStaffId === s.id ? '4px solid var(--primary)' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '50%', 
                      background: s.photo_url ? `url(${s.photo_url}) center/cover` : (s.enabled ? 'var(--primary)' : 'var(--gray)'), 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#fff', 
                      fontSize: '18px', 
                      fontWeight: 700,
                      overflow: 'hidden'
                    }}>
                      {!s.photo_url && (s.name?.charAt(0) || '?')}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: s.enabled ? 'var(--text)' : 'var(--text-light)' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{s.role}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Staff Detail */}
        <div style={{ flex: 1, minWidth: '400px' }}>
          {selectedStaff ? (
            <div className="admin-card" style={{ overflow: 'hidden' }}>
              {/* Basic Info */}
              <div style={{ padding: '30px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: selectedStaff.photo_url ? `url(${selectedStaff.photo_url}) center/cover` : 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#fff', 
                    fontSize: '32px', 
                    fontWeight: 700, 
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {!selectedStaff.photo_url && (selectedStaff.name?.charAt(0) || '?')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label>姓名</label>
                        <input 
                          type="text" 
                          value={selectedStaff.name} 
                          onChange={e => onUpdateField(selectedStaff.id, 'name', e.target.value)} 
                          placeholder="姓名" 
                        />
                      </div>
                      <div>
                        <label>職位</label>
                        <select 
                          value={selectedStaff.role} 
                          onChange={e => onUpdateField(selectedStaff.id, 'role', e.target.value)}
                        >
                          <option>髮型師</option>
                          <option>助理</option>
                          <option>經理</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label>聯絡電話</label>
                      <input 
                        type="text" 
                        value={selectedStaff.phone || ''} 
                        onChange={e => onUpdateField(selectedStaff.id, 'phone', e.target.value)} 
                        placeholder="電話號碼" 
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedStaff.enabled} 
                        onChange={e => onUpdateField(selectedStaff.id, 'enabled', e.target.checked)} 
                        style={{ width: 'auto' }}
                      />
                      <span>啟用狀態</span>
                    </label>
                    <button 
                      onClick={() => onDeleteStaff(selectedStaff.id)} 
                      className="btn-interactive" 
                      style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      🗑️ 刪除員工
                    </button>
                  </div>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label>個人照片網址 (HTTPS)</label>
                  <input 
                    type="text" 
                    value={selectedStaff.photo_url || ''} 
                    onChange={e => onUpdateField(selectedStaff.id, 'photo_url', e.target.value)} 
                    placeholder="https://images.unsplash.com/..." 
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label>個人簡介</label>
                  <textarea 
                    value={selectedStaff.bio || ''} 
                    onChange={e => onUpdateField(selectedStaff.id, 'bio', e.target.value)} 
                    placeholder="介紹髮型師的專業與風格..." 
                    style={{ minHeight: '100px' }} 
                  />
                </div>
                
                <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gray)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕒</span> 每日休息時間 (Break Time)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="time" 
                      value={selectedStaff.break_start || '15:00'} 
                      onChange={e => onUpdateField(selectedStaff.id, 'break_start', e.target.value)} 
                      style={{ width: '130px' }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>至</span>
                    <input 
                      type="time" 
                      value={selectedStaff.break_end || '16:00'} 
                      onChange={e => onUpdateField(selectedStaff.id, 'break_end', e.target.value)} 
                      style={{ width: '130px' }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginLeft: '8px' }}>* 此段時間將不會顯示在預約系統中</div>
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '30px', borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
                <div style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '16px', fontWeight: 700 }}>🛠️ 可提供服務項目</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {services.map(sv => (
                    <button 
                      key={sv.id} 
                      onClick={() => onToggleService(selectedStaff.id, sv.id)} 
                      className="btn-interactive"
                      style={{ 
                        padding: '10px 20px', 
                        background: selectedStaff.services?.includes(sv.id) ? 'var(--primary)' : '#fff', 
                        color: selectedStaff.services?.includes(sv.id) ? '#fff' : 'var(--text-light)', 
                        border: '1px solid ' + (selectedStaff.services?.includes(sv.id) ? 'var(--primary)' : 'var(--gray)'), 
                        borderRadius: '25px', 
                        fontSize: '13px', 
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {sv.emoji} {sv.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 700 }}>📅 月度詳細排班 ({currentYear}年{currentMonth + 1}月)</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setCurrentMonth(m => m === 0 ? 11 : m - 1); if (currentMonth === 0) setCurrentYear(y => y - 1) }} className="btn-interactive" style={{ padding: '4px 10px', background: '#fff', border: '1px solid var(--gray)', borderRadius: '6px' }}>◀</button>
                    <button onClick={() => { setCurrentMonth(m => m === 11 ? 0 : m + 1); if (currentMonth === 11) setCurrentYear(y => y + 1) }} className="btn-interactive" style={{ padding: '4px 10px', background: '#fff', border: '1px solid var(--gray)', borderRadius: '6px' }}>▶</button>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '30px' }}>
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-light)', padding: '4px' }}>{d}</div>
                  ))}
                  {renderShiftCalendar()}
                </div>

                <div style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '20px', fontWeight: 700 }}>🏠 每週默認班表 (Baseline)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '30px' }}>
                  {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => {
                    const dayKey = idx.toString()
                    const daySchedule = selectedStaff.schedule?.[dayKey]
                    const isOff = selectedStaff.daysOff?.includes(dayKey)
                    return (
                      <div key={idx} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '10px', fontWeight: 700 }}>{day}</div>
                        {isOff ? (
                          <div onClick={() => onToggleDailyOff(selectedStaff.id, dayKey)} className="btn-interactive" style={{ padding: '16px 5px', background: '#ef4444', color: '#fff', borderRadius: '12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}>休假</div>
                        ) : daySchedule?.start ? (
                          <div onClick={() => onToggleDailyOff(selectedStaff.id, dayKey)} className="btn-interactive" style={{ padding: '16px 5px', background: '#10b981', color: '#fff', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                            {daySchedule.start}<br/>-<br/>{daySchedule.end}
                          </div>
                        ) : (
                          <div onClick={() => onUpdateSchedule(selectedStaff.id, dayKey, 'start', '11:00')} className="btn-interactive" style={{ padding: '16px 5px', background: 'var(--gray)', color: 'var(--text-light)', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>未排班</div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--gray)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px', fontWeight: 700 }}>⏰ 快速編輯每日上班時間：</div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    {['0', '1', '2', '3', '4', '5', '6'].map(day => (
                      <div key={day} className="admin-card" style={{ padding: '12px', border: '1px solid #eee' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>星期{['日', '一', '二', '三', '四', '五', '六'][day]}</div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input 
                            type="time" 
                            value={selectedStaff.schedule?.[day]?.start || '11:00'} 
                            onChange={e => onUpdateSchedule(selectedStaff.id, day, 'start', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px', border: '1px solid var(--gray)', borderRadius: '6px', width: '70px' }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>-</span>
                          <input 
                            type="time" 
                            value={selectedStaff.schedule?.[day]?.end || '20:00'} 
                            onChange={e => onUpdateSchedule(selectedStaff.id, day, 'end', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px', border: '1px solid var(--gray)', borderRadius: '6px', width: '70px' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-card" style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--text-light)', borderStyle: 'dashed', background: 'transparent' }}>
              <div style={{ fontSize: '56px', marginBottom: '24px' }}>💇‍♂️</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>請在左側選擇髮型師進行管理</div>
              <div style={{ fontSize: '14px' }}>您可以編輯髮型師的個人資料、專業服務範圍及詳細的排班與休假設定。</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

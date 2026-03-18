'use client'

import { useEffect, useState } from 'react'

const DAY_OPTIONS = [
  { key: '0', label: '日' },
  { key: '1', label: '一' },
  { key: '2', label: '二' },
  { key: '3', label: '三' },
  { key: '4', label: '四' },
  { key: '5', label: '五' },
  { key: '6', label: '六' },
]

const normalizeDateKey = (value) => {
  if (!value) return ''
  return String(value).substring(0, 10)
}

const normalizeTime = (value) => {
  if (!value) return ''
  const text = String(value)
  return text.length >= 5 ? text.substring(0, 5) : text
}

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
  saving,
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [localShifts, setLocalShifts] = useState(staffShifts)

  useEffect(() => {
    const normalized = (staffShifts || []).map((shift) => ({
      ...shift,
      date: normalizeDateKey(shift.date),
      start_time: normalizeTime(shift.start_time),
      end_time: normalizeTime(shift.end_time),
    }))
    setLocalShifts(normalized)
  }, [staffShifts])

  useEffect(() => {
    if (staff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staff[0].id)
    }
  }, [staff, selectedStaffId])

  const selectedStaff = staff.find((item) => item.id === selectedStaffId)
  const selectedStaffDaysOff = selectedStaff?.daysOff || selectedStaff?.daysoff || []

  const handleShiftUpdate = (date, field, value) => {
    const existing = localShifts.find((shift) => shift.staff_id === selectedStaffId && shift.date === date)
    if (existing) {
      setLocalShifts((current) => current.map((shift) => (shift === existing ? { ...shift, [field]: value } : shift)))
      return
    }

    setLocalShifts((current) => [
      ...current,
      { staff_id: selectedStaffId, date, [field]: value, is_off: false },
    ])
  }

  const toggleShiftOff = (date) => {
    const existing = localShifts.find((shift) => shift.staff_id === selectedStaffId && shift.date === date)
    if (existing) {
      setLocalShifts((current) => current.map((shift) => (shift === existing ? { ...shift, is_off: !shift.is_off } : shift)))
      return
    }

    setLocalShifts((current) => [
      ...current,
      { staff_id: selectedStaffId, date, is_off: true },
    ])
  }

  const prevMonth = () => {
    setCurrentMonth((month) => {
      if (month === 0) {
        setCurrentYear((year) => year - 1)
        return 11
      }
      return month - 1
    })
  }

  const nextMonth = () => {
    setCurrentMonth((month) => {
      if (month === 11) {
        setCurrentYear((year) => year + 1)
        return 0
      }
      return month + 1
    })
  }

  const renderShiftCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const cells = []

    for (let index = 0; index < firstDay; index += 1) {
      cells.push(<div key={`empty-${index}`} />)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const shift = localShifts.find((item) => item.staff_id === selectedStaffId && item.date === dateStr)
      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay().toString()

      const defaultSchedule = selectedStaff?.schedule?.[dayOfWeek]
      const defaultIsOff = selectedStaffDaysOff.includes(dayOfWeek)
      const isOff = shift ? shift.is_off : defaultIsOff
      const startTime = shift?.start_time || defaultSchedule?.start || '11:00'
      const endTime = shift?.end_time || defaultSchedule?.end || '20:00'

      cells.push(
        <div
          key={day}
          className="admin-card"
          style={{
            padding: '8px',
            fontSize: '12px',
            background: isOff ? '#fef2f2' : '#fff',
            border: shift ? '1px solid var(--primary)' : '1px solid var(--gray)',
            minHeight: '108px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>{day}</span>
            <button
              type="button"
              onClick={() => toggleShiftOff(dateStr)}
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                background: isOff ? 'var(--primary)' : '#eee',
                color: isOff ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {isOff ? '休息' : '上班'}
            </button>
          </div>

          {!isOff && (
            <>
              <input
                type="time"
                value={startTime.substring(0, 5)}
                onChange={(event) => handleShiftUpdate(dateStr, 'start_time', event.target.value)}
                style={{ padding: '2px', fontSize: '11px', width: '100%' }}
              />
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#999' }}>至</div>
              <input
                type="time"
                value={endTime.substring(0, 5)}
                onChange={(event) => handleShiftUpdate(dateStr, 'end_time', event.target.value)}
                style={{ padding: '2px', fontSize: '11px', width: '100%' }}
              />
            </>
          )}

          {shift && <div style={{ fontSize: '9px', color: 'var(--primary)', textAlign: 'right' }}>已自訂</div>}
        </div>
      )
    }

    return cells
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '18px' }}>員工與排班管理</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onAddStaff} className="btn btn-small btn-interactive">
            + 新增員工
          </button>
          <button
            type="button"
            onClick={async () => {
              await onSave()
              if (onSaveShifts) await onSaveShifts(localShifts)
            }}
            disabled={saving}
            className="btn btn-small btn-interactive"
            style={{ background: '#34D399' }}
          >
            {saving && <span className="spinner"></span>}
            {saving ? '儲存中...' : '儲存員工與排班'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            {staff.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>目前未有員工資料</div>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedStaffId(member.id)}
                  className="admin-table-row"
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    background: selectedStaffId === member.id ? 'rgba(166, 139, 106, 0.05)' : 'transparent',
                    borderLeft: selectedStaffId === member.id ? '4px solid var(--primary)' : '4px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: member.photo_url ? `url(${member.photo_url}) center/cover` : member.enabled ? 'var(--primary)' : 'var(--gray)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 700,
                        overflow: 'hidden',
                      }}
                    >
                      {!member.photo_url && (member.name?.charAt(0) || '?')}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: member.enabled ? 'var(--text)' : 'var(--text-light)' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{member.role}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '400px' }}>
          {selectedStaff ? (
            <div className="admin-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '30px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                  <div
                    style={{
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
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {!selectedStaff.photo_url && (selectedStaff.name?.charAt(0) || '?')}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label>姓名</label>
                        <input
                          type="text"
                          value={selectedStaff.name}
                          onChange={(event) => onUpdateField(selectedStaff.id, 'name', event.target.value)}
                          placeholder="員工姓名"
                        />
                      </div>
                      <div>
                        <label>職位</label>
                        <select value={selectedStaff.role} onChange={(event) => onUpdateField(selectedStaff.id, 'role', event.target.value)}>
                          <option>Stylist</option>
                          <option>Senior Stylist</option>
                          <option>Assistant</option>
                          <option>Manager</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label>聯絡電話</label>
                      <input
                        type="text"
                        value={selectedStaff.phone || ''}
                        onChange={(event) => onUpdateField(selectedStaff.id, 'phone', event.target.value)}
                        placeholder="聯絡電話"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={selectedStaff.enabled}
                        onChange={(event) => onUpdateField(selectedStaff.id, 'enabled', event.target.checked)}
                        style={{ width: 'auto' }}
                      />
                      <span>啟用狀態</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onDeleteStaff(selectedStaff.id)}
                      className="btn-interactive"
                      style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      刪除員工
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label>照片網址 (HTTPS)</label>
                  <input
                    type="text"
                    value={selectedStaff.photo_url || ''}
                    onChange={(event) => onUpdateField(selectedStaff.id, 'photo_url', event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label>個人簡介</label>
                  <textarea
                    value={selectedStaff.bio || ''}
                    onChange={(event) => onUpdateField(selectedStaff.id, 'bio', event.target.value)}
                    placeholder="介紹員工擅長項目與風格..."
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--gray)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>每日固定休息時間</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <input
                      type="time"
                      value={selectedStaff.break_start || '15:00'}
                      onChange={(event) => onUpdateField(selectedStaff.id, 'break_start', event.target.value)}
                      style={{ width: '130px' }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>至</span>
                    <input
                      type="time"
                      value={selectedStaff.break_end || '16:00'}
                      onChange={(event) => onUpdateField(selectedStaff.id, 'break_end', event.target.value)}
                      style={{ width: '130px' }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                      這段時間不會顯示在可預約時段內。
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '30px', borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
                <div style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '16px', fontWeight: 700 }}>可提供服務</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => onToggleService(selectedStaff.id, service.id)}
                      className="btn-interactive"
                      style={{
                        padding: '10px 20px',
                        background: selectedStaff.services?.includes(service.id) ? 'var(--primary)' : '#fff',
                        color: selectedStaff.services?.includes(service.id) ? '#fff' : 'var(--text-light)',
                        border: '1px solid ' + (selectedStaff.services?.includes(service.id) ? 'var(--primary)' : 'var(--gray)'),
                        borderRadius: '25px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {service.emoji} {service.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 700 }}>
                    每月指定排班 ({currentYear} 年 {currentMonth + 1} 月)
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={prevMonth} className="btn-interactive" style={{ padding: '4px 10px', background: '#fff', border: '1px solid var(--gray)', borderRadius: '6px' }}>
                      上月
                    </button>
                    <button type="button" onClick={nextMonth} className="btn-interactive" style={{ padding: '4px 10px', background: '#fff', border: '1px solid var(--gray)', borderRadius: '6px' }}>
                      下月
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '30px' }}>
                  {DAY_OPTIONS.map((day) => (
                    <div key={day.key} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-light)', padding: '4px' }}>
                      星期{day.label}
                    </div>
                  ))}
                  {renderShiftCalendar()}
                </div>

                <div style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '20px', fontWeight: 700 }}>每週基準班表</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '30px' }}>
                  {DAY_OPTIONS.map((day) => {
                    const daySchedule = selectedStaff.schedule?.[day.key]
                    const isOff = selectedStaffDaysOff.includes(day.key)
                    return (
                      <div key={day.key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '10px', fontWeight: 700 }}>
                          星期{day.label}
                        </div>
                        {isOff ? (
                          <div
                            onClick={() => onToggleDailyOff(selectedStaff.id, day.key)}
                            className="btn-interactive"
                            style={{ padding: '16px 5px', background: '#ef4444', color: '#fff', borderRadius: '12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            休息
                          </div>
                        ) : daySchedule?.start ? (
                          <div
                            onClick={() => onToggleDailyOff(selectedStaff.id, day.key)}
                            className="btn-interactive"
                            style={{ padding: '16px 5px', background: '#10b981', color: '#fff', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            {daySchedule.start}
                            <br />-
                            <br />
                            {daySchedule.end}
                          </div>
                        ) : (
                          <div
                            onClick={() => onUpdateSchedule(selectedStaff.id, day.key, 'start', '11:00')}
                            className="btn-interactive"
                            style={{ padding: '16px 5px', background: 'var(--gray)', color: 'var(--text-light)', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            未排班
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--gray)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px', fontWeight: 700 }}>快速修改每週上班時間</div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    {DAY_OPTIONS.map((day) => (
                      <div key={day.key} className="admin-card" style={{ padding: '12px', border: '1px solid #eee' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>
                          星期{day.label}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="time"
                            value={selectedStaff.schedule?.[day.key]?.start || '11:00'}
                            onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'start', event.target.value)}
                            style={{ fontSize: '12px', padding: '6px', border: '1px solid var(--gray)', borderRadius: '6px', width: '70px' }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>-</span>
                          <input
                            type="time"
                            value={selectedStaff.schedule?.[day.key]?.end || '20:00'}
                            onChange={(event) => onUpdateSchedule(selectedStaff.id, day.key, 'end', event.target.value)}
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
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>請先在左側選擇員工</div>
              <div style={{ fontSize: '14px' }}>你可以在這裡管理員工資料、可提供服務、每週班表與指定日期排班。</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

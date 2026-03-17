'use client'
import { useState } from 'react'

export default function BookingsTab({ 
  bookings, 
  staff, 
  onUpdateStatus, 
  onUpdateBookingStaff,
  onViewDetail
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('all')

  const filteredBookings = bookings.filter(b => 
    (!searchTerm || b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.phone?.includes(searchTerm)) && 
    (statusFilter === 'all' || b.status === statusFilter) &&
    (dateFilter === '' || b.date === dateFilter) &&
    (staffFilter === 'all' || b.staff_id?.toString() === staffFilter)
  )

  return (
    <div>
      <div className="admin-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input 
            type="text" 
            placeholder="🔍 搜尋姓名或電話..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <div style={{ width: '160px' }}>
          <input 
            type="text" 
            placeholder="📅 日期 (D/M/YYYY)" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
          />
        </div>
        <div style={{ width: '160px' }}>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
            <option value="all">所有髮型師</option>
            {staff.map(s => <option key={s.id} value={s.id.toString()}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ width: '140px' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">所有狀態</option>
            <option value="pending">⏳ 待確認</option>
            <option value="confirmed">✅ 已確認</option>
            <option value="completed">🏆 已完成</option>
            <option value="cancelled">❌ 已取消</option>
          </select>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>預約日期</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>客戶資訊</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>預約服務</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>負責髮型師</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>預約狀態</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                    📭 找不到符合條件的預約記錄
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => (
                  <tr key={b.id} className="admin-table-row" style={{ borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }} onClick={() => onViewDetail(b)}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{b.date}</div>
                      <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>{b.time}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{b.phone}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{b.service}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>${b.final_price || b.service_price}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-light)' }}>
                          {b.staff_name?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: 500 }}>{b.staff_name || '未分配'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span className={`badge ${
                        b.status === 'pending' ? '' : 
                        b.status === 'confirmed' ? 'badge-success' : 
                        b.status === 'completed' ? 'badge-success' : 
                        'badge-outline'
                      }`} style={{ 
                        background: b.status === 'pending' ? '#fef3c7' : b.status === 'confirmed' ? '#dbeafe' : undefined,
                        color: b.status === 'pending' ? '#d97706' : b.status === 'confirmed' ? '#2563eb' : undefined,
                        borderColor: b.status === 'cancelled' ? '#fee2e2' : undefined,
                      }}>
                        {b.status === 'pending' ? '待確認' : b.status === 'confirmed' ? '已確認' : b.status === 'completed' ? '已完成' : '已取消'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onViewDetail(b); }} 
                        className="btn-interactive"
                        style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        管理
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

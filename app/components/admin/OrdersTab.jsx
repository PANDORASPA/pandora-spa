'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

export default function OrdersTab({ orders: initialOrders }) {
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) {
      toast.error('更新失敗')
      return
    }
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o))
    toast.success('狀態已更新')
  }

  return (
    <div>
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>日期</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>客戶資訊</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>訂單金額</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>付款 / 配送</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>目前狀態</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>管理</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>📭 暫無訂單記錄</td></tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="admin-table-row" style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '14px 12px' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{o.user_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>ID: {o.id.toString().slice(0,8)}</div>
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--primary)' }}>${o.total}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <span>💳</span> {o.payment}
                      </div>
                      <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🚚</span> {o.delivery}
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span className={`badge ${
                        o.status === 'pending' ? '' : 
                        o.status === 'paid' ? 'badge-success' : 
                        o.status === 'shipped' ? 'badge-success' : 
                        'badge-outline'
                      }`} style={{ 
                        background: o.status === 'pending' ? '#fef3c7' : undefined,
                        color: o.status === 'pending' ? '#d97706' : undefined,
                        borderColor: o.status === 'cancelled' ? '#fee2e2' : undefined,
                      }}>
                        {o.status === 'pending' ? '待處理' : o.status === 'paid' ? '已付款' : o.status === 'shipped' ? '已發貨' : '已取消'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setSelectedOrder(o)} 
                        className="btn-interactive"
                        style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        詳情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative' }}>
            <button 
              onClick={() => setSelectedOrder(null)} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
            >
              ✕
            </button>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>訂單詳細資訊</h3>
            
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>購買內容</strong>
                  <div style={{ lineHeight: 1.5 }}>{selectedOrder.items}</div>
                </div>
                <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>配送地址</strong>
                  <div>{selectedOrder.address || '門市自取'}</div>
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>更改訂單狀態</strong>
                  <select 
                    value={selectedOrder.status} 
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                    className="btn-interactive"
                    style={{ marginTop: '4px' }}
                  >
                    <option value="pending">待處理</option>
                    <option value="paid">已付款</option>
                    <option value="shipped">已發貨</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedOrder(null)} 
              className="btn btn-interactive" 
              style={{ width: '100%' }}
            >
              完成並關閉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

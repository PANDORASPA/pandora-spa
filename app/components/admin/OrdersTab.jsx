'use client'

import { useEffect, useState } from 'react'

export default function OrdersTab({ orders: initialOrders, onUpdateOrderStatus }) {
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  const updateOrderStatus = async (id, status) => {
    if (!onUpdateOrderStatus) return
    await onUpdateOrderStatus(id, status)
    setOrders((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    setSelectedOrder((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
  }

  return (
    <div>
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '640px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>日期</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>顧客</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>金額</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>付款 / 送貨</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>狀態</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>管理</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                    暫時沒有訂單
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="admin-table-row" style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '14px 12px' }}>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{order.user_name || order.name || '未命名顧客'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>#{order.ref || order.id}</div>
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--primary)' }}>${order.total || 0}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '2px' }}>{order.payment || '-'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{order.delivery || '-'}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span className="badge badge-outline">{order.status || 'pending'}</span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '520px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>
              ×
            </button>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>訂單詳情</h3>

            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>訂單內容</strong>
                  <div style={{ lineHeight: 1.5 }}>{selectedOrder.items || selectedOrder.product_name || '-'}</div>
                </div>
                <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>地址</strong>
                  <div>{selectedOrder.address || '門市自取'}</div>
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>更新狀態</strong>
                  <select value={selectedOrder.status || 'pending'} onChange={(event) => updateOrderStatus(selectedOrder.id, event.target.value)} style={{ marginTop: '4px' }}>
                    <option value="pending">待處理</option>
                    <option value="paid">已付款</option>
                    <option value="shipped">已出貨</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedOrder(null)} className="btn btn-interactive" style={{ width: '100%' }}>
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

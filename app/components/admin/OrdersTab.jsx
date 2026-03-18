'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理' },
  { value: 'paid', label: '已付款' },
  { value: 'shipped', label: '已出貨' },
  { value: 'cancelled', label: '已取消' },
]

const statusStyle = (status) => {
  if (status === 'pending') return { background: '#fef3c7', color: '#b45309' }
  if (status === 'paid') return { background: '#dcfce7', color: '#166534' }
  if (status === 'shipped') return { background: '#dbeafe', color: '#1d4ed8' }
  return { background: '#fee2e2', color: '#b91c1c' }
}

export default function OrdersTab({ orders: initialOrders }) {
  const [orders, setOrders] = useState(initialOrders || [])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    setOrders(initialOrders || [])
  }, [initialOrders])

  const updateOrderStatus = async (id, status) => {
    try {
      setSavingId(id)
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)

      if (error) {
        throw error
      }

      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)))
      setSelectedOrder((current) => (current?.id === id ? { ...current, status } : current))
      toast.success('訂單狀態已更新')
    } catch (error) {
      toast.error(`更新失敗: ${error.message}`)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>日期</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>客戶</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>內容</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>金額</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>付款 / 取貨</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>狀態</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                    暫時沒有訂單記錄
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="admin-table-row" style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '14px 12px' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{order.name || order.user_name || '未命名客戶'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{order.phone || '未提供電話'}</div>
                    </td>
                    <td style={{ padding: '14px 12px', maxWidth: '220px' }}>
                      <div style={{ lineHeight: 1.5 }}>{order.items || order.product_name || '-'}</div>
                      {order.ref && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>#{order.ref}</div>}
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--primary)' }}>
                      ${Number(order.total || 0)}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '2px' }}>{order.payment || '未設定付款方式'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{order.delivery || '未設定取貨方式'}</div>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span
                        className="badge"
                        style={{
                          ...statusStyle(order.status),
                          border: 'none',
                        }}
                      >
                        {STATUS_OPTIONS.find((item) => item.value === order.status)?.label || order.status || '未設定'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '560px', padding: '30px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
            >
              ×
            </button>

            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>訂單詳情</h3>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>客戶資料</strong>
                  <div>{selectedOrder.name || selectedOrder.user_name || '未命名客戶'}</div>
                  <div>{selectedOrder.phone || '未提供電話'}</div>
                </div>

                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>訂單內容</strong>
                  <div style={{ lineHeight: 1.6 }}>{selectedOrder.items || selectedOrder.product_name || '-'}</div>
                </div>

                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>配送資料</strong>
                  <div>{selectedOrder.delivery || '未設定配送方式'}</div>
                  <div>{selectedOrder.address || '沒有配送地址'}</div>
                </div>

                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>付款資料</strong>
                  <div>{selectedOrder.payment || '未設定付款方式'}</div>
                  <div>總額: ${Number(selectedOrder.total || 0)}</div>
                </div>

                <div style={{ fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>更新狀態</strong>
                  <select
                    value={selectedOrder.status || 'pending'}
                    onChange={(event) => updateOrderStatus(selectedOrder.id, event.target.value)}
                    disabled={savingId === selectedOrder.id}
                    className="btn-interactive"
                    style={{ marginTop: '4px', minWidth: '180px' }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setSelectedOrder(null)} className="btn btn-interactive" style={{ width: '100%' }}>
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusStyle = (status) => {
  if (status === 'pending') return { background: '#fef3c7', color: '#b45309' }
  if (status === 'paid') return { background: '#dcfce7', color: '#166534' }
  if (status === 'shipped') return { background: '#dbeafe', color: '#1d4ed8' }
  return { background: '#fee2e2', color: '#b91c1c' }
}

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`

const getOrderUserName = (order) => order.user_name || order.customer_name || order.name || '-'
const getOrderItems = (order) => {
  if (Array.isArray(order.items)) return order.items.map((item) => item?.name || item?.title || String(item)).join(', ')
  return order.items || order.product_name || order.description || '-'
}
const getOrderDelivery = (order) => order.delivery || order.delivery_method || 'Not set'
const getOrderPayment = (order) => order.payment || order.payment_method || 'Not set'

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
      if (error) throw error

      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)))
      setSelectedOrder((current) => (current?.id === id ? { ...current, status } : current))
      toast.success('Order updated')
    } catch (error) {
      toast.error('Update failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '760px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Date</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Customer</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Items</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Total</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Delivery / Payment</th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const normalizedStatus = order.status || 'pending'

                  return (
                    <tr key={order.id} className="admin-table-row" style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={{ padding: '14px 12px' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{getOrderUserName(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{order.phone || order.user_phone || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px', maxWidth: '260px' }}>
                        <div style={{ lineHeight: 1.5 }}>{getOrderItems(order)}</div>
                        {order.ref && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>#{order.ref}</div>}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--primary)' }}>
                        {formatMoney(order.total)}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontSize: '11px', marginBottom: '2px' }}>{getOrderDelivery(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{getOrderPayment(order)}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className="badge" style={{ ...statusStyle(normalizedStatus), border: 'none' }}>
                          {STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.label || normalizedStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="btn-interactive"
                          style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedOrder(null)}
        >
          <div className="admin-card" style={{ width: '100%', maxWidth: '560px', padding: '30px', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
            >
              x
            </button>

            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Order Details</h3>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>Customer</strong>
                  <div>{getOrderUserName(selectedOrder)}</div>
                  <div>{selectedOrder.phone || selectedOrder.user_phone || ''}</div>
                </div>

                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>Items</strong>
                  <div style={{ lineHeight: 1.6 }}>{getOrderItems(selectedOrder)}</div>
                </div>

                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>Delivery</strong>
                  <div>{getOrderDelivery(selectedOrder)}</div>
                  <div>{selectedOrder.address || ''}</div>
                </div>

                <div style={{ marginBottom: '10px', fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>Payment</strong>
                  <div>{getOrderPayment(selectedOrder)}</div>
                  <div>Total: {formatMoney(selectedOrder.total)}</div>
                </div>

                <div style={{ fontSize: '14px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-light)' }}>Status</strong>
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

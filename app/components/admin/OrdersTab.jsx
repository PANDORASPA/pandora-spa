'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { EmptyState, Pill, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', tone: 'warning' },
  { value: 'paid', label: 'Paid', tone: 'success' },
  { value: 'shipped', label: 'Shipped', tone: 'default' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
]

const getCustomerName = (order) => order.user_name || order.customer_name || order.name || 'Customer'
const getCustomerPhone = (order) => order.phone || order.user_phone || order.customer_phone || ''
const getItemsText = (order) => {
  if (Array.isArray(order.items)) {
    return order.items
      .map((item) => item?.name || item?.title || item?.label || item?.product_name || String(item))
      .filter(Boolean)
      .join(', ')
  }
  return order.items || order.product_name || order.description || '-'
}
const getDeliveryText = (order) => order.delivery || order.delivery_method || 'Not set'
const getPaymentText = (order) => order.payment || order.payment_method || 'Not set'
const getDateText = (order) => order.created_at ? new Date(order.created_at).toLocaleString() : '-'

export default function OrdersTab({ orders: initialOrders = [] }) {
  const [orders, setOrders] = useState(initialOrders || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    setOrders(initialOrders || [])
  }, [initialOrders])

  const filteredOrders = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return (orders || []).filter((order) => {
      const haystack = [
        order.ref,
        getCustomerName(order),
        getCustomerPhone(order),
        getItemsText(order),
        getDeliveryText(order),
        getPaymentText(order),
        order.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (!needle || haystack.includes(needle)) && (statusFilter === 'all' || (order.status || 'pending') === statusFilter)
    })
  }, [orders, searchTerm, statusFilter])

  const updateStatus = async (id, status) => {
    try {
      setSavingId(id)
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)))
      setSelectedOrder((current) => (current?.id === id ? { ...current, status } : current))
    } catch (error) {
      console.error(error)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="ORDERS"
        title="Orders and payment flow"
        description="Review order refs, items, delivery method, and payment state in a more operational layout."
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Pill>{filteredOrders.length} visible</Pill>
          </div>
        }
      />

      <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px' }}>
            <input
              type="text"
              placeholder="Search ref, customer, items, delivery, payment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '980px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Date</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Customer</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Items</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Total</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Delivery</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Payment</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState title="No orders found" description="Try a broader search or clear filters." />
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const normalizedStatus = order.status || 'pending'
                  return (
                    <tr
                      key={order.id}
                      className="admin-table-row"
                      style={{ borderBottom: '1px solid #f6f6f6', cursor: 'pointer' }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td style={{ padding: '14px 12px' }}>{getDateText(order)}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 800 }}>{getCustomerName(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(order)}</div>
                      </td>
                      <td style={{ padding: '14px 12px', maxWidth: '260px' }}>
                        <div style={{ lineHeight: 1.5 }}>{getItemsText(order)}</div>
                        {order.ref && <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>#{order.ref}</div>}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(order.total, order.currency || '')}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getDeliveryText(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{order.address || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: 700 }}>{getPaymentText(order)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '3px' }}>{order.payment_ref || ''}</div>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className="badge" style={{ border: 'none', background: STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.tone === 'success' ? '#ECFDF5' : STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.tone === 'warning' ? '#FEF3C7' : STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.tone === 'danger' ? '#FEF2F2' : '#E5E7EB', color: STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.tone === 'success' ? '#047857' : STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.tone === 'warning' ? '#B45309' : STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.tone === 'danger' ? '#DC2626' : '#374151' }}>
                          {STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.label || normalizedStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedOrder(order)
                          }}
                          className="btn-interactive"
                          style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid var(--gray)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="admin-card"
            style={{ width: '100%', maxWidth: '640px', padding: '24px', position: 'relative' }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
            >
              x
            </button>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', letterSpacing: '0.08em' }}>ORDER DETAILS</div>
              <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{selectedOrder.ref || 'Order'}</h3>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Customer</div>
                    <div style={{ fontWeight: 800 }}>{getCustomerName(selectedOrder)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{getCustomerPhone(selectedOrder)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Delivery</div>
                    <div style={{ fontWeight: 700 }}>{getDeliveryText(selectedOrder)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{selectedOrder.address || ''}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--gray)', padding: '16px', display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Items</div>
                  <div style={{ lineHeight: 1.6 }}>{getItemsText(selectedOrder)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Payment</div>
                    <div style={{ fontWeight: 700 }}>{getPaymentText(selectedOrder)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '3px' }}>{selectedOrder.payment_ref || ''}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Total</div>
                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(selectedOrder.total, selectedOrder.currency || '')}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>Status</div>
                  <select
                    value={selectedOrder.status || 'pending'}
                    onChange={(event) => updateStatus(selectedOrder.id, event.target.value)}
                    disabled={savingId === selectedOrder.id}
                    style={{ ...smallFieldStyle, maxWidth: '220px' }}
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
          </div>
        </div>
      )}
    </div>
  )
}

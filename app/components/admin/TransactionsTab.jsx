'use client'

import { useEffect, useMemo, useState } from 'react'
import { EmptyState, Pill, SectionHeader, fieldStyle, formatMoney, smallFieldStyle } from './opsUi'

const normalize = (row) => ({
  ...row,
  __isNew: Boolean(row?.__isNew),
  __deleted: Boolean(row?.__deleted),
})

const statusTone = (status) => {
  if (status === 'completed' || status === 'paid' || status === 'reconciled') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed' || status === 'cancelled') return 'danger'
  return 'default'
}

export default function TransactionsTab({
  transactions: initialTransactions = [],
  available = true,
  saveTransactions,
}) {
  const [transactions, setTransactions] = useState(() => (initialTransactions || []).map(normalize))
  const [searchTerm, setSearchTerm] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTransactions((initialTransactions || []).map(normalize))
  }, [initialTransactions])

  const filteredTransactions = useMemo(() => {
    const needle = searchTerm.toLowerCase().trim()
    return transactions.filter((row) => {
      const haystack = [
        row.ref,
        row.kind,
        row.payment_method,
        row.payment_ref,
        row.provider,
        row.order_id,
        row.booking_id,
        row.customer_name,
        row.notes,
        row.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (
        (!needle || haystack.includes(needle)) &&
        (kindFilter === 'all' || (row.kind || 'sale') === kindFilter) &&
        (statusFilter === 'all' || (row.status || 'completed') === statusFilter)
      )
    })
  }, [transactions, searchTerm, kindFilter, statusFilter])

  const update = (id, patch) => {
    setTransactions((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const addTransaction = () => {
    setTransactions((current) => [
      {
        id: Date.now(),
        ref: `TX-${Date.now()}`,
        kind: 'sale',
        amount: 0,
        currency: 'HKD',
        payment_method: 'cash',
        provider: '',
        payment_ref: '',
        customer_name: '',
        booking_id: '',
        order_id: '',
        status: 'pending',
        notes: '',
        occurred_at: new Date().toISOString(),
        __isNew: true,
        __deleted: false,
      },
      ...current,
    ])
  }

  const toggleDelete = (id) => {
    setTransactions((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item
          if (item.__isNew) return null
          return { ...item, __deleted: !item.__deleted }
        })
        .filter(Boolean),
    )
  }

  const handleSave = async () => {
    if (!saveTransactions) return
    setSaving(true)
    try {
      const deletedIds = transactions.filter((item) => item.__deleted && !item.__isNew).map((item) => item.id)
      const items = transactions
        .filter((item) => !item.__deleted)
        .map((item) => {
          const payload = { ...item }
          delete payload.__isNew
          delete payload.__deleted
          return payload
        })
      await saveTransactions({ transactions: items, deletedIds })
    } finally {
      setSaving(false)
    }
  }

  if (!available) {
    return (
      <div className="admin-card" style={{ padding: '28px', color: 'var(--text-light)' }}>
        Transactions table is not available yet. Run the latest migration to enable ledger-style payment tracking.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionHeader
        eyebrow="TRANSACTIONS"
        title="Operational ledger"
        description="Track transaction refs, payment methods, booking/order links, and reconciliation status."
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Pill>{filteredTransactions.length} visible</Pill>
            {saveTransactions && (
              <button type="button" onClick={handleSave} disabled={saving} className="btn btn-small btn-interactive" style={{ background: '#34D399' }}>
                {saving && <span className="spinner"></span>}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            )}
          </div>
        }
      />

      <div className="admin-card" style={{ padding: '18px', border: '1px solid var(--gray)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <input type="text" placeholder="Search ref, customer, provider, notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={fieldStyle} />
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={fieldStyle}>
            <option value="all">All kinds</option>
            <option value="sale">Sale</option>
            <option value="refund">Refund</option>
            <option value="adjustment">Adjustment</option>
            <option value="deposit">Deposit</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="reconciled">Reconciled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="button" onClick={addTransaction} className="btn btn-small btn-interactive">
            + Add transaction
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1280px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1px solid var(--gray)' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>When</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Ref</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Kind</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Amount</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Payment</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Linked</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Notes</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-light)' }}>Status</th>
                <th style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState title="No transactions recorded yet" description="Transactions will appear once orders, bookings, or adjustments are synced here." />
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((row) => {
                  const deleted = Boolean(row.__deleted)
                  const tone = statusTone(row.status || 'completed')
                  return (
                    <tr key={row.id} className="admin-table-row" style={{ borderBottom: '1px solid #f6f6f6', opacity: deleted ? 0.55 : 1 }}>
                      <td style={{ padding: '12px' }}>{row.occurred_at ? new Date(row.occurred_at).toLocaleString() : row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <input value={row.ref || ''} onChange={(e) => update(row.id, { ref: e.target.value })} style={smallFieldStyle} disabled={deleted} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={row.kind || 'sale'} onChange={(e) => update(row.id, { kind: e.target.value })} style={smallFieldStyle} disabled={deleted}>
                          <option value="sale">Sale</option>
                          <option value="refund">Refund</option>
                          <option value="adjustment">Adjustment</option>
                          <option value="deposit">Deposit</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input type="number" value={row.amount || 0} onChange={(e) => update(row.id, { amount: parseInt(e.target.value, 10) || 0 })} style={smallFieldStyle} disabled={deleted} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input value={row.payment_method || ''} onChange={(e) => update(row.id, { payment_method: e.target.value })} placeholder="Cash / Card / Bank" style={smallFieldStyle} disabled={deleted} />
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{row.provider || row.payment_ref || ''}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700 }}>
                          {row.order_id ? `Order #${row.order_id}` : row.booking_id ? `Booking #${row.booking_id}` : '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>{row.customer_name || row.member_user_id || row.customer_id || ''}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <textarea
                          value={row.notes || ''}
                          onChange={(e) => update(row.id, { notes: e.target.value })}
                          placeholder="Operational notes"
                          style={{ ...smallFieldStyle, minHeight: '68px', resize: 'vertical', width: '100%' }}
                          disabled={deleted}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={row.status || 'pending'} onChange={(e) => update(row.id, { status: e.target.value })} style={smallFieldStyle} disabled={deleted}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="reconciled">Reconciled</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <div style={{ marginTop: '6px' }}>
                          <span className="badge" style={{ border: 'none', background: tone === 'success' ? '#ECFDF5' : tone === 'warning' ? '#FEF3C7' : tone === 'danger' ? '#FEF2F2' : '#E5E7EB', color: tone === 'success' ? '#047857' : tone === 'warning' ? '#B45309' : tone === 'danger' ? '#DC2626' : '#374151' }}>
                            {row.status || 'pending'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleDelete(row.id)}
                          className="btn-interactive"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: deleted ? '#ECFDF5' : '#FEF2F2',
                            color: deleted ? '#166534' : '#DC2626',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {deleted ? 'Restore' : 'Delete'}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>Rows</div>
          <div style={{ fontSize: '22px', fontWeight: 800 }}>{filteredTransactions.length}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px', border: '1px solid var(--gray)' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>Ledger total</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(filteredTransactions.filter((item) => !item.__deleted).reduce((sum, item) => sum + Number(item.amount || 0), 0), 'HKD')}</div>
        </div>
      </div>
    </div>
  )
}

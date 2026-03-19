'use client'

export const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--gray)',
  background: '#fff',
  color: 'var(--text)',
  fontSize: '14px',
}

export const smallFieldStyle = {
  ...fieldStyle,
  padding: '8px 10px',
  fontSize: '13px',
}

export const parseDate = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parts = text.split(/[\/.-]/).map((part) => part.trim())
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (a.length === 4) return `${a.padStart(4, '0')}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    return `${c.padStart(4, '0')}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
  }
  return text
}

export const parseTime = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  return text.length >= 5 ? text.substring(0, 5) : text
}

export const formatMoney = (value, currency = '') => {
  const amount = Number(value || 0)
  return `${currency ? `${currency} ` : ''}${amount.toLocaleString()}`
}

export const sectionShell = {
  padding: '20px',
  border: '1px solid rgba(166, 139, 106, 0.16)',
  background: '#fff',
}

export function SectionHeader({ eyebrow, title, description, actions }) {
  return (
    <div
      className="admin-card"
      style={{
        padding: '18px 20px',
        border: '1px solid rgba(166, 139, 106, 0.2)',
        background: 'linear-gradient(135deg, #fff, #FBF8F4)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#A68B6A' }}>{eyebrow}</div>
        <div style={{ marginTop: '4px', fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{title}</div>
        <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.6 }}>{description}</div>
      </div>
      {actions}
    </div>
  )
}

export function SummaryPill({ label, value, tone = 'default' }) {
  const colors =
    tone === 'success'
      ? { background: '#ECFDF5', color: '#047857' }
      : tone === 'warning'
        ? { background: '#FEF3C7', color: '#B45309' }
        : tone === 'danger'
          ? { background: '#FEF2F2', color: '#DC2626' }
          : { background: '#F8FAFC', color: 'var(--text)' }

  return (
    <div className="admin-card" style={{ padding: '14px 16px', border: '1px solid var(--gray)' }}>
      <div style={{ fontSize: '12px', fontWeight: 800, color: '#A68B6A', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: colors.color }}>{value}</div>
    </div>
  )
}

export function EmptyState({ title, description }) {
  return (
    <div className="admin-card" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-light)' }}>
      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '13px', lineHeight: 1.6 }}>{description}</div>
    </div>
  )
}

export function Pill({ children, tone = 'default' }) {
  const colors =
    tone === 'success'
      ? { background: '#ECFDF5', color: '#047857' }
      : tone === 'warning'
        ? { background: '#FEF3C7', color: '#B45309' }
        : tone === 'danger'
          ? { background: '#FEF2F2', color: '#DC2626' }
          : { background: '#fff', color: 'var(--text)' }

  return (
    <span
      className="badge badge-outline"
      style={{
        background: colors.background,
        color: colors.color,
        borderColor: 'rgba(166, 139, 106, 0.18)',
      }}
    >
      {children}
    </span>
  )
}

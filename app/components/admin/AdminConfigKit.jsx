'use client'

const toneStyles = {
  neutral: { background: '#F8FAFC', color: 'var(--text)' },
  success: { background: '#ECFDF5', color: '#047857' },
  warning: { background: '#FEF3C7', color: '#B45309' },
  danger: { background: '#FEF2F2', color: '#DC2626' },
  accent: { background: 'rgba(166, 139, 106, 0.12)', color: 'var(--primary-dark)' },
}

export function AdminSection({ eyebrow, title, description, actions, tone = 'neutral', children }) {
  return (
    <section
      className="admin-card"
      style={{
        padding: '18px',
        border: '1px solid rgba(166, 139, 106, 0.16)',
        background: tone === 'accent' ? 'linear-gradient(180deg, #fff, #FBF8F4)' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          {eyebrow ? <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: '#A68B6A' }}>{eyebrow}</div> : null}
          <h3 style={{ margin: eyebrow ? '6px 0 0' : 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{title}</h3>
          {description ? <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-light)' }}>{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function StatusPill({ children, tone = 'neutral', style = {} }) {
  const palette = toneStyles[tone] || toneStyles.neutral
  return (
    <span className="badge badge-outline" style={{ ...palette, border: 'none', fontWeight: 700, ...style }}>
      {children}
    </span>
  )
}

export function EmptyState({ title, description }) {
  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '14px',
        background: '#FAF8F5',
        border: '1px dashed var(--gray)',
        color: 'var(--text-light)',
      }}
    >
      <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '13px', lineHeight: 1.6 }}>{description}</div>
    </div>
  )
}

export function ChipRow({ items = [], emptyLabel = '沒有資料', tone = 'neutral' }) {
  if (!items.length) {
    return <EmptyState title={emptyLabel} description="當相關設定或資料未接通時，這個區塊會顯示相容提示。" />
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {items.map((item) => (
        <StatusPill key={item.key || item.label} tone={tone}>
          {item.label}
        </StatusPill>
      ))}
    </div>
  )
}

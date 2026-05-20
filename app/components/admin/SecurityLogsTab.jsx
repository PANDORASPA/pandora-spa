'use client'

import { EmptyState, Pill, SectionHeader } from './opsUi'

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-HK')
}

const actionLabel = (value) => {
  const labels = {
    INSERT: '新增資料',
    UPDATE: '更新資料',
    DELETE: '刪除資料',
    'settings.bulk_save': '儲存設定',
    'tickets.confirm_payment': '確認付款發放套票',
    'tickets.import_commit': 'CSV 匯入套票',
    'member_profiles.admin_update': '更新會員權限',
  }
  return labels[value] || value || '-'
}

export default function SecurityLogsTab({ logs = [], onRefresh }) {
  return (
    <section style={{ display: 'grid', gap: '16px' }}>
      <SectionHeader
        title="安全紀錄"
        description="追蹤管理員重要操作，包括付款確認、CSV 匯入、設定變更及資料表寫入。"
        action={onRefresh ? <button type="button" className="admin-action-btn" onClick={onRefresh}>重新載入</button> : null}
      />

      {!logs.length ? (
        <EmptyState title="暫時沒有安全紀錄" description="完成管理員操作後，這裡會顯示最近的審計紀錄。" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>操作</th>
                <th>目標</th>
                <th>管理員</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td><Pill tone="warning">{actionLabel(log.action)}</Pill></td>
                  <td>{log.target_table || '-'}{log.target_id ? ` #${log.target_id}` : ''}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.actor_user_id || '-'}</td>
                  <td>{log.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

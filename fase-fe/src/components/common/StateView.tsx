import type { ReactNode } from 'react'
import styles from './StateView.module.css'

interface StateViewProps {
  loading?: boolean
  error?: unknown
  empty?: boolean
  emptyText?: string
  onRetry?: () => void
  children: ReactNode
}

export default function StateView({ loading, error, empty, emptyText, onRetry, children }: StateViewProps) {
  if (loading) {
    return (
      <div className={styles.state} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Đang tải...
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.state} role="alert">
        Không tải được dữ liệu.
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Thử lại
          </button>
        )}
      </div>
    )
  }

  if (empty) return <div className={styles.state}>{emptyText ?? 'Chưa có dữ liệu.'}</div>

  return <>{children}</>
}

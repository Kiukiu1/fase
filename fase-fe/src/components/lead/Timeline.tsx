import type { TimelineItem } from '../../types/lead'
import { formatDateTime } from '../../utils/format'
import styles from './Timeline.module.css'

const ICONS: Record<TimelineItem['kind'], string> = {
  CALL: '☎',
  STATUS: '⇄',
  ASSIGNMENT: '◆',
}

/** FR-SAL-07: lịch sử cuộc gọi, ghi chú và đổi trạng thái. */
export default function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <p className="muted">Chưa có hoạt động nào.</p>
  return (
    <ol className={styles.timeline}>
      {items.map((item, index) => (
        <li key={`${item.at}-${index}`} className={`${styles.item} ${styles[item.kind]}`}>
          <span className={styles.dot} aria-hidden="true">
            {ICONS[item.kind]}
          </span>
          <div>
            <div className={styles.title}>{item.title}</div>
            {item.detail && <div className={styles.detail}>{item.detail}</div>}
            <div className={styles.meta}>
              {formatDateTime(item.at)} · {item.actorName}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

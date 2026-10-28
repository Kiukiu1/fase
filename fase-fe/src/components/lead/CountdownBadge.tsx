import { useCountdown } from '../../hooks/useCountdown'
import type { Countdown } from '../../types/lead'
import { formatDateTime, formatDuration } from '../../utils/format'
import styles from './CountdownBadge.module.css'

const URGENT_SECONDS = 30 * 60

/** Đồng hồ đếm ngược hạn nhận LEAD (chỉ chạy trong giờ hành chính). */
export default function CountdownBadge({ countdown, fetchedAt }: { countdown: Countdown; fetchedAt: number }) {
  const seconds = useCountdown(countdown, fetchedAt) ?? 0
  if (seconds <= 0) return <span className={`${styles.badge} ${styles.expired}`}>Đã hết hạn nhận</span>
  if (countdown.paused) {
    return (
      <span className={`${styles.badge} ${styles.paused}`} title="Ngoài giờ hành chính, đồng hồ tạm dừng">
        ⏸ {formatDuration(seconds)} · chạy lại {formatDateTime(countdown.resumeAt)}
      </span>
    )
  }
  return (
    <span className={`${styles.badge} ${seconds <= URGENT_SECONDS ? styles.urgent : styles.running}`}>
      ⏱ Còn {formatDuration(seconds)}
    </span>
  )
}

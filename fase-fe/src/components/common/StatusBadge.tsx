import type { LeadStatus } from '../../types/lead'
import { STATUS_LABELS, STATUS_TONES } from '../../utils/leadStatus'
import styles from './StatusBadge.module.css'

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`${styles.badge} ${styles[STATUS_TONES[status]]}`}>{STATUS_LABELS[status]}</span>
}

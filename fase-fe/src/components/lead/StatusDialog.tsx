import { useEffect, useState } from 'react'
import { useLeadMutation } from '../../hooks/useLeadMutation'
import { leadApi } from '../../services/api/leadApi'
import type { LeadDetail, LeadStatus } from '../../types/lead'
import { STATUS_LABELS } from '../../utils/leadStatus'
import Button from '../common/Button'
import Dialog from '../common/Dialog'
import { toast } from '../common/Toaster'
import styles from './LeadDialogs.module.css'

interface StatusDialogProps {
  lead: LeadDetail
  open: boolean
  onClose: () => void
}

/** Đổi trạng thái không kèm cuộc gọi (vd. đã gửi báo giá qua email). */
export default function StatusDialog({ lead, open, onClose }: StatusDialogProps) {
  const [status, setStatus] = useState<LeadStatus | ''>('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setStatus('')
      setReason('')
    }
  }, [open])

  const mutation = useLeadMutation(
    () => leadApi.changeStatus(lead.id, status as LeadStatus, reason.trim() || undefined),
    (updated) => {
      toast(`Đã chuyển sang "${updated.statusLabel}"`)
      onClose()
    },
  )
  const needReason = status === 'STOPPED'
  const canSubmit = !!status && (!needReason || reason.trim()) && !mutation.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cập nhật trạng thái"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button disabled={!canSubmit} onClick={() => mutation.mutate(undefined)}>
            Lưu
          </Button>
        </>
      }
    >
      <p className={styles.hint}>
        Hiện tại: <b>{lead.statusLabel}</b>. Muốn ghi kết quả cuộc gọi thì dùng nút “Ghi cuộc gọi”.
      </p>
      <div className={styles.statusGrid}>
        {lead.allowedStatuses.map((option) => (
          <button
            key={option}
            type="button"
            className={`${styles.statusOption} ${status === option ? styles.choiceActive : ''}`}
            onClick={() => setStatus(option)}
          >
            {STATUS_LABELS[option]}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{needReason ? 'Lý do dừng *' : 'Ghi chú'}</span>
        <textarea className="input" value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
    </Dialog>
  )
}

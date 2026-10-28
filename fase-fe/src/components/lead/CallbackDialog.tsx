import { useEffect, useState } from 'react'
import { useLeadMutation } from '../../hooks/useLeadMutation'
import { leadApi } from '../../services/api/leadApi'
import type { LeadDetail } from '../../types/lead'
import { formatDateTime, toDateTimeLocal } from '../../utils/format'
import Button from '../common/Button'
import Dialog from '../common/Dialog'
import { toast } from '../common/Toaster'
import styles from './LeadDialogs.module.css'

const QUICK_PICKS = [
  { label: '+1 giờ', hours: 1 },
  { label: '+3 giờ', hours: 3 },
  { label: 'Ngày mai 9:00', hours: null },
]

const tomorrowNine = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return date
}

/** FR-SAL-04: đặt lịch gọi lại cho LEAD. */
export default function CallbackDialog({ lead, open, onClose }: { lead: LeadDetail; open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue(lead.nextCallbackAt ? toDateTimeLocal(new Date(lead.nextCallbackAt)) : '')
  }, [open, lead.nextCallbackAt])

  const mutation = useLeadMutation(
    (callbackAt: string | null) => leadApi.setCallback(lead.id, callbackAt),
    (updated) => {
      toast(updated.nextCallbackAt ? `Đã hẹn gọi lại lúc ${formatDateTime(updated.nextCallbackAt)}` : 'Đã huỷ lịch gọi lại')
      onClose()
    },
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Hẹn gọi lại"
      footer={
        <>
          {lead.nextCallbackAt && (
            <Button variant="ghost" onClick={() => mutation.mutate(null)}>
              Huỷ lịch hẹn
            </Button>
          )}
          <Button disabled={!value || mutation.isPending} onClick={() => mutation.mutate(new Date(value).toISOString())}>
            Lưu lịch
          </Button>
        </>
      }
    >
      <div className={styles.choiceRow}>
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick.label}
            type="button"
            className={styles.choice}
            onClick={() =>
              setValue(toDateTimeLocal(pick.hours ? new Date(Date.now() + pick.hours * 3_600_000) : tomorrowNine()))
            }
          >
            {pick.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Thời gian gọi lại</span>
        <input className="input" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <p className={styles.hint}>Đến giờ hẹn hệ thống sẽ gửi thông báo nhắc bạn.</p>
    </Dialog>
  )
}

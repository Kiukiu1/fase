import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLeadMutation } from '../../hooks/useLeadMutation'
import { leadApi, leadKeys } from '../../services/api/leadApi'
import type { CallResult, LeadDetail, LeadStatus } from '../../types/lead'
import { STATUS_LABELS } from '../../utils/leadStatus'
import Button from '../common/Button'
import Dialog from '../common/Dialog'
import StateView from '../common/StateView'
import { toast } from '../common/Toaster'
import styles from './LeadDialogs.module.css'

const schema = z
  .object({
    result: z.enum(['ANSWERED', 'NO_ANSWER'], { message: 'Chọn kết quả cuộc gọi' }),
    status: z.string(),
    durationMinutes: z.string().regex(/^\d{0,3}$/, 'Nhập số phút'),
    note: z.string().max(2000, 'Tối đa 2000 ký tự'),
    reason: z.string().max(2000),
  })
  .refine((form) => form.status !== 'STOPPED' || form.reason.trim(), {
    path: ['reason'],
    message: 'Chuyển sang "Dừng" bắt buộc nhập lý do',
  })

type FormValues = z.infer<typeof schema>

interface CallLogDialogProps {
  leadId: number | null
  onClose: () => void
}

const inNoAnswerFlow = (lead: LeadDetail) => lead.status === 'RECEIVED' || lead.status === 'NO_ANSWER_RETRY'

/** FR-SAL-03: nhập tay kết quả cuộc gọi + trạng thái mới. */
export default function CallLogDialog({ leadId, onClose }: CallLogDialogProps) {
  const open = leadId !== null
  const detail = useQuery({
    queryKey: leadKeys.detail(leadId ?? 0),
    queryFn: () => leadApi.detail(leadId!),
    enabled: open,
  })
  const lead = detail.data
  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: '', durationMinutes: '', note: '', reason: '' },
  })
  const result = watch('result') as CallResult | undefined
  const status = watch('status')

  useEffect(() => {
    if (open) reset({ status: '', durationMinutes: '', note: '', reason: '' })
  }, [open, leadId, reset])

  const flow = lead ? inNoAnswerFlow(lead) : false
  const options: LeadStatus[] = lead?.callOutcomes && result ? lead.callOutcomes[result] : []
  const statusRequired = flow

  useEffect(() => {
    if (!lead || !result) return
    setValue('status', flow && result === 'NO_ANSWER' ? 'NO_ANSWER_RETRY' : '')
  }, [lead, result, flow, setValue])

  const mutation = useLeadMutation(
    (values: FormValues) =>
      leadApi.logCall(leadId!, {
        result: values.result,
        status: (values.status || undefined) as LeadStatus | undefined,
        durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
        note: values.note.trim() || undefined,
        reason: values.reason.trim() || undefined,
      }),
    (response) => {
      if (response.autoGiveUp) {
        toast(`Đã gọi đủ ${response.lead.noAnswerLimit} ngày không nghe máy – LEAD chuyển "Không nghe máy / Từ bỏ"`)
      } else if (response.lead.status === 'NO_ANSWER_RETRY') {
        toast(
          response.counted
            ? `Đã ghi cuộc gọi · ${response.lead.noAnswerCount}/${response.lead.noAnswerLimit} ngày không nghe máy`
            : 'Đã ghi cuộc gọi (hôm nay đã được tính vào bộ đếm rồi)',
        )
      } else {
        toast(`Đã ghi cuộc gọi · ${response.lead.statusLabel}`)
      }
      onClose()
    },
  )

  const submit = handleSubmit((values) => {
    if (statusRequired && !values.status) {
      toast('Vui lòng chọn trạng thái chăm sóc mới', 'error')
      return
    }
    mutation.mutate(values)
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ghi kết quả cuộc gọi"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={!lead || mutation.isPending}>
            {mutation.isPending ? 'Đang lưu...' : 'Lưu kết quả'}
          </Button>
        </>
      }
    >
      <StateView loading={detail.isLoading} error={detail.error} onRetry={() => void detail.refetch()}>
        {lead && (
          <>
            <div className={styles.phoneBox}>
              <div>
                <div className={styles.phone}>{lead.phone}</div>
                <div className="muted">
                  MST {lead.mst} · {lead.servicePackage}
                </div>
              </div>
              <a className={styles.callLink} href={`tel:${lead.phone}`}>
                Gọi
              </a>
            </div>
            {lead.status === 'NO_ANSWER_RETRY' && (
              <p className={styles.hint}>
                Đã {lead.noAnswerCount}/{lead.noAnswerLimit} ngày không nghe máy
                {lead.calledToday ? ' · hôm nay đã gọi' : ''}.
              </p>
            )}
            <form className={styles.form} onSubmit={submit}>
              <div className="field">
                <span>Kết quả</span>
                <div className={styles.choiceRow}>
                  <label className={`${styles.choice} ${result === 'ANSWERED' ? styles.choiceActive : ''}`}>
                    <input type="radio" value="ANSWERED" {...register('result')} /> Khách nghe máy
                  </label>
                  <label className={`${styles.choice} ${result === 'NO_ANSWER' ? styles.choiceActive : ''}`}>
                    <input type="radio" value="NO_ANSWER" {...register('result')} /> Không nghe máy
                  </label>
                </div>
                {formState.errors.result && <span className="error-text">{formState.errors.result.message}</span>}
              </div>
              {result && (
                <label className="field">
                  <span>Trạng thái sau cuộc gọi{statusRequired ? ' *' : ''}</span>
                  <select className="input" {...register('status')}>
                    {!statusRequired && <option value="">Giữ nguyên ({lead.statusLabel})</option>}
                    {statusRequired && !(flow && result === 'NO_ANSWER') && <option value="">— Chọn trạng thái —</option>}
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {STATUS_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {status === 'STOPPED' && (
                <label className="field">
                  <span>Lý do dừng *</span>
                  <textarea className="input" {...register('reason')} />
                  {formState.errors.reason && <span className="error-text">{formState.errors.reason.message}</span>}
                </label>
              )}
              <label className="field">
                <span>Thời lượng (phút)</span>
                <input className="input" inputMode="numeric" {...register('durationMinutes')} />
                {formState.errors.durationMinutes && (
                  <span className="error-text">{formState.errors.durationMinutes.message}</span>
                )}
              </label>
              <label className="field">
                <span>Ghi chú cuộc gọi</span>
                <textarea className="input" placeholder="Nhu cầu, thông tin khai thác được, hẹn..." {...register('note')} />
              </label>
            </form>
          </>
        )}
      </StateView>
    </Dialog>
  )
}

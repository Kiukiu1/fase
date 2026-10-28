import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import StateView from '../../components/common/StateView'
import StatusBadge from '../../components/common/StatusBadge'
import { toast } from '../../components/common/Toaster'
import CallbackDialog from '../../components/lead/CallbackDialog'
import CallLogDialog from '../../components/lead/CallLogDialog'
import CountdownBadge from '../../components/lead/CountdownBadge'
import StatusDialog from '../../components/lead/StatusDialog'
import Timeline from '../../components/lead/Timeline'
import { useLeadMutation } from '../../hooks/useLeadMutation'
import { PATHS } from '../../routes/paths'
import { leadApi, leadKeys } from '../../services/api/leadApi'
import { daysLeft, formatDate, formatDateTime } from '../../utils/format'
import { ACTIVE_STATUSES } from '../../utils/leadStatus'
import styles from '../page.module.css'

type OpenDialog = 'call' | 'status' | 'callback' | null

export default function LeadDetailPage() {
  const leadId = Number(useParams().leadId)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const detail = useQuery({ queryKey: leadKeys.detail(leadId), queryFn: () => leadApi.detail(leadId) })
  const receive = useLeadMutation(leadApi.receive, (lead) => {
    toast(`Đã nhận LEAD ${lead.phone}`)
    setDialog('call')
    window.location.href = `tel:${lead.phone}`
  })

  const lead = detail.data
  const active = !!lead && ACTIVE_STATUSES.includes(lead.status)
  const careLeft = daysLeft(lead?.careDeadline)

  return (
    <StateView loading={detail.isLoading} error={detail.error} onRetry={() => void detail.refetch()}>
      {lead && (
        <>
          <div className={styles.head}>
            <div>
              <h1 className={styles.title}>{lead.phone}</h1>
              <p className={styles.subtitle}>
                MST {lead.mst} · {lead.servicePackage}
              </p>
            </div>
            <StatusBadge status={lead.status} />
            <Button variant="outline" to={PATHS.leads}>
              ← Danh sách
            </Button>
          </div>

          <div className={styles.grid}>
            <section className={styles.panel}>
              <h2>Thông tin LEAD</h2>
              {lead.status === 'ASSIGNED' && lead.countdown && (
                <div className={styles.notice}>
                  Chưa nhận LEAD · <CountdownBadge countdown={lead.countdown} fetchedAt={detail.dataUpdatedAt} />
                </div>
              )}
              {lead.status === 'NO_ANSWER_RETRY' && (
                <div className={styles.notice}>
                  Không nghe máy {lead.noAnswerCount}/{lead.noAnswerLimit} ngày ·{' '}
                  {lead.calledToday ? 'hôm nay đã gọi' : 'hôm nay chưa gọi'}. Đủ {lead.noAnswerLimit} ngày vẫn không
                  nghe, LEAD sẽ tự chuyển “Không nghe máy / Từ bỏ”.
                </div>
              )}
              {careLeft !== null && (
                <div className={styles.notice}>
                  “Đã liên hệ”: còn {Math.max(0, careLeft)} ngày để chuyển sang trạng thái tiến triển (hạn{' '}
                  {formatDateTime(lead.careDeadline)}).
                </div>
              )}
              <dl className={styles.info}>
                <dt>Số điện thoại</dt>
                <dd>
                  <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                </dd>
                <dt>MST</dt>
                <dd>{lead.mst}</dd>
                <dt>Địa chỉ</dt>
                <dd>{lead.address}</dd>
                <dt>Gói dịch vụ</dt>
                <dd>{lead.servicePackage}</dd>
                <dt>Ngày quan tâm</dt>
                <dd>{formatDate(lead.interestedDate)}</dd>
                <dt>Được phân lúc</dt>
                <dd>{formatDateTime(lead.assignedAt)}</dd>
                <dt>Nhận lúc</dt>
                <dd>{formatDateTime(lead.receivedAt)}</dd>
                <dt>Số cuộc gọi</dt>
                <dd>{lead.callCount}</dd>
                <dt>Hẹn gọi lại</dt>
                <dd>{formatDateTime(lead.nextCallbackAt)}</dd>
              </dl>
              <div className={styles.actions}>
                {lead.status === 'ASSIGNED' && (
                  <Button disabled={receive.isPending} onClick={() => receive.mutate(lead.id)}>
                    ☎ Nhận &amp; gọi
                  </Button>
                )}
                {active && (
                  <>
                    <Button onClick={() => setDialog('call')}>☎ Ghi cuộc gọi</Button>
                    {lead.allowedStatuses.length > 0 && (
                      <Button variant="outline" onClick={() => setDialog('status')}>
                        Đổi trạng thái
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setDialog('callback')}>
                      ⏰ Hẹn gọi lại
                    </Button>
                  </>
                )}
              </div>
            </section>
            <section className={styles.panel}>
              <h2>Lịch sử cuộc gọi &amp; ghi chú</h2>
              <Timeline items={lead.timeline} />
            </section>
          </div>

          <CallLogDialog leadId={dialog === 'call' ? lead.id : null} onClose={() => setDialog(null)} />
          <StatusDialog lead={lead} open={dialog === 'status'} onClose={() => setDialog(null)} />
          <CallbackDialog lead={lead} open={dialog === 'callback'} onClose={() => setDialog(null)} />
        </>
      )}
    </StateView>
  )
}

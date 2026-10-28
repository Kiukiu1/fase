import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'
import StateView from '../../components/common/StateView'
import { toast } from '../../components/common/Toaster'
import CallLogDialog from '../../components/lead/CallLogDialog'
import CountdownBadge from '../../components/lead/CountdownBadge'
import { useAuth } from '../../hooks/useAuth'
import { useLeadMutation } from '../../hooks/useLeadMutation'
import { PATHS } from '../../routes/paths'
import { leadApi, leadKeys } from '../../services/api/leadApi'
import { formatDate, formatDateTime } from '../../utils/format'
import styles from '../page.module.css'

const REFRESH_MS = 60_000

/** FR-SAL-01 / FR-SAL-02: LEAD được phân, chờ nhận trong 2 giờ hành chính. */
export default function PendingPage() {
  const { user } = useAuth()
  const [callingId, setCallingId] = useState<number | null>(null)
  const pending = useQuery({ queryKey: leadKeys.pending, queryFn: leadApi.pending, refetchInterval: REFRESH_MS })
  const summary = useQuery({ queryKey: leadKeys.summary, queryFn: leadApi.summary })

  const receive = useLeadMutation(leadApi.receive, (lead) => {
    toast(`Đã nhận LEAD ${lead.phone} – hãy ghi kết quả cuộc gọi`)
    setCallingId(lead.id)
    window.location.href = `tel:${lead.phone}`
  })

  const leads = pending.data ?? []
  const due = summary.data?.due

  return (
    <>
      <div className={styles.banner}>
        <h1 className={styles.title}>Xin chào, {user?.fullName}</h1>
        <p className={styles.subtitle}>
          Bạn có <b>{leads.length}</b> LEAD chờ nhận
          {due && (
            <>
              {' · '}
              <Link to={`${PATHS.leads}?due=CALLBACK`}>
                <b>{due.CALLBACK}</b> lịch gọi lại hôm nay
              </Link>
              {' · '}
              <Link to={`${PATHS.leads}?due=NOT_CALLED_TODAY`}>
                <b>{due.NOT_CALLED_TODAY}</b> LEAD cần gọi tiếp hôm nay
              </Link>
              {' · '}
              <Link to={`${PATHS.leads}?due=CARE_EXPIRING`}>
                <b>{due.CARE_EXPIRING}</b> LEAD sắp hết hạn chăm sóc
              </Link>
            </>
          )}
        </p>
      </div>

      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>LEAD chờ nhận</h2>
          <p className={styles.subtitle}>
            Nhận LEAD = gọi ngay cho khách. Quá 2 giờ (giờ hành chính) không nhận, LEAD tự trả về kho.
          </p>
        </div>
      </div>

      <StateView
        loading={pending.isLoading}
        error={pending.error}
        empty={!leads.length}
        emptyText="Hiện không có LEAD nào chờ nhận."
        onRetry={() => void pending.refetch()}
      >
        <div className={styles.list}>
          {leads.map((lead) => (
            <div key={lead.id} className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.phone}>{lead.phone}</div>
                <div className={styles.meta}>
                  <span>MST {lead.mst}</span>
                  <span>{lead.servicePackage}</span>
                  <span>Quan tâm {formatDate(lead.interestedDate)}</span>
                  <span>{lead.address}</span>
                </div>
                <div className={styles.meta}>
                  <span>Phân lúc {formatDateTime(lead.assignedAt)}</span>
                  <span>Hạn nhận {formatDateTime(lead.receiveDeadline)}</span>
                </div>
              </div>
              <CountdownBadge countdown={lead.countdown} fetchedAt={pending.dataUpdatedAt} />
              <Button
                disabled={receive.isPending || lead.countdown.remainingSeconds <= 0}
                onClick={() => receive.mutate(lead.id)}
              >
                ☎ Nhận &amp; gọi
              </Button>
            </div>
          ))}
        </div>
      </StateView>

      <CallLogDialog leadId={callingId} onClose={() => setCallingId(null)} />
    </>
  )
}

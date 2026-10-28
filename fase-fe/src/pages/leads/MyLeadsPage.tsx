import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import StateView from '../../components/common/StateView'
import StatusBadge from '../../components/common/StatusBadge'
import CallLogDialog from '../../components/lead/CallLogDialog'
import { PATHS } from '../../routes/paths'
import { leadApi, leadKeys, type LeadListParams } from '../../services/api/leadApi'
import type { Lead, LeadStatus, SalesDue } from '../../types/lead'
import { daysLeft, formatDateTime } from '../../utils/format'
import { ACTIVE_STATUSES, CLOSED_STATUSES, STATUS_LABELS } from '../../utils/leadStatus'
import styles from '../page.module.css'

const TABS: { due?: SalesDue; label: string }[] = [
  { label: 'Đang chăm sóc' },
  { due: 'CALLBACK', label: 'Gọi lại hôm nay' },
  { due: 'NOT_CALLED_TODAY', label: 'Cần gọi tiếp hôm nay' },
  { due: 'CARE_EXPIRING', label: 'Sắp hết hạn 7 ngày' },
]

const DUES: SalesDue[] = ['CALLBACK', 'NOT_CALLED_TODAY', 'CARE_EXPIRING']
const STATUSES = [...ACTIVE_STATUSES, ...CLOSED_STATUSES]

function LeadFlags({ lead }: { lead: Lead }) {
  const careLeft = daysLeft(lead.careDeadline)
  return (
    <>
      {lead.status === 'NO_ANSWER_RETRY' && (
        <span className={styles.counter} title="Số ngày đã gọi mà khách không nghe máy">
          {lead.noAnswerCount}/{lead.noAnswerLimit}
        </span>
      )}
      {lead.status === 'NO_ANSWER_RETRY' &&
        (lead.calledToday ? (
          <span className={`${styles.flag} ${styles.ok}`}>✓ Hôm nay đã gọi</span>
        ) : (
          <span className={styles.flag}>Hôm nay chưa gọi</span>
        ))}
      {careLeft !== null && (
        <span className={careLeft <= 2 ? styles.flag : 'muted'}>Hạn chăm sóc: còn {Math.max(0, careLeft)} ngày</span>
      )}
      {lead.nextCallbackAt && <span className="muted">⏰ Gọi lại {formatDateTime(lead.nextCallbackAt)}</span>}
    </>
  )
}

/** FR-SAL-05 / FR-SAL-06: LEAD đang chăm sóc, lọc theo trạng thái và hạn. */
export default function MyLeadsPage() {
  const [params, setParams] = useSearchParams()
  const [callingId, setCallingId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '')

  const query: LeadListParams = {
    keyword: params.get('keyword') || undefined,
    status: (STATUSES.find((status) => status === params.get('status')) as LeadStatus | undefined) ?? undefined,
    due: DUES.find((due) => due === params.get('due')),
    page: Number(params.get('page')) || 1,
  }
  const list = useQuery({
    queryKey: leadKeys.list(query),
    queryFn: () => leadApi.list(query),
    placeholderData: keepPreviousData,
  })
  const summary = useQuery({ queryKey: leadKeys.summary, queryFn: leadApi.summary })

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  const items = list.data?.items ?? []

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>LEAD của tôi</h1>
          <p className={styles.subtitle}>Gọi, ghi kết quả và chăm sóc LEAD theo đúng quy tắc.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const active = !query.status && query.due === tab.due
          const count = tab.due ? summary.data?.due[tab.due] : summary.data?.active
          return (
            <button
              key={tab.label}
              type="button"
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => update({ due: tab.due, status: undefined })}
            >
              {tab.label}
              {count !== undefined && <span className={styles.tabCount}>{count}</span>}
            </button>
          )
        })}
      </div>

      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault()
          update({ keyword: keyword.trim() || undefined })
        }}
      >
        <input
          className="input"
          type="search"
          placeholder="Tìm theo SĐT hoặc MST"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <select
          className="input"
          value={query.status ?? ''}
          onChange={(event) => update({ status: event.target.value || undefined, due: undefined })}
        >
          <option value="">Mọi trạng thái đang chăm sóc</option>
          <optgroup label="Đang chăm sóc">
            {ACTIVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]} ({summary.data?.byStatus[status] ?? 0})
              </option>
            ))}
          </optgroup>
          <optgroup label="Đã kết thúc">
            {CLOSED_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]} ({summary.data?.byStatus[status] ?? 0})
              </option>
            ))}
          </optgroup>
        </select>
        <Button type="submit" variant="outline">
          Tìm
        </Button>
      </form>

      <StateView
        loading={list.isLoading}
        error={list.error}
        empty={!items.length}
        emptyText="Không có LEAD nào phù hợp."
        onRetry={() => void list.refetch()}
      >
        <div className={styles.list}>
          {items.map((lead) => (
            <div key={lead.id} className={styles.card}>
              <div className={styles.cardMain}>
                <Link to={PATHS.leadDetail(lead.id)} className={styles.phone}>
                  {lead.phone}
                </Link>
                <div className={styles.meta}>
                  <span>MST {lead.mst}</span>
                  <span>{lead.servicePackage}</span>
                  <span>Gọi {lead.callCount} lần</span>
                  {lead.lastCallAt && <span>Gần nhất {formatDateTime(lead.lastCallAt)}</span>}
                </div>
                <div className={styles.meta}>
                  <LeadFlags lead={lead} />
                </div>
              </div>
              <div className={styles.tags}>
                <StatusBadge status={lead.status} />
              </div>
              <div className={styles.actions}>
                <Button variant="outline" size="sm" to={PATHS.leadDetail(lead.id)}>
                  Chi tiết
                </Button>
                {ACTIVE_STATUSES.includes(lead.status) && (
                  <Button size="sm" onClick={() => setCallingId(lead.id)}>
                    ☎ Ghi cuộc gọi
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {list.data && (
          <Pagination
            page={list.data.page}
            total={list.data.total}
            pageSize={list.data.pageSize}
            onChange={(page) => update({ page: String(page) })}
          />
        )}
      </StateView>

      <CallLogDialog leadId={callingId} onClose={() => setCallingId(null)} />
    </>
  )
}

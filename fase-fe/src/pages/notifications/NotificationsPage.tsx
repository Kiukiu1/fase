import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'
import StateView from '../../components/common/StateView'
import { PATHS } from '../../routes/paths'
import { notificationApi, notificationKeys } from '../../services/api/notificationApi'
import type { AppNotification } from '../../types/lead'
import { formatDateTime } from '../../utils/format'
import styles from '../page.module.css'

/** FR-COM-03: thông báo in-app. */
export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: () => notificationApi.list(page),
    placeholderData: keepPreviousData,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  const readAll = useMutation({ mutationFn: notificationApi.readAll, onSuccess: refresh })

  const open = async (item: AppNotification) => {
    if (!item.readAt) {
      await notificationApi.read(item.id)
      void refresh()
    }
    if (item.leadId) navigate(PATHS.leadDetail(item.leadId))
  }

  const items = list.data?.items ?? []
  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Thông báo</h1>
          <p className={styles.subtitle}>LEAD được phân, sắp hết hạn nhận, bị trả về kho, lịch gọi lại.</p>
        </div>
        <Button variant="outline" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      <StateView loading={list.isLoading} error={list.error} empty={!items.length} emptyText="Chưa có thông báo.">
        <div className={styles.list}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.card} ${item.readAt ? '' : styles.unread}`}
              style={{ textAlign: 'left' }}
              onClick={() => void open(item)}
            >
              <div className={styles.cardMain}>
                <div style={{ fontWeight: item.readAt ? 400 : 600 }}>{item.content}</div>
                <div className={styles.meta}>{formatDateTime(item.dateCreated)}</div>
              </div>
              {item.leadId && <span className="muted">Xem LEAD →</span>}
            </button>
          ))}
        </div>
        {list.data && (
          <Pagination page={page} total={list.data.total} pageSize={list.data.pageSize} onChange={setPage} />
        )}
      </StateView>
    </>
  )
}

import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export default function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  if (lastPage <= 1) return null
  const first = Math.max(1, page - 2)
  const pages = Array.from({ length: Math.min(5, lastPage - first + 1) }, (_, index) => first + index)

  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <span className={styles.total}>Tổng {total} LEAD</span>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {pages.map((number) => (
        <button
          key={number}
          type="button"
          className={number === page ? styles.active : undefined}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}
      <button type="button" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </nav>
  )
}

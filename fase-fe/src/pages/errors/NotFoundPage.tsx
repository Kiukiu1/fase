import Button from '../../components/common/Button'
import { PATHS } from '../../routes/paths'
import styles from '../page.module.css'

export default function NotFoundPage() {
  return (
    <div className={styles.panel} style={{ textAlign: 'center', display: 'grid', gap: 12, justifyItems: 'center' }}>
      <h1 className={styles.title}>Không tìm thấy trang</h1>
      <p className="muted">Trang bạn tìm không tồn tại hoặc đã bị chuyển.</p>
      <Button to={PATHS.home}>Về trang chờ nhận</Button>
    </div>
  )
}

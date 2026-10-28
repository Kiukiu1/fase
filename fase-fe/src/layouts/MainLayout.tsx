import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import styles from './MainLayout.module.css'

export default function MainLayout() {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        © 2026 FASE · Fase-Sales · Nhận LEAD trong 2 giờ hành chính, gọi 7 cuộc / 7 ngày
      </footer>
    </div>
  )
}

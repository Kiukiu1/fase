import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { leadApi, leadKeys } from '../../services/api/leadApi'
import { notificationApi, notificationKeys } from '../../services/api/notificationApi'
import { PATHS } from '../../routes/paths'
import styles from './Header.module.css'

const POLL_MS = 30_000

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const summary = useQuery({ queryKey: leadKeys.summary, queryFn: leadApi.summary, refetchInterval: POLL_MS })
  const unread = useQuery({
    queryKey: notificationKeys.unread,
    queryFn: notificationApi.unreadCount,
    refetchInterval: POLL_MS,
  })
  const dueCount = summary.data
    ? summary.data.due.CALLBACK + summary.data.due.NOT_CALLED_TODAY + summary.data.due.CARE_EXPIRING
    : 0

  const navClass = ({ isActive }: { isActive: boolean }) => `${styles.navLink} ${isActive ? styles.active : ''}`

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={PATHS.home} className={styles.brand}>
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <span>
            FASE <small>Sales</small>
          </span>
        </Link>
        <nav className={styles.nav}>
          <NavLink to={PATHS.home} end className={navClass}>
            Chờ nhận
            {!!summary.data?.pending && <span className={`${styles.count} ${styles.warn}`}>{summary.data.pending}</span>}
          </NavLink>
          <NavLink to={PATHS.leads} className={navClass}>
            LEAD của tôi
            {!!dueCount && <span className={styles.count}>{dueCount}</span>}
          </NavLink>
        </nav>
        <Link to={PATHS.notifications} className={styles.bell} aria-label="Thông báo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {!!unread.data && <span className={styles.bellCount}>{unread.data > 99 ? '99+' : unread.data}</span>}
        </Link>
        <Menu as="div" className={styles.profile}>
          <MenuButton className={styles.profileButton}>
            <span className={styles.avatar}>{user?.fullName.charAt(0).toUpperCase()}</span>
            <span className={styles.name}>{user?.fullName}</span>
          </MenuButton>
          <MenuItems anchor="bottom end" className={styles.menu}>
            <div className={styles.menuHeader}>
              {user?.fullName}
              <small>{user?.username}</small>
            </div>
            <MenuItem>
              <button type="button" className={styles.menuItem} onClick={() => navigate(PATHS.password)}>
                Đổi mật khẩu
              </button>
            </MenuItem>
            <MenuItem>
              <button type="button" className={styles.menuItem} onClick={signOut}>
                Đăng xuất
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
    </header>
  )
}

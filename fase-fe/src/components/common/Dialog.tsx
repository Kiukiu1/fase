import { Dialog as HeadlessDialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { ReactNode } from 'react'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Hộp thoại dạng drawer bên phải để nhân viên thao tác nhanh mà không rời trang. */
export default function Dialog({ open, title, onClose, children, footer, wide }: DialogProps) {
  return (
    <HeadlessDialog open={open} onClose={onClose}>
      <div className={styles.overlay}>
        <DialogPanel className={`${styles.panel} ${wide ? styles.wide : ''}`}>
          <div className={styles.header}>
            <DialogTitle as="h2" className={styles.title}>
              {title}
            </DialogTitle>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
              ×
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </DialogPanel>
      </div>
    </HeadlessDialog>
  )
}

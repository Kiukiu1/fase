import { useSyncExternalStore } from 'react'
import styles from './Toaster.module.css'

type ToastType = 'success' | 'error'
interface Toast {
  id: number
  type: ToastType
  message: string
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function toast(message: string, type: ToastType = 'success') {
  const id = nextId++
  toasts = [...toasts, { id, type, message }]
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id)
    emit()
  }, 5000)
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export default function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts)
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`${styles.toast} ${styles[item.type]}`}>
          {item.message}
        </div>
      ))}
    </div>
  )
}

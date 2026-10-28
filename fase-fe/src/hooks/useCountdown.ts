import { useEffect, useState } from 'react'
import type { Countdown } from '../types/lead'

/**
 * Đếm lùi từ số giây giờ hành chính server trả về. Khi ngoài giờ hành chính
 * (paused) đồng hồ đứng yên; client chỉ hiển thị, hạn thật do server quyết định.
 */
export function useCountdown(countdown: Countdown | null | undefined, fetchedAt: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!countdown || countdown.paused || countdown.remainingSeconds <= 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [countdown])

  if (!countdown) return null
  const elapsed = countdown.paused ? 0 : Math.max(0, (now - fetchedAt) / 1000)
  return Math.max(0, countdown.remainingSeconds - elapsed)
}

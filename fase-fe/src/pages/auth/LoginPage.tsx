import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import Button from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/paths'
import { authApi } from '../../services/auth/authApi'
import { errorMessage } from '../../services/api/errorMessage'
import { tokenStorage } from '../../services/auth/tokenStorage'
import styles from './LoginPage.module.css'

const schema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

type FormValues = z.infer<typeof schema>

const safePath = (path: string | null) => (path && path.startsWith('/') && !path.startsWith('//') ? path : PATHS.home)

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (isAuthenticated) return <Navigate to={PATHS.home} replace />

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(null)
    try {
      tokenStorage.save(await authApi.login(username, password))
      navigate(safePath(params.get('returnTo')), { replace: true })
    } catch (caught) {
      setError(errorMessage(caught, 'Đăng nhập thất bại'))
    }
  })

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" width={44} height={44} />
          <span>
            FASE <small>Sales</small>
          </span>
        </div>
        <form className={styles.card} onSubmit={onSubmit} noValidate>
          <h1>Đăng nhập Fase-Sales</h1>
          <p className="muted">Dành cho nhân viên Sales</p>
          {error && <div className={styles.error}>{error}</div>}
          <label className="field">
            <span>Tên đăng nhập</span>
            <input className="input" autoComplete="username" autoFocus {...register('username')} />
            {formState.errors.username && <span className="error-text">{formState.errors.username.message}</span>}
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input className="input" type="password" autoComplete="current-password" {...register('password')} />
            {formState.errors.password && <span className="error-text">{formState.errors.password.message}</span>}
          </label>
          <Button type="submit" block disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
          <p className={styles.note}>Tài khoản do quản trị viên cấp. Trưởng phòng vui lòng dùng Fase-CRM.</p>
        </form>
      </div>
      <div className={styles.hero}>
        <h2>
          Nhận LEAD là <em>gọi ngay</em>
        </h2>
        <p>Theo dõi LEAD được phân, đồng hồ hạn nhận 2 giờ, bộ đếm 7 cuộc / 7 ngày và lịch gọi lại ở cùng một nơi.</p>
        <ul>
          <li>Đếm ngược hạn nhận theo giờ hành chính</li>
          <li>Ghi kết quả cuộc gọi và cập nhật trạng thái trong vài giây</li>
          <li>Nhắc lịch gọi lại, cảnh báo LEAD sắp hết hạn chăm sóc</li>
        </ul>
      </div>
    </div>
  )
}

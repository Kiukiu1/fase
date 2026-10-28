import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Button from '../../components/common/Button'
import { toast } from '../../components/common/Toaster'
import { errorMessage } from '../../services/api/errorMessage'
import { accountApi } from '../../services/api/accountApi'
import styles from '../page.module.css'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((form) => form.newPassword === form.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Xác nhận mật khẩu không khớp',
  })

type FormValues = z.infer<typeof schema>

/** FR-COM-02 */
export default function ChangePasswordPage() {
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { message } = await accountApi.changePassword(values.currentPassword, values.newPassword)
      toast(message)
      reset()
    } catch (error) {
      toast(errorMessage(error), 'error')
    }
  })

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Đổi mật khẩu</h1>
        </div>
      </div>
      <form className={styles.panel} style={{ maxWidth: 440, display: 'grid', gap: 14 }} onSubmit={onSubmit}>
        <label className="field">
          <span>Mật khẩu hiện tại</span>
          <input className="input" type="password" autoComplete="current-password" {...register('currentPassword')} />
          {formState.errors.currentPassword && (
            <span className="error-text">{formState.errors.currentPassword.message}</span>
          )}
        </label>
        <label className="field">
          <span>Mật khẩu mới</span>
          <input className="input" type="password" autoComplete="new-password" {...register('newPassword')} />
          {formState.errors.newPassword && <span className="error-text">{formState.errors.newPassword.message}</span>}
        </label>
        <label className="field">
          <span>Nhập lại mật khẩu mới</span>
          <input className="input" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          {formState.errors.confirmPassword && (
            <span className="error-text">{formState.errors.confirmPassword.message}</span>
          )}
        </label>
        <Button type="submit" disabled={formState.isSubmitting}>
          Lưu mật khẩu
        </Button>
      </form>
    </>
  )
}

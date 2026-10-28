import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'outline' | 'ghost' | 'muted' | 'icon'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  className?: string
  children: ReactNode
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined }
type LinkProps = CommonProps & { to: string; onClick?: () => void }

function classes({ variant = 'primary', size = 'md', block, className }: CommonProps) {
  return [styles.button, styles[variant], styles[size], block && styles.block, className].filter(Boolean).join(' ')
}

export default function Button(props: ButtonProps | LinkProps) {
  if (props.to !== undefined) {
    const { to, onClick, children } = props
    return (
      <Link to={to} onClick={onClick} className={classes(props)}>
        {children}
      </Link>
    )
  }

  const { variant, size, block, className, children, type = 'button', ...rest } = props
  return (
    <button type={type} className={classes({ variant, size, block, className, children })} {...rest}>
      {children}
    </button>
  )
}

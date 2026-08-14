import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  title?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  info: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
}

export function Badge({ variant = 'neutral', children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

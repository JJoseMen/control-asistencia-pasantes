import { cn } from '@/lib/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
}

export function Select({
  label,
  error,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || props.name

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white',
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700',
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}
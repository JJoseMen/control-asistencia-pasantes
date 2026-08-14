'use client'

import { cn } from '@/lib/utils'

export interface StatCard {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface Props {
  cards: StatCard[]
}

export default function StatsCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', card.color)}>
            <card.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none text-slate-900">{card.value}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, CheckCircle2, MapPin, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { AttendanceRecord } from '@/types'

type DayStatus =
  | { stage: 'none' }
  | { stage: 'open'; attendance: AttendanceRecord }
  | { stage: 'closed'; attendance: AttendanceRecord }

interface ClockInButtonProps {
  disabled: boolean
  isCheckingIn: boolean
  onClick: () => void
}

export function ClockInButton({ disabled, isCheckingIn, onClick }: ClockInButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isCheckingIn}
      className={cn(
        'relative flex h-52 w-52 items-center justify-center rounded-full border-8 border-emerald-200 bg-emerald-500 text-white shadow-xl transition hover:scale-105 hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <span className="text-center">
        {isCheckingIn ? (
          <Clock3 className="mx-auto h-10 w-10 animate-spin" />
        ) : (
          <MapPin className="mx-auto h-10 w-10" />
        )}
        <span className="mt-2 block text-lg font-bold">
          {isCheckingIn ? 'Marcando...' : 'MARCAR ENTRADA'}
        </span>
      </span>
    </button>
  )
}

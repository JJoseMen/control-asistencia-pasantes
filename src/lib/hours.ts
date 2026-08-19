import { format, parse, isAfter, isBefore, differenceInMinutes } from 'date-fns'

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTime(value: string): boolean {
  return TIME_REGEX.test(value)
}

function toDate(time: string): Date {
  return parse(time, 'HH:mm', new Date())
}

export function getWorkStartTime(workStart?: string): Date {
  return toDate(workStart || process.env.WORK_START_TIME || '08:00')
}

export function getWorkEndTime(workEnd?: string): Date {
  return toDate(workEnd || process.env.WORK_END_TIME || '16:00')
}

export function isLate(checkInTime: Date, workStart?: string): boolean {
  return isAfter(checkInTime, getWorkStartTime(workStart))
}

export function isEarlyDeparture(checkOutTime: Date, workEnd?: string): boolean {
  return isBefore(checkOutTime, getWorkEndTime(workEnd))
}

const TOLERANCE_MINUTES = 15

export function getAttendanceStatus(
  horaActual: Date,
  horaEntradaProgramada: string,
  toleranceMinutes: number = TOLERANCE_MINUTES
): 'PRESENTE' | 'TARDANZA' {
  const programada = toDate(horaEntradaProgramada)
  const diff = differenceInMinutes(horaActual, programada)
  return diff <= toleranceMinutes ? 'PRESENTE' : 'TARDANZA'
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm')
}

export function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}
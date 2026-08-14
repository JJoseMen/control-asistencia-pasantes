export type Role = 'ADMIN' | 'PASANTE'

export interface Pasante {
  id: string
  name: string
  email: string
  cedula: string
  institucion?: string
  carrera?: string
  telefono?: string
  lugarId?: string
  horaEntrada: string
  horaSalida: string
  fechaInicio: Date
  fechaFin: Date
  activo: boolean
}

export interface AttendanceRecord {
  id: string
  fecha: Date
  horaEntrada?: Date
  horaSalida?: Date
  status: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'PERMISO'
  notas?: string
}

export interface DailyReport {
  date: string
  totalPasantes: number
  presentes: number
  ausentes: number
  tardanzas: number
}

export interface UserSession {
  id: string
  email: string
  name: string
  role: Role
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  mustChangePassword?: boolean
}

export interface LoginResponse {
  token: string
  user: AuthUser
  mustChangePassword?: boolean
}
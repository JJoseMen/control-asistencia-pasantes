# Bitácora — feature/mobile-auditoria

## Estado actual
- Fase: 2A (seguridad de secretos) — completada
- Última actualización: 2026-11-18

## Decisiones tomadas
- Opción C: extensión con `mobile/` adentro del repo actual
- Rama `feature/mobile-auditoria` desde `master`
- Espejo: registrosPAS-mirror (privado)
- Postgres local: nativo (PostgreSQL 17.10, Docker no disponible)
- Schema defaults aplicados (ver tabla abajo)

## Decisiones de schema (Paso 1)
| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | ¿1 marca/día o múltiples? | 1 marca/día, `@@unique([pasanteId, fecha])` |
| 2 | ¿Corrección admin? | UPDATE + AdminLog con before/after |
| 3 | ¿Soft delete? | Sí, `deletedAt` en User, Pasante, Place |
| 4 | ¿AdminLog con snapshot? | Sí, `before Json?`, `after Json?` |
| 5 | ¿Modelo Device? | Sí, en Fase 1 |
| 6 | ¿Timestamptz? | Sí, todos los DateTime de instante |
| 7 | ¿cedula única? | Global |
| 8 | ¿horario JSON o tabla? | JSON en Pasante.horario |
| 9 | ¿Retención AdminLog? | Indefinida por ahora |
| 10 | ¿AttendanceStatus ampliado? | Sí, agregar AJUSTE_ADMIN |

## Decisiones de Fase 2A — Seguridad de secretos
- Decisión 1: Pasante nuevo con contraseña aleatoria (`randomBytes(12).toString('base64url')`) devuelta una vez en el JSON 201 (campo `initialPassword`) + endpoint `POST /api/pasantes/[id]/reset-password` (solo ADMIN) que regenera contraseña y la devuelve una vez. `mustChangePassword: true`.
- Decisión 2: Admin seed con contraseña aleatoria (`randomBytes(12).toString('base64url')`) mostrada UNA VEZ en consola. Idempotente: si el admin ya existe, no regenera ni reimprime.
- Decisión 3: JWT_SECRET fail fast en `src/lib/auth.ts`: si falta, es vacío, es placeholder, o tiene menos de 32 caracteres, lanza Error al importar el módulo. Nada de fallback.
- El endpoint reset-password invalida JWT viejos vía `tokenVersion++` en User.

## Archivos modificados en Fase 2A
- `src/lib/auth.ts`: JWT_SECRET sin fallback, fail fast con placeholder detectado
- `prisma/seed.ts`: contraseña admin aleatoria, mostrada 1 vez, idempotente
- `src/app/api/pasantes/route.ts`: contraseña pasante aleatoria, `initialPassword` en JSON 201, sin imprimir en consola
- `src/app/api/pasantes/[id]/reset-password/route.ts`: nuevo endpoint, solo ADMIN, invalida JWT via tokenVersion++
- `.env.example`: creado con las 8 variables de entorno esperadas
- `vitest.config.ts`: creado, entorno node
- `src/lib/__tests__/auth.test.ts`: 6 tests de auth (sign/verify, token corrupto, fail fast sin JWT_SECRET, placeholder, vacío, <32 chars)
- `package.json`: scripts `test` y `test:watch` agregados

## Pendientes
- [x] Sub-paso 1: schema nuevo
- [x] Sub-paso 1.5: 5 queries de verificación
- [x] Sub-paso 2: aplicar migración en local
- [x] Fase 2A: remover secretos hardcodeados
- [ ] Fase 2B: CORS, Bearer, Zod validation, AdminLog writes, rate limiting, /api/attendance/mine, /api/devices/register


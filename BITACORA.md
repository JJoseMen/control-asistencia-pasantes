# Bitácora — feature/mobile-auditoria

## Estado actual
- Fase: 0 (preparación local)
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

## Pendientes
- [ ] Sub-paso 1: schema nuevo
- [ ] Sub-paso 1.5: 5 queries de verificación
- [ ] Sub-paso 2: aplicar migración en local
- [ ] Fase 2A: remover secretos hardcodeados

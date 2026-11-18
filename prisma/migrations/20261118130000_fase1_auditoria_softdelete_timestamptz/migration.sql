-- CreateEnum for AuditAction
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'CHANGE_PASSWORD', 'CREATE_USER', 'UPDATE_USER', 'DEACTIVATE_USER', 'CREATE_PASANTE', 'UPDATE_PASANTE', 'DELETE_PASANTE', 'CREATE_PLACE', 'UPDATE_PLACE', 'DELETE_PLACE', 'CHECKIN', 'CHECKOUT', 'ADMIN_ADJUST_ATTENDANCE', 'EXPORT_REPORT');

-- Add AJUSTE_ADMIN to AttendanceStatus
ALTER TYPE "AttendanceStatus" ADD VALUE 'AJUSTE_ADMIN';

-- Create Device table
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT,
    "deviceName" TEXT,
    "lastSeenAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on Device
CREATE UNIQUE INDEX "Device_pushToken_key" ON "Device"("pushToken");
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- Alter User: add new columns
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3) WITH TIME ZONE;
ALTER TABLE "User" ALTER COLUMN "mustChangePassword" SET DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "createdAt"::timestamptz;
ALTER TABLE "User" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updatedAt"::timestamptz;

-- CreateIndex on User
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- Alter Place: rename radio->radius, activo->active, add deletedAt, change types
ALTER TABLE "Place" ADD COLUMN "radius" DOUBLE PRECISION;
UPDATE "Place" SET "radius" = "radio";
ALTER TABLE "Place" ALTER COLUMN "radius" SET NOT NULL;
ALTER TABLE "Place" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Place" SET "active" = "activo";
ALTER TABLE "Place" ADD COLUMN "deletedAt" TIMESTAMP(3) WITH TIME ZONE;
ALTER TABLE "Place" ALTER COLUMN "lat" TYPE DOUBLE PRECISION USING "lat"::double precision;
ALTER TABLE "Place" ALTER COLUMN "lng" TYPE DOUBLE PRECISION USING "lng"::double precision;
ALTER TABLE "Place" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "createdAt"::timestamptz;
ALTER TABLE "Place" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updatedAt"::timestamptz;
ALTER TABLE "Place" DROP COLUMN IF EXISTS "radio";
ALTER TABLE "Place" DROP COLUMN IF EXISTS "activo";

-- Alter Pasante: add new columns, change fechaFin nullable, drop horaEntrada/horaSalida/lugarId, add placeId
ALTER TABLE "Pasante" ADD COLUMN "horario" JSON;
ALTER TABLE "Pasante" ADD COLUMN "placeId" TEXT;
ALTER TABLE "Pasante" ADD COLUMN "deletedAt" TIMESTAMP(3) WITH TIME ZONE;
ALTER TABLE "Pasante" ALTER COLUMN "fechaFin" DROP NOT NULL;
ALTER TABLE "Pasante" ALTER COLUMN "fechaInicio" TYPE TIMESTAMP(3) WITH TIME ZONE USING "fechaInicio"::timestamptz;
ALTER TABLE "Pasante" ALTER COLUMN "fechaFin" TYPE TIMESTAMP(3) WITH TIME ZONE USING "fechaFin"::timestamptz;
ALTER TABLE "Pasante" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "createdAt"::timestamptz;
ALTER TABLE "Pasante" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updatedAt"::timestamptz;
ALTER TABLE "Pasante" DROP COLUMN IF EXISTS "horaEntrada";
ALTER TABLE "Pasante" DROP COLUMN IF EXISTS "horaSalida";
ALTER TABLE "Pasante" DROP COLUMN IF EXISTS "lugarId";
ALTER TABLE "Pasante" DROP CONSTRAINT IF EXISTS "Pasante_lugarId_fkey";
ALTER TABLE "Pasante" ADD CONSTRAINT "Pasante_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex on Pasante
CREATE INDEX "Pasante_userId_idx" ON "Pasante"("userId");
CREATE INDEX "Pasante_placeId_idx" ON "Pasante"("placeId");
CREATE INDEX "Pasante_activo_idx" ON "Pasante"("activo");

-- Alter Attendance: add new columns, rename notas->nota, change types
ALTER TABLE "Attendance" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "nota" TEXT;
UPDATE "Attendance" SET "nota" = "notas";
ALTER TABLE "Attendance" DROP COLUMN IF EXISTS "notas";
ALTER TABLE "Attendance" ALTER COLUMN "horaEntrada" TYPE TIMESTAMP(3) WITH TIME ZONE USING "horaEntrada"::timestamptz;
ALTER TABLE "Attendance" ALTER COLUMN "horaSalida" TYPE TIMESTAMP(3) WITH TIME ZONE USING "horaSalida"::timestamptz;
ALTER TABLE "Attendance" ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "createdAt"::timestamptz;
ALTER TABLE "Attendance" ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updatedAt"::timestamptz;
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_pasanteId_fkey";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_pasanteId_fkey" FOREIGN KEY ("pasanteId") REFERENCES "Pasante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old indexes and create new ones on Attendance
DROP INDEX IF EXISTS "Attendance_pasanteId_idx";
DROP INDEX IF EXISTS "Attendance_fecha_idx";
DROP INDEX IF EXISTS "Attendance_pasanteId_fecha_key";
CREATE UNIQUE INDEX "Attendance_pasanteId_fecha_key" ON "Attendance"("pasanteId", "fecha");
CREATE INDEX "Attendance_pasanteId_fecha_idx" ON "Attendance"("pasanteId", "fecha");
CREATE INDEX "Attendance_fecha_status_idx" ON "Attendance"("fecha", "status");

-- Redefine AdminLog: drop old and create new
DROP TABLE IF EXISTS "AdminLog";
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSON,
    "after" JSON,
    "metadata" JSON,
    "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on AdminLog
CREATE INDEX "AdminLog_actorId_createdAt_idx" ON "AdminLog"("actorId", "createdAt");
CREATE INDEX "AdminLog_action_createdAt_idx" ON "AdminLog"("action", "createdAt");
CREATE INDEX "AdminLog_entityType_entityId_idx" ON "AdminLog"("entityType", "entityId");

-- Add FK for AdminLog actor
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

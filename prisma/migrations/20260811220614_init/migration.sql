-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PASANTE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'AUSENTE', 'TARDANZA', 'PERMISO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PASANTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasante" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "telefono" TEXT,
    "institucion" TEXT,
    "carrera" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pasante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "pasanteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaEntrada" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalles" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pasante_userId_key" ON "Pasante"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pasante_cedula_key" ON "Pasante"("cedula");

-- CreateIndex
CREATE INDEX "Attendance_pasanteId_idx" ON "Attendance"("pasanteId");

-- CreateIndex
CREATE INDEX "Attendance_fecha_idx" ON "Attendance"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_pasanteId_fecha_key" ON "Attendance"("pasanteId", "fecha");

-- AddForeignKey
ALTER TABLE "Pasante" ADD CONSTRAINT "Pasante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_pasanteId_fkey" FOREIGN KEY ("pasanteId") REFERENCES "Pasante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

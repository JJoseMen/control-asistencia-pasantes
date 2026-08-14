-- AlterTable
ALTER TABLE "Pasante" ADD COLUMN     "lugarId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radio" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pasante" ADD CONSTRAINT "Pasante_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

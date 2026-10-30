-- AlterTable
ALTER TABLE "Consultorio" ADD COLUMN     "duracionCita" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "Horario" (
    "id" SERIAL NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "consultorioId" INTEGER NOT NULL,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

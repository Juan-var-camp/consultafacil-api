const prisma = require('../lib/prisma');
const { horariosPorDefecto } = require('../lib/horarios');

async function main() {
  const sinHorario = await prisma.consultorio.findMany({
    where: { horarios: { none: {} } },
    select: { id: true },
  });

  for (const { id } of sinHorario) {
    await prisma.horario.createMany({
      data: horariosPorDefecto().map((franja) => ({ ...franja, consultorioId: id })),
    });
  }
  console.log(`Horario por defecto asignado a ${sinHorario.length} consultorio(s)`);
}

main().finally(() => prisma.$disconnect());
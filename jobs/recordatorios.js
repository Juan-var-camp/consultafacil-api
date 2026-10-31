const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { enviarCorreo } = require('../lib/correo');
const { recordatorioCita } = require('../lib/plantillas');

const HORAS_ANTICIPACION = 24;

async function enviarRecordatorios() {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + HORAS_ANTICIPACION * 60 * 60 * 1000);

  const citas = await prisma.cita.findMany({
    where: {
      estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      recordatorioEnviado: false,
      fecha: { gt: ahora, lte: limite },
    },
    include: {
      paciente: { select: { nombre: true, email: true } },
      consultorio: { select: { id: true, nombre: true, direccion: true } },
    },
  });

  for (const cita of citas) {
    // Se marca ANTES de enviar: si dos ejecuciones se cruzan, solo una gana y no sale doble
    const { count } = await prisma.cita.updateMany({
      where: { id: cita.id, recordatorioEnviado: false },
      data: { recordatorioEnviado: true },
    });
    if (count === 0) continue;

    try {
      await enviarCorreo({ para: cita.paciente.email, ...recordatorioCita(cita) });
    } catch (error) {
      console.error(`No se pudo enviar el recordatorio de la cita ${cita.id}:`, error.message);
      // Se desmarca para reintentar en la siguiente ejecución
      await prisma.cita.update({ where: { id: cita.id }, data: { recordatorioEnviado: false } });
    }
  }

  return citas.length;
}

function iniciarRecordatorios() {
  cron.schedule(
    '*/15 * * * *', // cada 15 minutos
    () => {
      enviarRecordatorios().catch((error) => console.error('Error en los recordatorios:', error));
    },
    { timezone: 'America/Bogota' }
  );
  console.log('Recordatorios programados: se revisan cada 15 minutos');
}

module.exports = { iniciarRecordatorios, enviarRecordatorios };
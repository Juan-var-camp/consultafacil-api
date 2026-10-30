const prisma = require('./prisma');

const ZONA = '-05:00'; // Colombia no tiene horario de verano
const DURACIONES = [15, 20, 30, 45, 60];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Lunes a viernes, mañana y tarde
function horariosPorDefecto() {
  const franjas = [];
  for (let diaSemana = 1; diaSemana <= 5; diaSemana++) {
    franjas.push({ diaSemana, horaInicio: '08:00', horaFin: '12:00' });
    franjas.push({ diaSemana, horaInicio: '14:00', horaFin: '18:00' });
  }
  return franjas;
}

// ¿'2026-11-20' es una fecha real? (rechaza '2026-02-31')
function fechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia
  );
}

// Día de la semana de una fecha del calendario: 0 = domingo ... 6 = sábado
function diaSemanaDe(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

function aMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Inicios de cita de un día, a partir de las franjas de ese día
function generarHorarios(fecha, franjas, duracion) {
  const inicios = [];
  for (const { horaInicio, horaFin } of franjas) {
    for (let min = aMinutos(horaInicio); min + duracion <= aMinutos(horaFin); min += duracion) {
      const hh = String(Math.floor(min / 60)).padStart(2, '0');
      const mm = String(min % 60).padStart(2, '0');
      inicios.push(new Date(`${fecha}T${hh}:${mm}:00${ZONA}`));
    }
  }
  return inicios;
}

// ¿Esta fecha coincide con un bloque que ese consultorio realmente ofrece?
async function esHorarioValido(consultorioId, fecha) {
  const diaLocal = new Date(fecha.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const consultorio = await prisma.consultorio.findUnique({
    where: { id: consultorioId },
    select: {
      duracionCita: true,
      horarios: { where: { diaSemana: diaSemanaDe(diaLocal) } },
    },
  });
  if (!consultorio) return false;

  return generarHorarios(diaLocal, consultorio.horarios, consultorio.duracionCita).some(
    (h) => h.getTime() === fecha.getTime()
  );
}

// Devuelve un mensaje de error, o null si la configuración es válida
function validarConfiguracion(duracionCita, franjas) {
  if (!DURACIONES.includes(duracionCita)) {
    return `duracionCita debe ser uno de estos valores: ${DURACIONES.join(', ')}`;
  }
  if (!Array.isArray(franjas) || franjas.length > 28) {
    return 'franjas debe ser una lista de máximo 28 elementos';
  }

  for (const f of franjas) {
    if (!Number.isInteger(f?.diaSemana) || f.diaSemana < 0 || f.diaSemana > 6) {
      return 'diaSemana debe ser un número de 0 (domingo) a 6 (sábado)';
    }
    if (!HORA.test(f.horaInicio ?? '') || !HORA.test(f.horaFin ?? '')) {
      return 'Las horas deben tener el formato HH:MM, por ejemplo 08:00';
    }
    if (aMinutos(f.horaInicio) + duracionCita > aMinutos(f.horaFin)) {
      return `La franja ${f.horaInicio}-${f.horaFin} es más corta que una cita`;
    }
  }

  // Dos franjas del mismo día no pueden cruzarse
  const ordenadas = [...franjas].sort(
    (a, b) => a.diaSemana - b.diaSemana || aMinutos(a.horaInicio) - aMinutos(b.horaInicio)
  );
  for (let i = 1; i < ordenadas.length; i++) {
    const anterior = ordenadas[i - 1];
    const actual = ordenadas[i];
    if (
      anterior.diaSemana === actual.diaSemana &&
      aMinutos(actual.horaInicio) < aMinutos(anterior.horaFin)
    ) {
      return 'Hay franjas que se cruzan en el mismo día';
    }
  }
  return null;
}

module.exports = {
  horariosPorDefecto,
  fechaValida,
  diaSemanaDe,
  generarHorarios,
  esHorarioValido,
  validarConfiguracion,
};
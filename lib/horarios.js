const ZONA = '-05:00'; // Colombia no tiene horario de verano
const DURACION_MIN = 30;
const JORNADAS = [
  [8, 12],  // mañana: 8:00 a 12:00
  [14, 18], // tarde: 14:00 a 18:00
];

// ¿'2026-11-20' es una fecha real? (rechaza '2026-02-31')
function fechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia
  );
}

// Lista de inicios de cita de un día, como objetos Date
function generarHorarios(fecha) {
  const inicios = [];
  for (const [desde, hasta] of JORNADAS) {
    for (let minutos = desde * 60; minutos < hasta * 60; minutos += DURACION_MIN) {
      const hh = String(Math.floor(minutos / 60)).padStart(2, '0');
      const mm = String(minutos % 60).padStart(2, '0');
      inicios.push(new Date(`${fecha}T${hh}:${mm}:00${ZONA}`));
    }
  }
  return inicios;
}

// ¿Esta fecha coincide exactamente con un bloque válido?
function esHorarioValido(fecha) {
  const diaLocal = new Date(fecha.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return generarHorarios(diaLocal).some((h) => h.getTime() === fecha.getTime());
}

module.exports = { fechaValida, generarHorarios, esHorarioValido, DURACION_MIN };
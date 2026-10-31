const ZONA = 'America/Bogota';
const frontend = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// Los datos del usuario nunca van sin escapar dentro del HTML
const esc = (texto = '') =>
  String(texto).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

// Siempre en hora de Colombia, sin importar la zona del servidor
function fechaLarga(fecha) {
  const dia = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA,
  })
    .format(fecha)
    .replace(',', '');
  const hora = new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: ZONA,
  }).format(fecha);
  return `${dia}, ${hora}`;
}

function armar({ asunto, titulo, parrafo, cita, boton }) {
  const detalles = [
    ['Consultorio', cita.consultorio.nombre],
    ['Dirección', cita.consultorio.direccion],
    ['Fecha y hora', fechaLarga(cita.fecha)],
  ];

  const texto = [
    titulo,
    '',
    parrafo,
    '',
    ...detalles.map(([clave, valor]) => `${clave}: ${valor}`),
    '',
    `${boton.texto}: ${boton.url}`,
    '',
    'ConsultaFácil',
  ].join('\n');

  const html = `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#12201D">
  <h1 style="font-size:20px;color:#0F5C4D">${esc(titulo)}</h1>
  <p style="font-size:16px;line-height:1.5">${esc(parrafo)}</p>
  <table style="margin:16px 0;font-size:16px">
    ${detalles
      .map(
        ([clave, valor]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#4A5B57">${esc(clave)}</td><td style="padding:4px 0"><strong>${esc(valor)}</strong></td></tr>`
      )
      .join('')}
  </table>
  <p><a href="${esc(boton.url)}" style="display:inline-block;background:#0F5C4D;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">${esc(boton.texto)}</a></p>
  <p style="font-size:14px;color:#4A5B57">ConsultaFácil</p>
</div>`;

  return { asunto, texto, html };
}

function citaAgendada(cita) {
  return armar({
    asunto: `Cita agendada en ${cita.consultorio.nombre}`,
    titulo: 'Tu cita quedó agendada',
    parrafo: `Hola ${cita.paciente.nombre}, el consultorio la confirmará pronto y te avisaremos por este medio.`,
    cita,
    boton: { texto: 'Ver mis citas', url: `${frontend()}/mis-citas` },
  });
}

function citaConfirmada(cita) {
  return armar({
    asunto: `Cita confirmada: ${fechaLarga(cita.fecha)}`,
    titulo: 'Tu cita está confirmada',
    parrafo: `Hola ${cita.paciente.nombre}, ${cita.consultorio.nombre} confirmó tu cita.`,
    cita,
    boton: { texto: 'Ver mis citas', url: `${frontend()}/mis-citas` },
  });
}

function citaCancelada(cita) {
  return armar({
    asunto: 'Tu cita fue cancelada',
    titulo: 'Tu cita fue cancelada',
    parrafo: `Hola ${cita.paciente.nombre}, ${cita.consultorio.nombre} canceló tu cita. Puedes elegir otro horario cuando quieras.`,
    cita,
    boton: { texto: 'Elegir otro horario', url: `${frontend()}/consultorios/${cita.consultorio.id}` },
  });
}

function recordatorioCita(cita) {
  return armar({
    asunto: `Recordatorio de tu cita en ${cita.consultorio.nombre}`,
    titulo: 'Tu cita es pronto',
    parrafo: `Hola ${cita.paciente.nombre}, te recordamos tu cita. Si no puedes asistir, cancélala para liberar el horario.`,
    cita,
    boton: { texto: 'Ver mis citas', url: `${frontend()}/mis-citas` },
  });
}

module.exports = { citaAgendada, citaConfirmada, citaCancelada, recordatorioCita };
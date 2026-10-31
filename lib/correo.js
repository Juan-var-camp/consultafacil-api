const nodemailer = require('nodemailer');

const configurado = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

const transporte = configurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // 465 usa TLS directo; 587 negocia después
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// Único punto de salida de correos: cambiar de proveedor se hace solo aquí
async function enviarCorreo({ para, asunto, texto, html }) {
  if (!transporte) {
    console.log(`[correo sin configurar] Para: ${para} | Asunto: ${asunto}\n${texto}\n`);
    return;
  }
  await transporte.sendMail({
    from: process.env.CORREO_REMITENTE || process.env.SMTP_USER,
    to: para,
    subject: asunto,
    text: texto,
    html,
  });
}

// Se llama al arrancar el servidor para detectar credenciales malas de inmediato
async function verificarCorreo() {
  if (!transporte) {
    console.log('Correo: sin configurar, los mensajes se mostrarán en la terminal');
    return;
  }
  try {
    await transporte.verify();
    console.log('Correo: conexión SMTP lista');
  } catch (error) {
    console.error('Correo: no se pudo conectar al SMTP:', error.message);
  }
}

module.exports = { enviarCorreo, verificarCorreo };
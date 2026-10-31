require('dotenv').config();
const prisma = require('../lib/prisma');
const { enviarRecordatorios } = require('../jobs/recordatorios');

enviarRecordatorios()
  .then((cantidad) => console.log(`Citas revisadas: ${cantidad}`))
  .finally(() => prisma.$disconnect());
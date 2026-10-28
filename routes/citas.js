const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'];

// Datos que se incluyen de las relaciones (sin password del paciente)
const incluirRelaciones = {
  paciente: { select: { id: true, nombre: true, email: true, telefono: true } },
  consultorio: { select: { id: true, nombre: true, especialidad: true, direccion: true } },
};

// Devuelve true si ya hay una cita activa en ese consultorio y horario
async function hayConflicto(consultorioId, fecha, excluirId = null) {
  const existente = await prisma.cita.findFirst({
    where: {
      consultorioId,
      fecha,
      estado: { not: 'CANCELADA' },
      ...(excluirId && { id: { not: excluirId } }),
    },
  });
  return existente !== null;
}

// GET /api/citas -> listar (filtros opcionales: ?pacienteId=1&consultorioId=2&estado=PENDIENTE)
router.get('/', async (req, res) => {
  try {
    const { pacienteId, consultorioId, estado } = req.query;
    const where = {};

    if (pacienteId) where.pacienteId = Number(pacienteId);
    if (consultorioId) where.consultorioId = Number(consultorioId);
    if (estado) {
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      where.estado = estado;
    }

    const citas = await prisma.cita.findMany({
      where,
      include: incluirRelaciones,
      orderBy: { fecha: 'asc' },
    });
    res.json(citas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las citas' });
  }
});

// GET /api/citas/:id -> una sola
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const cita = await prisma.cita.findUnique({
      where: { id },
      include: incluirRelaciones,
    });
    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.json(cita);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la cita' });
  }
});

// POST /api/citas -> agendar
router.post('/', async (req, res) => {
  try {
    const { pacienteId, consultorioId, fecha, motivo } = req.body;

    if (!pacienteId || !consultorioId || !fecha) {
      return res.status(400).json({
        error: 'pacienteId, consultorioId y fecha son obligatorios',
      });
    }

    const fechaCita = new Date(fecha);
    if (Number.isNaN(fechaCita.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }
    if (fechaCita <= new Date()) {
      return res.status(400).json({ error: 'La fecha debe ser futura' });
    }

    const paciente = await prisma.usuario.findUnique({
      where: { id: Number(pacienteId) },
    });
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const consultorio = await prisma.consultorio.findUnique({
      where: { id: Number(consultorioId) },
    });
    if (!consultorio) {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }

    if (await hayConflicto(consultorio.id, fechaCita)) {
      return res.status(409).json({
        error: 'Ya existe una cita en ese consultorio a esa hora',
      });
    }

    // "estado" no se lee del body: siempre nace PENDIENTE (default del schema)
    const nueva = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        motivo,
        pacienteId: paciente.id,
        consultorioId: consultorio.id,
      },
      include: incluirRelaciones,
    });
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

// PUT /api/citas/:id -> actualizar fecha, motivo o estado
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const cita = await prisma.cita.findUnique({ where: { id } });
    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const { fecha, motivo, estado } = req.body;
    const data = {};

    if (motivo !== undefined) data.motivo = motivo;

    if (estado !== undefined) {
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({
          error: `Estado inválido. Valores permitidos: ${ESTADOS.join(', ')}`,
        });
      }
      data.estado = estado;
    }

    if (fecha !== undefined) {
      const fechaCita = new Date(fecha);
      if (Number.isNaN(fechaCita.getTime())) {
        return res.status(400).json({ error: 'Fecha inválida' });
      }
      if (fechaCita <= new Date()) {
        return res.status(400).json({ error: 'La fecha debe ser futura' });
      }
      if (await hayConflicto(cita.consultorioId, fechaCita, id)) {
        return res.status(409).json({
          error: 'Ya existe una cita en ese consultorio a esa hora',
        });
      }
      data.fecha = fechaCita;
    }

    // pacienteId y consultorioId no se cambian: si se equivocó, se cancela y se agenda otra
    const actualizada = await prisma.cita.update({
      where: { id },
      data,
      include: incluirRelaciones,
    });
    res.json(actualizada);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

// PATCH /api/citas/:id/cancelar -> atajo para cancelar
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const cita = await prisma.cita.findUnique({ where: { id } });
    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    if (cita.estado === 'CANCELADA' || cita.estado === 'COMPLETADA') {
      return res.status(409).json({
        error: `No se puede cancelar una cita ${cita.estado.toLowerCase()}`,
      });
    }

    const cancelada = await prisma.cita.update({
      where: { id },
      data: { estado: 'CANCELADA' },
      include: incluirRelaciones,
    });
    res.json(cancelada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
});

// DELETE /api/citas/:id -> eliminar
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await prisma.cita.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la cita' });
  }
});

module.exports = router;
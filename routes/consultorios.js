const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, soloRol } = require('../middleware/auth');
const {
  fechaValida,
  diaSemanaDe,
  generarHorarios,
  horariosPorDefecto,
  validarConfiguracion,
} = require('../lib/horarios');
const router = express.Router();

// GET /api/consultorios -> listar todos
router.get('/', async (req, res) => {
  try {
    const consultorios = await prisma.consultorio.findMany({
      orderBy: { creadoEn: 'desc' },
    });
    res.json(consultorios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los consultorios' });
  }
});

router.get('/:id/disponibilidad', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { fecha } = req.query;

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (!fecha || !fechaValida(fecha)) {
      return res.status(400).json({ error: 'fecha debe tener el formato AAAA-MM-DD' });
    }

    const consultorio = await prisma.consultorio.findUnique({
      where: { id },
      select: {
        duracionCita: true,
        horarios: { where: { diaSemana: diaSemanaDe(fecha) } },
      },
    });
    if (!consultorio) {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }

    const horarios = generarHorarios(fecha, consultorio.horarios, consultorio.duracionCita);

    // Un día sin franjas no tiene bloques, y no hace falta consultar citas
    const ocupadas = horarios.length
      ? await prisma.cita.findMany({
          where: {
            consultorioId: id,
            estado: { not: 'CANCELADA' },
            fecha: { in: horarios },
          },
          select: { fecha: true },
        })
      : [];
    const ocupadasMs = new Set(ocupadas.map((c) => c.fecha.getTime()));
    const ahora = Date.now();

    res.json({
      fecha,
      duracionMin: consultorio.duracionCita,
      horarios: horarios.map((h) => ({
        inicio: h.toISOString(),
        libre: h.getTime() > ahora && !ocupadasMs.has(h.getTime()),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la disponibilidad' });
  }
});

router.get('/:id/horarios', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const consultorio = await prisma.consultorio.findUnique({
      where: { id },
      select: {
        duracionCita: true,
        horarios: {
          orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
          select: { diaSemana: true, horaInicio: true, horaFin: true },
        },
      },
    });
    if (!consultorio) {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }

    res.json({ duracionCita: consultorio.duracionCita, franjas: consultorio.horarios });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los horarios' });
  }
});

// PUT /api/consultorios/:id/horarios -> reemplaza toda la configuración
router.put('/:id/horarios', autenticar, soloRol('ADMIN', 'MEDICO'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Un médico solo puede cambiar el horario de SU consultorio
    if (req.usuario.rol === 'MEDICO' && req.usuario.consultorioId !== id) {
      return res.status(403).json({ error: 'Solo puedes editar el horario de tu consultorio' });
    }

    const { duracionCita, franjas } = req.body;
    const problema = validarConfiguracion(duracionCita, franjas);
    if (problema) {
      return res.status(400).json({ error: problema });
    }

    // Todo o nada: si algo falla, el horario anterior queda intacto
    await prisma.$transaction([
      prisma.consultorio.update({ where: { id }, data: { duracionCita } }),
      prisma.horario.deleteMany({ where: { consultorioId: id } }),
      prisma.horario.createMany({
        data: franjas.map((f) => ({
          diaSemana: f.diaSemana,
          horaInicio: f.horaInicio,
          horaFin: f.horaFin,
          consultorioId: id,
        })),
      }),
    ]);

    res.json({ duracionCita, franjas });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al guardar los horarios' });
  }
});

// GET /api/consultorios/:id -> uno solo
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const consultorio = await prisma.consultorio.findUnique({ where: { id } });
    if (!consultorio) {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }
    res.json(consultorio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el consultorio' });
  }
});

// POST /api/consultorios -> crear
router.post('/', autenticar, soloRol('ADMIN'), async (req, res) => {
  try {
    const { nombre, especialidad, direccion, telefono, email, descripcion } = req.body;

    if (!nombre || !especialidad || !direccion || !telefono) {
      return res.status(400).json({
        error: 'nombre, especialidad, direccion y telefono son obligatorios',
      });
    }

    const nuevo = await prisma.consultorio.create({
      data: {
        nombre, especialidad, direccion, telefono, email, descripcion,
        horarios: { create: horariosPorDefecto() },
      },
    });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el consultorio' });
  }
});

// PUT /api/consultorios/:id -> actualizar
router.put('/:id', autenticar, soloRol('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { nombre, especialidad, direccion, telefono, email, descripcion } = req.body;

    const actualizado = await prisma.consultorio.update({
      where: { id },
      data: { nombre, especialidad, direccion, telefono, email, descripcion },
    });
    res.json(actualizado);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el consultorio' });
  }
});

// DELETE /api/consultorios/:id -> eliminar
router.delete('/:id', autenticar, soloRol('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await prisma.consultorio.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Consultorio no encontrado' });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        error: 'No se puede eliminar: tiene médicos o citas asociadas',
      });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el consultorio' });
  }
});

module.exports = router;
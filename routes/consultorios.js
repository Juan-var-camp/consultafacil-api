const express = require('express');
const prisma = require('../lib/prisma');

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
router.post('/', async (req, res) => {
  try {
    const { nombre, especialidad, direccion, telefono, email, descripcion } = req.body;

    if (!nombre || !especialidad || !direccion || !telefono) {
      return res.status(400).json({
        error: 'nombre, especialidad, direccion y telefono son obligatorios',
      });
    }

    const nuevo = await prisma.consultorio.create({
      data: { nombre, especialidad, direccion, telefono, email, descripcion },
    });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el consultorio' });
  }
});

// PUT /api/consultorios/:id -> actualizar
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
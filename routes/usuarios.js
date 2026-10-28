const express = require('express');
const bcrypt = require('bcrypt'); // si instalaste bcryptjs: require('bcryptjs')
const prisma = require('../lib/prisma');
const { autenticar, soloRol } = require('../middleware/auth');

const router = express.Router();

// Campos que SÍ se devuelven. El password nunca sale de la API.
const usuarioSeguro = {
  id: true,
  nombre: true,
  email: true,
  telefono: true,
  rol: true,
  creadoEn: true,
  consultorioId: true,
};

// GET /api/usuarios -> listar todos
router.get('/', autenticar, soloRol('ADMIN'), async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: usuarioSeguro,
      orderBy: { creadoEn: 'desc' },
    });
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

// GET /api/usuarios/:id -> uno solo
router.get('/:id', autenticar, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: usuarioSeguro,
    });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
});

// POST /api/usuarios -> registro
router.post('/', autenticar, soloRol('ADMIN'), async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'nombre, email y password son obligatorios',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // OJO: no se lee "rol" del body. Siempre nace como PACIENTE (default del schema).
    const nuevo = await prisma.usuario.create({
      data: {
        nombre,
        email: email.toLowerCase().trim(),
        password: passwordHash,
        telefono,
      },
      select: usuarioSeguro,
    });
    res.status(201).json(nuevo);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

// PUT /api/usuarios/:id -> actualizar
router.put('/:id', autenticar, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { nombre, email, password, telefono } = req.body;
    const data = { nombre, telefono };

    if (email) {
      data.email = email.toLowerCase().trim();
    }
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 8 caracteres',
        });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    // "rol" y "consultorioId" no se pueden cambiar aquí; eso será del admin.
    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: usuarioSeguro,
    });
    res.json(actualizado);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

// DELETE /api/usuarios/:id -> eliminar
router.delete('/:id', autenticar, soloRol('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await prisma.usuario.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        error: 'No se puede eliminar: el usuario tiene citas asociadas',
      });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});

module.exports = router;
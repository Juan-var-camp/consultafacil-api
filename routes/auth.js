const express = require('express');
const bcrypt = require('bcrypt'); // o 'bcryptjs' si usaste ese
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

const usuarioSeguro = {
  id: true,
  nombre: true,
  email: true,
  telefono: true,
  rol: true,
  creadoEn: true,
  consultorioId: true,
};

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, consultorioId: usuario.consultorioId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/registro -> crea un PACIENTE y devuelve token
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // El rol NO viene del body: todo el que se registra aquí es PACIENTE
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email: email.toLowerCase().trim(),
        password: passwordHash,
        telefono,
      },
      select: usuarioSeguro,
    });

    res.status(201).json({ token: firmarToken(usuario), usuario });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Mismo mensaje si el email no existe o la clave es incorrecta,
    // para no revelar qué emails están registrados
    const passwordValido = usuario && (await bcrypt.compare(password, usuario.password));
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { password: _omitido, ...usuarioPublico } = usuario;
    res.json({ token: firmarToken(usuario), usuario: usuarioPublico });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/auth/me -> quién soy según el token (útil para el frontend)
router.get('/me', autenticar, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
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

module.exports = router;
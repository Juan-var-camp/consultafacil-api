require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const consultoriosRouter = require('./routes/consultorios');
const usuariosRouter = require('./routes/usuarios');
const citasRouter = require('./routes/citas');

const app = express();

// 1. Middlewares generales (siempre primero)
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// 2. Rutas
app.use('/api/auth', authRouter);
app.use('/api/consultorios', consultoriosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/citas', citasRouter);

app.get('/', (req, res) => {
  res.send('API de ConsultaFácil funcionando');
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
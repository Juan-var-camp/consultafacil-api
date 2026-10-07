const express = require('express')
const app = express()
const consultoriosRouter = require('./routes/consultorios')
const usuariosRouter = require('./routes/usuarios')
const citasRouter = require('./routes/citas')

app.use('/api/consultorios', consultoriosRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/citas', citasRouter)

app.get('/', (req, res) => {
  res.send('API de ConsultaFácil funcionando')
})

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000')
})

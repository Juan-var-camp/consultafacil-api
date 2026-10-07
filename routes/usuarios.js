const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ mensaje: 'Lista de usuarios' })
})

router.get('/:id', (req, res) => {
  res.json({ mensaje: 'usuario por id' })
})

router.post('/', (req, res) => {
  res.json({ mensaje: 'Se creo un nuevo usuario' })
})

router.put('/:id', (req, res) => {
  res.json({ mensaje: 'Se actualizo el usuario' })
})

router.delete('/:id', (req, res) => {
  res.json({ mensaje: 'Se borro el usuario' })
})

module.exports = router
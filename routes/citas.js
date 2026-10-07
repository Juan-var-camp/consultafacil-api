const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ mensaje: 'Lista de citas' })
})

router.get('/:id', (req, res) => {
  res.json({ mensaje: 'cita por id' })
})

router.post('/', (req, res) => {
  res.json({ mensaje: 'Se creo una nueva cita' })
})

router.put('/:id', (req, res) => {
  res.json({ mensaje: 'Se actualizo la cita' })
})

router.delete('/:id', (req, res) => {
  res.json({ mensaje: 'Se borro la cita' })
})

module.exports = router
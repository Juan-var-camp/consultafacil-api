const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ mensaje: 'Lista de consultorios' })
})

router.get('/:id', (req, res) => {
  res.json({ mensaje: 'consultorio por id' })
})

router.post('/', (req, res) => {
  res.json({ mensaje: 'Se creo un nuevo consultorio' })
})

router.put('/:id', (req, res) => {
  res.json({ mensaje: 'Se actualizo el consultorio' })
})

router.delete('/:id', (req, res) => {
  res.json({ mensaje: 'Se borro el consultorio' })
})

module.exports = router
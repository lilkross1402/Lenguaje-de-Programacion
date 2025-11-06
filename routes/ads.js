// routes/ads.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // conexión SQLite o JSON

// Mostrar anuncios al usuario autenticado
router.get('/', async (req, res) => {
  const ads = await db.getAllAds();
  res.render('anuncio', { ads });
});

// Registrar clic en un anuncio
router.get('/click/:id', async (req, res) => {
  const id = req.params.id;
  await db.incrementClicks(id);
  res.redirect('/conectado'); // o cualquier pantalla posterior
});

module.exports = router;

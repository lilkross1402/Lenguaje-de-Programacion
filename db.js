// db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// === CREACIÓN DE TABLAS PRINCIPALES ===
db.serialize(() => {
  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de anuncios (para modelo CPC)
  db.run(`
    CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      target_url TEXT,
      cpc REAL DEFAULT 0,               -- costo por clic
      impressions INTEGER DEFAULT 0,    -- vistas
      clicks INTEGER DEFAULT 0          -- clics
    )
  `);
});


// === FUNCIONES DE USUARIOS ===

// Crear nuevo usuario
db.createUser = (name, email, callback) => {
  const stmt = db.prepare(`INSERT INTO users (name, email) VALUES (?, ?)`);
  stmt.run([name, email], function (err) {
    if (err) return callback(err);
    callback(null, this.lastID);
  });
  stmt.finalize();
};

// Buscar usuario por email
db.getUserByEmail = (email, callback) => {
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    callback(err, row);
  });
};

// Sumar ganancias al usuario (por clic en anuncio)
db.addEarnings = (userId, amount, callback) => {
  db.run(
    `UPDATE users SET balance = balance + ? WHERE id = ?`,
    [amount, userId],
    function (err) {
      callback(err);
    }
  );
};

// Obtener todos los usuarios (para admin)
db.getAllUsers = (callback) => {
  db.all(`SELECT * FROM users ORDER BY created_at DESC`, (err, rows) => {
    callback(err, rows);
  });
};


// === FUNCIONES DE ANUNCIOS ===

// Crear nuevo anuncio
db.createAd = (title, description, image_url, target_url, cpc, callback) => {
  const stmt = db.prepare(`
    INSERT INTO ads (title, description, image_url, target_url, cpc)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run([title, description, image_url, target_url, cpc], function (err) {
    if (err) return callback(err);
    callback(null, this.lastID);
  });
  stmt.finalize();
};

// Obtener todos los anuncios
db.getAllAds = (callback) => {
  db.all(`SELECT * FROM ads ORDER BY id DESC`, (err, rows) => {
    callback(err, rows);
  });
};

// Incrementar contador de vistas (impresiones)
db.incrementImpressions = (adId, callback) => {
  db.run(
    `UPDATE ads SET impressions = impressions + 1 WHERE id = ?`,
    [adId],
    function (err) {
      callback(err);
    }
  );
};

// Incrementar clics y retornar CPC (para registrar ganancia)
db.incrementClicks = (adId, callback) => {
  db.get(`SELECT cpc FROM ads WHERE id = ?`, [adId], (err, ad) => {
    if (err || !ad) return callback(err || new Error('Anuncio no encontrado'));

    db.run(`UPDATE ads SET clicks = clicks + 1 WHERE id = ?`, [adId], (updateErr) => {
      if (updateErr) return callback(updateErr);
      callback(null, ad.cpc);
    });
  });
};

// Obtener anuncio por ID
db.getAdById = (adId, callback) => {
  db.get(`SELECT * FROM ads WHERE id = ?`, [adId], (err, row) => {
    callback(err, row);
  });
};

// Eliminar anuncio
db.deleteAd = (id, callback) => {
  db.run(`DELETE FROM ads WHERE id = ?`, [id], function (err) {
    callback(err);
  });
};


// === FUNCIONES ADICIONALES ===

// Obtener estadísticas del sistema (total clics, usuarios, balance)
db.getStats = (callback) => {
  const stats = {};

  db.get(`SELECT COUNT(*) as total_users FROM users`, (err, row) => {
    if (err) return callback(err);
    stats.users = row.total_users;

    db.get(`SELECT SUM(clicks) as total_clicks FROM ads`, (err2, row2) => {
      if (err2) return callback(err2);
      stats.clicks = row2.total_clicks || 0;

      db.get(`SELECT SUM(balance) as total_balance FROM users`, (err3, row3) => {
        if (err3) return callback(err3);
        stats.balance = row3.total_balance || 0;
        callback(null, stats);
      });
    });
  });
};


// === EXPORTACIÓN DEL MÓDULO ===
module.exports = db;

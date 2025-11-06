const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();

// ==============================
// 🔧 CONFIGURACIÓN BÁSICA
// ==============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==============================
// 🔐 CONFIGURACIÓN DE SESIÓN
// ==============================
app.use(session({
  secret: 'clave-secreta',
  resave: false,
  saveUninitialized: true
}));

// ==============================
// 🌍 VARIABLES GLOBALES
// ==============================
app.use((req, res, next) => {
  res.locals.userName = req.session.userName || null;
  res.locals.userId = req.session.userId || null;
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

// ==============================
// 🧩 CARGAR ANUNCIOS DE EJEMPLO
// ==============================
db.all('SELECT COUNT(*) AS total FROM ads', (err, rows) => {
  if (!err && rows[0].total === 0) {
    db.run(
      `INSERT INTO ads (title, description, image_url, target_url, cpc)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Plan Fibra 100Mb',
        'Conéctate con la mejor velocidad del país. Oferta exclusiva por tiempo limitado.',
        'https://images.pexels.com/photos/2881232/pexels-photo-2881232.jpeg?auto=compress&cs=tinysrgb&w=600',
        'https://www.google.com/',
        0.15
      ]
    );

    db.run(
      `INSERT INTO ads (title, description, image_url, target_url, cpc)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Laptop Gamer Nitro 5',
        'Máximo rendimiento y gráficos potentes. Descubre nuestras ofertas de fin de año.',
        'https://images.pexels.com/photos/845451/pexels-photo-845451.jpeg?auto=compress&cs=tinysrgb&w=600',
        'https://www.amazon.com/',
        0.25
      ]
    );

    console.log('✅ Anuncios de ejemplo cargados en la base de datos.');
  }
});

// ==============================
// 👥 LOGIN USUARIO
// ==============================
app.get('/', (req, res) => {
  res.render('login', { title: 'Inicio de sesión', error: null });
});

app.post('/login', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.render('login', { title: 'Inicio de sesión', error: 'Debe ingresar todos los campos.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) {
      db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], function (err) {
        req.session.userId = this.lastID;
        req.session.userName = name;
        return res.redirect('/portal');
      });
    } else {
      req.session.userId = user.id;
      req.session.userName = user.name;
      return res.redirect('/portal');
    }
  });
});

// ==============================
// 📰 PORTAL DE ANUNCIOS
// ==============================
app.get('/portal', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  db.all('SELECT * FROM ads', (err, ads) => {
    res.render('portal', { title: 'Portal de anuncios', ads });
  });
});

// ==============================
// 🎬 VISUALIZACIÓN DE ANUNCIO
// ==============================
app.get('/anuncio/:id', (req, res) => {
  const adId = req.params.id;
  db.get('SELECT * FROM ads WHERE id = ?', [adId], (err, ad) => {
    if (!ad) return res.send('Anuncio no encontrado');
    res.render('anuncio', { title: 'Viendo anuncio', ad });
  });
});

// ==============================
// ✅ PANTALLA DE CONEXIÓN EXITOSA
// ==============================
app.get('/conectado', (req, res) => {
  res.render('conectado', { title: 'Conexión exitosa' });
});

// ==============================
// 🚪 LOGOUT USUARIO
// ==============================
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ==============================
// 👨‍💼 LOGIN ADMINISTRADOR
// ==============================
app.get('/admin/login', (req, res) => {
  res.render('admin_login', { title: 'Acceso Administrador', error: null });
});

app.post('/admin/login', (req, res) => {
  const { user, password } = req.body;
  if (user === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin_login', { title: 'Acceso Administrador', error: 'Credenciales incorrectas' });
  }
});

// ==============================
// 🧮 PANEL ADMINISTRADOR
// ==============================
app.get('/admin', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');
  db.all('SELECT * FROM ads', (err, ads) => {
    res.render('admin', { title: 'Panel administrador', ads });
  });
});

// ==============================
// ➕ CREAR NUEVO ANUNCIO
// ==============================
app.get('/admin/ads/new', (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');
  res.render('admin_new_ad', { title: 'Nuevo anuncio', error: null });
});

app.post('/admin/ads/new', (req, res) => {
  const { title, description, image_url, target_url, cpc } = req.body;
  if (!title || !target_url || !cpc) {
    return res.render('admin_new_ad', { title: 'Nuevo anuncio', error: 'Campos obligatorios faltantes.' });
  }

  db.run(
    'INSERT INTO ads (title, description, image_url, target_url, cpc) VALUES (?, ?, ?, ?, ?)',
    [title, description, image_url, target_url, cpc],
    (err) => {
      if (err) console.error(err);
      res.redirect('/admin');
    }
  );
});

// ==============================
// 🚪 LOGOUT ADMINISTRADOR
// ==============================
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ==============================
// 🚀 INICIAR SERVIDOR
// ==============================
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor escuchando correctamente en el puerto ${PORT}`);
});

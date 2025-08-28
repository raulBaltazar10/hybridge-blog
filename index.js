// Configura variables de entorno
require('dotenv').config({ silent: true });

const express = require('express');
const { Post, Author, User } = require('./models');


// Importar dependencias de autenticación
const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcryptjs');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;


/* ───── 2. Estrategia Local (login) ───── */
passport.use('local',
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password', session: false },
      async (email, password, done) => {
        try {
          const user = await User.findOne({ where: { email } });
          if (!user) {
            return done(null, false, { message: 'Usuario no existe' });
          }
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) {
            return done(null, false, { message: 'Contraseña incorrecta' });
          }
          return done(null, user); // autenticado
        } catch (err) { return done(err); }
      }
    )
);

//Estrategia JWT
passport.use('jwt',
    new JwtStrategy(
        {
            secretOrKey: process.env.JWT_SECRET,
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        },
        async (token, done) => {
            try {
                return done(null, token.user);
            } catch (err) {
                return done(err);
            }
        }
    )
)

//Ruta registro
app.post('/api/signup', async(req, res) => {
    try {
        const { name,  email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hash });
        res.status(201).json({ id: user.id, email: user.email });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
})

//Ruta login
app. post('/api/login', passport.authenticate('local', { session: false }), (req, res) => {
    const { id, email } = req.body;
    const token = jwt.sign(
        { user: { id, email }},
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    res.json({ token });
})

const authMiddleware = passport.authenticate('jwt', { session: false });


//Ruta protegida para que solo el usuario autenticado pueda crear un post
app.post('/posts', authMiddleware, async (req, res) => {
    const { title, content, authorId } = req.body;
    if (!title || !content || !authorId) {
      return res.status(400).json({ error: 'Título, contenido y authorId son requeridos' });
    }
    try {
      // req.user.id es el ID del usuario autenticado
      const post = await Post.create({ title, content, authorId: req.user.id });  // Asigna al usuario logueado
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ error: 'No se pudo crear la publicación' });
    }
});



app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


//Ruta home
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de Blog Posts' })
})

//Ruta para obtener los posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.findAll();
        res.json(posts);
    } catch (error) {
        console.error('Error al obtener posts:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

//Crear un post
app.post('/post', async (req, res)=> {
    const { title, content, authorId } = req.body;
    try {
        const author = await Author.findByPk(authorId);
        if (!author) {
            return res.status(400).json({ error: 'Este autor no existe' })
        }
        const post = await Post.create({ title, content, authorId });
        res.status(201).json(post);
    } catch (error) {
        res.status(400).json({ error: 'No se pudo crear la publicación' })
    }
})

//Crear un autor
app.post('/authors', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' })
    }
    try {
        const author = await Author.create({ name });
        res.status(201).json(author)
    } catch (error) {
        res.status(400).json({ error: 'No se pudo crear al autor' });
    }
})

//Obtener todos los autores
app.get('/authors', async (req, res) => {
    try {
        const authors = await Author.findAll();
        res.json(authors)
    } catch (error) {
        res.status(400).json({ error: 'No se pudieron obtener los autores' })
    }
})


//Obtener una Publicación en Específico 
app.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        res.json(post)
    } catch (error) {
        res.status(400).json({ error: 'No se pudo obtener la Publicación' })
    }
})






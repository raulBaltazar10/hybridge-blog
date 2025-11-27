// Configura variables de entorno
require('dotenv').config({ silent: true });

const express = require('express');
const { Post, Author, User } = require('./models');

// Importar dependencias de autenticación
const passport      = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcryptjs');


const app = express();

app.use(express.json());

// Inicializar Passport
app.use(passport.initialize());

const PORT = process.env.PORT || 3009;





app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


/* ───── 2. Estrategia Local (login) ───── */
// passport.use('local',
//     new LocalStrategy(
//       { usernameField: 'email', passwordField: 'password', session: false },
//       async (email, password, done) => {
//         try {
//           const user = await db.User.findOne({ where: { email } });
//           if (!user) {
//             return done(null, false, { message: 'Usuario no existe' });
//           }
//           const ok = await bcrypt.compare(password, user.password);
//           if (!ok) {
//             return done(null, false, { message: 'Contraseña incorrecta' });
//           }
//           return done(null, user); // autenticado
//         } catch (err) { return done(err); }
//       }
//     )
// );


/* ───── 3. Estrategia JWT (protección) ───── */
passport.use('jwt',
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
        session: false
      },
      async (payload, done) => {
        try {
          const user = await User.findByPk(payload.id);
          if (!user)   return done(null, false);
          return done(null, user);
        } catch (err) { return done(err, false); }
      }
    )
);


/** Registro */
app.post('/api/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hash });
      res.status(201).json({ id: user.id, email: user.email });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
});




/** Login → genera token */
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validar que se envíen email y password
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario por email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Usuario no existe' });
        }

        // Verificar contraseña
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


const authMiddleware = passport.authenticate('jwt', { session: false });

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

//Ruta para crear un post
app.post('/posts', passport.authenticate('jwt', { session: false}), async (req, res) => {
    try {
        const { title, content, authorId} = req.body;
        if (!title || !content || !authorId) {
            return res.status(400).json({ error: 'Título, contenido y authorId son requeridos' });
        }

        const post = await Post.create({ title, content, authorId});
        res.status(201).json(post);
    } catch (error) {
        console.log("Error al crear el post:", error)
        res.status(500).json({ error: 'Error interno del servidor' });
    }
})

//Ruta para crear un autor protegida por JWT
app.post('/authors', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof(name) !== 'string' || name.length < 3) {
            return res.status(400).json({ error: 'El nombre es requerido'})
        }

        const author = await Author.create({ name });
        res.status(201).json(author);
    } catch (error) {
        console.log("Error al crear el autor:", error)
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});




//read: obtener todos los autores
app.get('/get-authors', async (req, res) => {
    try {
        const authors = await Author.findAll();
        res.json(authors);
    } catch (error) {
        console.log("Error al obtener los autores:", error)
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


//delete: eliminar un post
app.delete('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post no encontrado' });
        } 

        await post.destroy();
        res.status(204).send();
    } catch (error) {
        console.log("Error al eliminar el post:", error)
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


/** Ruta protegida */
app.get('/api/profile',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
      // `req.user` viene de la estrategia JWT
      res.json({ id: req.user.id, email: req.user.email, msg: 'Acceso concedido 👋' });
    }
);





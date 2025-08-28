# Mi API

Una API REST simple construida con Express.js y Sequelize para gestionar posts y autores.

## Instalación

1. Clona el repositorio
2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/mi_api_db
PORT=3000
NODE_ENV=development
```

4. Configura tu base de datos PostgreSQL y actualiza la URL en el archivo `.env`

## Uso

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm start
```

### Migraciones

```bash
npm run migrate
```

### Seeders

```bash
npm run seed
```

## Endpoints

- `GET /api/posts` - Obtener todos los posts

## Modelos

### Post

- `title` (STRING) - Título del post
- `content` (TEXT) - Contenido del post
- `authorId` (INTEGER) - ID del autor
- `deletedAt` (DATE) - Para soft deletes

### Author

- `name` (STRING) - Nombre del autor
- `deletedAt` (DATE) - Para soft deletes

## Relaciones

- Un Author puede tener muchos Posts
- Un Post pertenece a un Author

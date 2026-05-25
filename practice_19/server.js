const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret';
const SALT_ROUNDS = 10;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'phonestore',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Refresh tokens in memory (как в оригинале)
const refreshTokens = new Set();

// ─── Swagger ──────────────────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'PhoneStore API (PostgreSQL)', version: '1.0.0', description: 'RBAC: роли user / seller / admin. Хранение в PostgreSQL.' },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'seller', 'admin'] },
            created_at: { type: 'integer' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            image: { type: 'string' },
          },
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  },
  apis: ['./server.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({ message: 'PhoneStore API (PostgreSQL)', port: PORT, docs: '/api/docs' });
});

// ─── Token helpers ────────────────────────────────────────────────────────────
const generateAccessToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, REFRESH_SECRET, { expiresIn: '7d' });

// ─── Middleware ───────────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Токен не предоставлен' });
  try {
    req.user = jwt.verify(header.slice(7), ACCESS_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

const roleMiddleware = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  next();
};

// ─── DB init + seed ───────────────────────────────────────────────────────────
const I = {
  ip16pro:  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/IPhone_16_Pro_series.jpg/960px-IPhone_16_Pro_series.jpg',
  ip16:     'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/IPhone_16_Vector.svg/500px-IPhone_16_Vector.svg.png',
  ip15pro:  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/IPhone_15_Pro.jpeg/960px-IPhone_15_Pro.jpeg',
  ip15:     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/IPhone_15_Vector.svg/500px-IPhone_15_Vector.svg.png',
  ipse:     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/IPhone_SE_%282nd_generation%29_white_vector.svg/500px-IPhone_SE_%282nd_generation%29_white_vector.svg.png',
  s25ultra: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Samsung_Galaxy_S25_Ultra_Titanium_Silverblue.jpg/960px-Samsung_Galaxy_S25_Ultra_Titanium_Silverblue.jpg',
  s24:      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Samsung_Galaxy_S24%2C_Sperrbildschirm.JPG/960px-Samsung_Galaxy_S24%2C_Sperrbildschirm.JPG',
  zfold6:   'https://upload.wikimedia.org/wikipedia/commons/0/0c/Samsung_Galaxy_Z_Fold6.png',
  zflip6:   'https://upload.wikimedia.org/wikipedia/commons/e/e3/%E4%B8%89%E6%98%9FGalaxy_Z_Flip6.png',
  a55:      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Samsung_Galaxy_A55_5G_2024.jpg/960px-Samsung_Galaxy_A55_5G_2024.jpg',
  xi14u:    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/23116PN5BC.jpg/960px-23116PN5BC.jpg',
  xi14t:    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Xiaomi_14T_Pro_front.jpg/960px-Xiaomi_14T_Pro_front.jpg',
  xi13:     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Xiaomi_13_front.jpg/960px-Xiaomi_13_front.jpg',
  redmi:    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Redmi_Note_14_Pro_%282%29.jpg/960px-Redmi_Note_14_Pro_%282%29.jpg',
  px9pro:   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Google_Pixel_9_Pro_XL_%28front%29.jpg/960px-Google_Pixel_9_Pro_XL_%28front%29.jpg',
  px8a:     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Pixel_8a.jpg/960px-Pixel_8a.jpg',
  nothing2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Nothing_phone_%282%29_%28Booredatwork.com%29_001.png/960px-Nothing_phone_%282%29_%28Booredatwork.com%29_001.png',
};

const SEED_PRODUCTS = [
  { title: 'iPhone 16 Pro Max',           category: 'Apple',    description: 'Титановый корпус, чип A18 Pro, дисплей 6.9" Super Retina XDR ProMotion, камера 48 Мп 5× зум, Action Button', price: 119999, image: I.ip16pro  },
  { title: 'iPhone 16 Pro',               category: 'Apple',    description: 'Титановый корпус, чип A18 Pro, дисплей 6.3" ProMotion 120 Гц, камера 48 Мп, Action Button',                   price: 109999, image: I.ip16pro  },
  { title: 'iPhone 16',                   category: 'Apple',    description: 'Чип A18, дисплей 6.1" Super Retina XDR, камера 48 Мп, поддержка Apple Intelligence',                           price: 79999,  image: I.ip16     },
  { title: 'iPhone 15 Pro',               category: 'Apple',    description: 'Титановый корпус, чип A17 Pro, USB-C 3 (40 Гбит/с), камера 48 Мп с 3× зумом',                                 price: 89999,  image: I.ip15pro  },
  { title: 'iPhone 15',                   category: 'Apple',    description: 'Чип A16 Bionic, USB-C, Dynamic Island, дисплей 6.1" Super Retina XDR, камера 48 Мп',                           price: 64999,  image: I.ip15     },
  { title: 'iPhone SE (3-е поколение)',    category: 'Apple',    description: 'Чип A15 Bionic, дисплей 4.7" Retina HD, Touch ID, поддержка 5G, самый доступный iPhone',                       price: 44999,  image: I.ipse     },
  { title: 'Samsung Galaxy S25 Ultra',    category: 'Samsung',  description: 'Snapdragon 8 Elite, встроенный S Pen, камера 200 Мп с 10× зумом, дисплей 6.9" QHD+ 120 Гц',                   price: 119990, image: I.s25ultra },
  { title: 'Samsung Galaxy S25+',         category: 'Samsung',  description: 'Snapdragon 8 Elite, дисплей 6.7" Dynamic AMOLED 2X 120 Гц, тройная камера 50 + 12 + 10 Мп',                   price: 89990,  image: I.s25ultra },
  { title: 'Samsung Galaxy S24',          category: 'Samsung',  description: 'Exynos 2400, дисплей 6.2" Dynamic AMOLED 2X 120 Гц, камера 50 Мп, 7 лет обновлений Android',                  price: 64990,  image: I.s24      },
  { title: 'Samsung Galaxy Z Fold 6',     category: 'Samsung',  description: 'Складной смартфон, Snapdragon 8 Gen 3, внешний дисплей 6.3", внутренний 7.6" AMOLED, S Pen',                   price: 149990, image: I.zfold6   },
  { title: 'Samsung Galaxy Z Flip 6',     category: 'Samsung',  description: 'Раскладной смартфон, Snapdragon 8 Gen 3, внешний дисплей 3.4" AMOLED, двойная камера 50 Мп',                   price: 79990,  image: I.zflip6   },
  { title: 'Samsung Galaxy A55 5G',       category: 'Samsung',  description: 'Exynos 1480, дисплей 6.6" Super AMOLED 120 Гц, тройная камера 50 Мп + OIS, IP67',                             price: 34990,  image: I.a55      },
  { title: 'Xiaomi 14 Ultra',             category: 'Xiaomi',   description: 'Leica Vario-Summilux оптика, Snapdragon 8 Gen 3, 5000 мАч, 90 Вт HyperCharge, IP68',                           price: 89990,  image: I.xi14u    },
  { title: 'Xiaomi 14T Pro',              category: 'Xiaomi',   description: 'Leica камера 50 Мп, Dimensity 9300+, дисплей 6.67" AMOLED 144 Гц, 100 Вт HyperCharge',                        price: 59990,  image: I.xi14t    },
  { title: 'Xiaomi 13',                   category: 'Xiaomi',   description: 'Leica камера 54.3 Мп, Snapdragon 8 Gen 2, компактный 6.36" AMOLED, 67 Вт зарядка',                             price: 44990,  image: I.xi13     },
  { title: 'Redmi Note 13 Pro+',          category: 'Xiaomi',   description: 'Dimensity 7200 Ultra, камера 200 Мп IMX890, 120 Вт HyperCharge, IP68, 6.67" AMOLED 120 Гц',                   price: 29990,  image: I.redmi    },
  { title: 'POCO F6 Pro',                 category: 'Xiaomi',   description: 'Snapdragon 8 Gen 2, дисплей 6.67" WQHD+ AMOLED 144 Гц, 67 Вт зарядка, игровой флагман',                      price: 39990,  image: I.xi14t    },
  { title: 'Google Pixel 9 Pro XL',       category: 'Google',   description: 'Tensor G4, камера 50 Мп с 5× зумом Telephoto, дисплей 6.8" LTPO OLED 120 Гц, 7 лет обновлений',              price: 89990,  image: I.px9pro   },
  { title: 'Google Pixel 9',              category: 'Google',   description: 'Tensor G4, Magic Eraser, дисплей 6.3" Actua OLED 120 Гц, камера 50 Мп, IP68',                                 price: 64990,  image: I.px9pro   },
  { title: 'Google Pixel 8a',             category: 'Google',   description: 'Tensor G3, дисплей 6.1" OLED 120 Гц, камера 64 Мп, IP67, самый доступный Pixel',                              price: 49990,  image: I.px8a     },
  { title: 'OnePlus 12',                  category: 'OnePlus',  description: 'Hasselblad камера 50 Мп, Snapdragon 8 Gen 3, 100 Вт SUPERVOOC, дисплей 6.82" LTPO AMOLED 120 Гц',             price: 59990,  image: I.xi14u    },
  { title: 'OnePlus Nord 4',              category: 'OnePlus',  description: 'Snapdragon 7+ Gen 3, дисплей 6.74" AMOLED 120 Гц, 100 Вт SUPERVOOC, металлический корпус',                    price: 34990,  image: I.xi13     },
  { title: 'Nothing Phone (2)',           category: 'Другие',   description: 'Snapdragon 8+ Gen 1, уникальный Glyph Interface с подсветкой, дисплей 6.7" LTPO OLED 120 Гц',                  price: 44990,  image: I.nothing2 },
  { title: 'Sony Xperia 1 VI',            category: 'Другие',   description: 'Snapdragon 8 Gen 3, переменный телефото 85–170 мм, дисплей 6.5" 4K OLED, Hi-Res Audio',                       price: 74990,  image: I.px9pro   },
  { title: 'Motorola Edge 50 Ultra',      category: 'Другие',   description: 'Snapdragon 8s Gen 3, камера 50 Мп с OIS, 125 Вт TurboPower зарядка, IP68',                                    price: 49990,  image: I.xi14t    },
];

const DEMO_USERS = [
  { email: 'admin@test.com',  first_name: 'Админ',    last_name: 'Тестов', password: 'password123', role: 'admin'  },
  { email: 'user@test.com',   first_name: 'Иван',     last_name: 'Иванов', password: 'password123', role: 'user'   },
  { email: 'seller@test.com', first_name: 'Продавец', last_name: 'Петров', password: 'password123', role: 'seller' },
];

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      email           TEXT UNIQUE NOT NULL,
      first_name      TEXT,
      last_name       TEXT,
      hashed_password TEXT,
      role            TEXT DEFAULT 'user',
      created_at      BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      title       TEXT,
      category    TEXT,
      description TEXT,
      price       NUMERIC,
      image       TEXT
    )
  `);

  // Seed demo users
  for (const u of DEMO_USERS) {
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS);
    const now = Math.floor(Date.now() / 1000);
    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, hashed_password, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [nanoid(), u.email, u.first_name, u.last_name, hashed, u.role, now]
    );
  }

  // Seed products only if table is empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM products');
  if (parseInt(rows[0].count) === 0) {
    for (const p of SEED_PRODUCTS) {
      await pool.query(
        `INSERT INTO products (id, title, category, description, price, image)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [nanoid(), p.title, p.category, p.description, p.price, p.image]
      );
    }
    console.log('Seeded 25 products');
  }

  console.log('Database initialized');
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name, password]
 *             properties:
 *               email: { type: string, example: ivan@example.com }
 *               first_name: { type: string, example: Иван }
 *               last_name: { type: string, example: Иванов }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       201:
 *         description: Успешная регистрация
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tokens' }
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, first_name, last_name, password } = req.body;
    if (!email || !first_name || !last_name || !password)
      return res.status(400).json({ error: 'Все поля обязательны' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'Email уже занят' });

    const hashed_password = await bcrypt.hash(password, SALT_ROUNDS);
    const id = nanoid();
    const created_at = Math.floor(Date.now() / 1000);

    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, hashed_password, role, created_at)
       VALUES ($1, $2, $3, $4, $5, 'user', $6)`,
      [id, email, first_name, last_name, hashed_password, created_at]
    );

    const user = { id, email, role: 'user' };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    res.status(201).json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@test.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tokens' }
 *       401:
 *         description: Неверные данные
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tokens' }
 *       401:
 *         description: Недействительный refresh-токен
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken))
    return res.status(401).json({ error: 'Недействительный refresh токен' });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Недействительный refresh токен' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Данные текущего пользователя
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USERS ROUTES ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Список всех пользователей (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Массив пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.get('/api/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Сменить роль пользователя (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, seller, admin] }
 *     responses:
 *       200:
 *         description: Обновлённый пользователь
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Недопустимая роль
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.patch('/api/users/:id/role', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'seller', 'admin'].includes(role))
      return res.status(400).json({ error: 'Недопустимая роль' });

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, first_name, last_name, role, created_at',
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Удалить пользователя (только admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Пользователь удалён
 *       400:
 *         description: Нельзя удалить себя
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.delete('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Нельзя удалить себя' });

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PRODUCTS ROUTES ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Массив товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 *   post:
 *     summary: Создать товар (seller / admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, price]
 *             properties:
 *               title: { type: string, example: iPhone 16 }
 *               category: { type: string, example: Apple }
 *               description: { type: string }
 *               price: { type: number, example: 89999 }
 *               image: { type: string }
 *     responses:
 *       201:
 *         description: Созданный товар
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY category, title');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Товар
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Не найден
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Обновить товар (seller / admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: Обновлённый товар
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Удалить товар (только admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Товар удалён
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authMiddleware, roleMiddleware('seller', 'admin'), async (req, res) => {
  try {
    const { title, category, description, price, image } = req.body;
    if (!title || !category || price == null)
      return res.status(400).json({ error: 'Укажите название, категорию и цену' });

    const id = nanoid();
    const result = await pool.query(
      `INSERT INTO products (id, title, category, description, price, image)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, title, category, description || '', Number(price), image || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authMiddleware, roleMiddleware('seller', 'admin'), async (req, res) => {
  try {
    const { title, category, description, price, image } = req.body;
    const result = await pool.query(
      `UPDATE products SET title = $1, category = $2, description = $3, price = $4, image = $5
       WHERE id = $6 RETURNING *`,
      [title, category, description, Number(price), image, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
    res.json({ message: 'Товар удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`PhoneStore (PostgreSQL) running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });

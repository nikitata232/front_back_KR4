# Практическое занятие №21 — Кэширование с использованием Redis

## Описание

В данной практической работе реализовано серверное приложение с системой аутентификации (JWT + RBAC) и **кэшированием ответов через Redis**. Сервер хранит часто запрашиваемые данные в Redis, снижая нагрузку на основное хранилище.

## Технологии

- **Node.js** — среда выполнения JavaScript
- **Express** — веб-фреймворк
- **Redis** — in-memory хранилище для кэша
- **jsonwebtoken** — генерация и верификация JWT-токенов
- **bcrypt** — хеширование паролей

## Структура проекта

```
practice_21/
├── server.js      # Основной файл сервера
├── package.json   # Зависимости
└── README.md
```

## Архитектура кэширования

Схема работы кэша:

1. Клиент отправляет запрос на сервер
2. Сервер проверяет наличие данных в Redis
3. **Если данные найдены** — возвращается ответ с `"source": "cache"` (быстро)
4. **Если данных нет** — данные получаются из основного хранилища, сохраняются в Redis и возвращаются с `"source": "db"`

## Время жизни кэша (TTL)

| Ресурс   | TTL      | Причина              |
|----------|----------|----------------------|
| Пользователи | 60 сек (1 мин) | Часто меняются |
| Товары   | 600 сек (10 мин) | Меняются реже  |

## API Эндпоинты

### Аутентификация

| Метод | Адрес                | Описание                        |
|-------|----------------------|---------------------------------|
| POST  | /api/auth/register   | Регистрация нового пользователя |
| POST  | /api/auth/login      | Вход и получение токенов        |
| POST  | /api/auth/refresh    | Обновление access-токена        |
| POST  | /api/auth/logout     | Выход и инвалидация токена      |

### Пользователи (только admin)

| Метод | Адрес               | Кэш   | Описание                       |
|-------|---------------------|-------|--------------------------------|
| GET   | /api/users          | Да    | Список пользователей           |
| GET   | /api/users/:id      | Да    | Конкретный пользователь        |
| PATCH | /api/users/:id/block| Нет   | Блокировка пользователя        |

### Товары

| Метод  | Адрес              | Кэш     | Описание               |
|--------|--------------------|---------|------------------------|
| GET    | /api/products      | Да      | Список товаров         |
| POST   | /api/products      | Очистка | Создание товара (admin)|
| PATCH  | /api/products/:id  | Очистка | Обновление товара (admin)|
| DELETE | /api/products/:id  | Очистка | Удаление товара (admin)|

## Установка и запуск

### 1. Установить Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

### 2. Установить зависимости и запустить

```bash
npm install
node server.js
```

### Переменные окружения (опционально)

```
REDIS_URL=redis://127.0.0.1:6379
ACCESS_SECRET=access_secret
REFRESH_SECRET=refresh_secret
PORT=3000
```

## Примеры запросов

### Регистрация admin-пользователя
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "secret", "role": "admin"}'
```

### Вход
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "secret"}'
```

### Получение пользователей (с кэшем)
```bash
# Первый запрос — "source": "db", данные сохраняются в Redis
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <access_token>"

# Повторный запрос — "source": "cache", данные из Redis
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <access_token>"
```

## Ключевые моменты реализации

- `cacheMiddleware` — Express middleware, проверяет Redis перед выполнением обработчика
- `saveToCache` — сохраняет результат в Redis с заданным TTL через команду `SET key value EX ttl`
- `invalidateUsersCache` / `invalidateProductsCache` — очистка кэша при изменении данных (Write-Through Invalidation)
- Ответ всегда содержит поле `source: "cache"` или `source: "db"` для отладки
- RBAC (Role-Based Access Control): роли `admin` и `user`

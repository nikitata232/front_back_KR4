# Контрольная работа №4 — Фронтенд и бэкенд разработка

**Дисциплина:** Фронтенд и бэкенд разработка  
**Институт:** ИПТИП  
**Кафедра:** Индустриального программирования  
**Семестр:** 4 семестр, 2025/2026 уч. год  
**Преподаватель:** Бочаров Михаил Иванович  
**Выполнил:** Лимонов Никита Андреевич, ЭФБО-08-24

---

## Содержание

> **Разделы:** [Быстрый старт](#быстрый-старт) · [Тестирование](#тестирование) · [Redis](#как-работает-redis-кэширование) · [Nginx](#как-работает-балансировка-nginx) · [Демо-аккаунты](#демо-аккаунты-для-всех-практик) · [API](#api-общий-для-всех-практик) · [Технологии](#технологии)

КР4 охватывает практики **19–24**: базы данных, кэширование, балансировка нагрузки и контейнеризация. Каждая практика построена на базе **KR2** (RBAC + JWT + PhoneStore), перенося его логику на соответствующий слой хранения и инфраструктуры.

| Папка          | Практика | Тема                                                  | Порт   |
| -------------- | -------- | ----------------------------------------------------- | ------ |
| `practice_19/` | №19      | KR2 + реляционная СУБД (PostgreSQL)                   | `3019` |
| `practice_20/` | №20      | KR2 + NoSQL СУБД (MongoDB)                            | `3020` |
| `practice_21/` | №21      | KR2 + PostgreSQL + кэширование Redis                  | `3021` |
| `practice_22/` | №22      | KR2 + PostgreSQL + Redis + балансировка (Nginx/HAProxy)| `8022` |
| `practice_23/` | №23      | KR2 + PostgreSQL + Redis + Docker Compose             | `8023` |
| `practice_24/` | №24      | Подготовка и сдача КР №4                              | —      |

---

## Быстрый старт

```bash
# Интерактивное меню
./start.sh

# Или напрямую:
./start.sh 19       # запустить только практику 19
./start.sh 20       # запустить только практику 20
./start.sh 21       # запустить только практику 21
./start.sh 22       # запустить только практику 22
./start.sh 23       # запустить только практику 23 (нужен Docker)
./start.sh all      # запустить все практики сразу
./start.sh stop     # остановить всё
./start.sh status   # таблица статусов
./start.sh db       # меню запуска баз данных
```

Скрипт **автоматически**:
- определяет пользователя PostgreSQL (`whoami`)
- устанавливает Redis через Homebrew, если не установлен
- создаёт нужные базы данных (`practice19`, `phonestore`)
- освобождает порты перед стартом
- запускает нужные базы данных перед каждой практикой

---

## Тестирование

### Проверка что всё запущено

```bash
./start.sh status
```

Или напрямую через curl:

```bash
curl http://localhost:3019/   # PostgreSQL
curl http://localhost:3020/   # MongoDB
curl http://localhost:3021/   # PostgreSQL + Redis
curl http://localhost:8022/   # Nginx балансировщик
curl http://localhost:8023/   # Docker
```

---

### Swagger UI

Интерактивная документация с возможностью вызвать любой эндпоинт прямо в браузере:

| Практика | Адрес |
|----------|-------|
| 19 | http://localhost:3019/api/docs |
| 20 | http://localhost:3020/api/docs |
| 21 | http://localhost:3021/api/docs |

**Как получить токен для Swagger:**

1. Открой `/api/docs` в браузере
2. Найди `POST /api/auth/login` → нажми **Try it out**
3. Вставь тело запроса и нажми **Execute**:
```json
{ "email": "admin@test.com", "password": "password123" }
```
4. Скопируй `accessToken` из ответа
5. Нажми кнопку **Authorize** (замочек сверху) → вставь `Bearer <токен>` → **Authorize**

Или получить токен через терминал:
```bash
curl -s -X POST http://localhost:3019/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

---

### Тестирование API через curl

```bash
# Список товаров (без токена)
curl http://localhost:3019/api/products

# Логин — получить токен
curl -s -X POST http://localhost:3019/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Запрос с токеном (список пользователей — только admin)
curl http://localhost:3019/api/users \
  -H "Authorization: Bearer <вставь токен>"

# Регистрация нового пользователя
curl -X POST http://localhost:3019/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.com","first_name":"Иван","last_name":"Иванов","password":"pass123"}'
```

---

### PostgreSQL

```bash
# Подключиться к БД phonstore (практики 21, 22, 23)
psql -U $(whoami) -d phonestore

# Подключиться к БД practice19 (практика 19)
psql -U $(whoami) -d practice19
```

Внутри сессии:

```sql
-- Посмотреть все таблицы
\dt

-- Список пользователей
SELECT email, role FROM users;

-- Количество товаров
SELECT COUNT(*) FROM products;

-- Выйти
\q
```

---

### MongoDB

```bash
# Подключиться
mongosh
```

Внутри сессии:

```js
// Выбрать нужную БД
use phonestore

// Все коллекции (аналог таблиц)
show collections

// Все документы с красивым выводом
db.users.find().pretty()
db.products.find().pretty()

// Только нужные поля (1 = показать, 0 = скрыть)
db.users.find({}, { email: 1, role: 1, _id: 0 })

// Количество документов
db.users.countDocuments()
db.products.countDocuments()

// Все БД на сервере
show dbs

// Выйти
exit
```

---

### Redis

```bash
# Подключиться
redis-cli

# Посмотреть все ключи (появятся после первых запросов к API)
KEYS *

# Прочитать закэшированные товары
GET products:all

# Выйти
exit
```

---

### Балансировщик (practice_22 и practice_23)

```bash
# Запустить 6 запросов — server должен чередоваться 1 → 2 → 1 → 2 ...
for i in $(seq 1 6); do
  curl -s http://localhost:8022/health
  echo
done
```

---

## Как работает Redis-кэширование

Redis — это **хранилище данных в оперативной памяти**. Он работает как словарь: ключ → значение. Благодаря тому что данные в RAM, чтение происходит на порядки быстрее чем запрос к PostgreSQL.

### Схема работы

```
GET /api/products
        │
        ▼
  Есть ключ "products:all" в Redis?
        │
   ДА ──┴── НЕТ
   │              │
   │              ▼
   │        Идём в PostgreSQL
   │        SELECT * FROM products
   │              │
   │              ▼
   │        Сохраняем в Redis:
   │        SET "products:all" "[{...}]" EX 600
   │              │
   └──────────────┘
        │
        ▼
  Отдаём ответ клиенту
  { "source": "db" | "cache", "data": [...] }
```

### Что физически хранится в Redis

Redis не знает что за данные — он хранит обычную строку. Сервер сериализует массив в JSON при записи и парсит обратно при чтении:

```
Ключ:        "products:all"
Значение:    "[{\"id\":\"abc\",\"title\":\"iPhone 16\",...}, ...]"
TTL:         600 секунд (после — ключ автоматически удаляется)
```

### Три операции

```bash
SET products:all "[ ... ]" EX 600   # записать с TTL
GET products:all                     # прочитать
DEL products:all                     # удалить (инвалидация при изменении данных)
```

### TTL по типам данных

| Данные | Ключ | TTL |
|--------|------|-----|
| Все товары | `products:all` | 600 сек (10 мин) |
| Товар по ID | `products:{id}` | 600 сек |
| Все пользователи | `users:all` | 60 сек |

При любом изменении (создание/обновление/удаление) сервер вызывает `DEL` на соответствующий ключ — следующий запрос снова пойдёт в БД и обновит кэш.

### Наблюдать вживую

```bash
# Сбросить кэш
redis-cli FLUSHALL

# Первый запрос — идёт в PostgreSQL
curl -s http://localhost:3021/api/products | python3 -c "import sys,json; print(json.load(sys.stdin)['source'])"
# → db

# Второй запрос — из кэша
curl -s http://localhost:3021/api/products | python3 -c "import sys,json; print(json.load(sys.stdin)['source'])"
# → cache

# Посмотреть что лежит в Redis
redis-cli KEYS "*"
redis-cli TTL "products:all"
```

---

## Как работает балансировка Nginx

Nginx принимает все входящие запросы на один порт и распределяет их между несколькими backend-серверами. Каждый backend — это отдельный Node.js процесс, но все они работают с **одной базой PostgreSQL** и **одним Redis**.

### Схема

```
Клиент
  │
  ▼
Nginx :8022  (Round Robin)
  ├─→ backend-1 :3022  SERVER_ID=1 ─┐
  ├─→ backend-2 :3023  SERVER_ID=2  ├──→ Redis → PostgreSQL
  └─→ backend-3 :3024  SERVER_ID=3* ─┘
                  * backup — включается только если 1 и 2 недоступны
```

### Алгоритм Round Robin

Nginx по очереди отправляет каждый новый запрос следующему серверу:

```
Запрос 1 → backend-1
Запрос 2 → backend-2
Запрос 3 → backend-1
Запрос 4 → backend-2
...
```

### Конфигурация (practice_22/nginx.conf)

```nginx
upstream backend {
    server 127.0.0.1:3022 max_fails=2 fail_timeout=30s;  # основной
    server 127.0.0.1:3023 max_fails=2 fail_timeout=30s;  # основной
    server 127.0.0.1:3024 backup;                         # резервный
}

server {
    listen 8022;
    location / {
        proxy_pass http://backend;
    }
}
```

`max_fails=2` — если сервер не ответил 2 раза подряд, Nginx исключает его на `fail_timeout=30s` и переключается на оставшиеся.

### Наблюдать вживую

Каждый backend отдаёт заголовок `X-Server-Id` — по нему видно кто обработал запрос:

```bash
for i in $(seq 1 8); do
  server=$(curl -si http://localhost:8022/health | grep -i x-server-id | awk '{print $2}' | tr -d '\r')
  echo "Запрос $i → backend-$server"
done
```

Вывод:
```
Запрос 1 → backend-1
Запрос 2 → backend-2
Запрос 3 → backend-1
Запрос 4 → backend-2
...
```

### Redis + Nginx вместе

Поскольку все три backend-а используют **один Redis**, кэш работает глобально — неважно какой сервер обработал запрос:

```
Запрос 1 → backend-1 → Redis пустой → PostgreSQL → пишет в Redis  (source: db)
Запрос 2 → backend-2 → Redis есть   → отдаёт кэш                  (source: cache)
Запрос 3 → backend-1 → Redis есть   → отдаёт кэш                  (source: cache)
```

---

## Связь с KR2

KR2 (практики 7–12) реализует PhoneStore — магазин смартфонов с RBAC-авторизацией и React-фронтендом, хранящий всё в памяти. КР4 последовательно переносит этот проект на реальные базы данных и инфраструктуру:

```
KR2 (in-memory)
    ↓ +PostgreSQL       → practice_19
    ↓ +MongoDB          → practice_20
    ↓ +PostgreSQL+Redis → practice_21
    ↓ +балансировка     → practice_22
    ↓ +Docker Compose   → practice_23
```

Во всех практиках сохраняется единый API, набор ролей и демо-аккаунты.

---

## Демо-аккаунты (для всех практик)

| Email             | Пароль      | Роль   |
| ----------------- | ----------- | ------ |
| admin@test.com    | password123 | admin  |
| seller@test.com   | password123 | seller |
| user@test.com     | password123 | user   |

---

## API (общий для всех практик)

| Метод  | Маршрут               | Доступ              | Описание                    |
| ------ | --------------------- | ------------------- | --------------------------- |
| POST   | /api/auth/register    | Публичный           | Регистрация                 |
| POST   | /api/auth/login       | Публичный           | Вход, получение токенов     |
| POST   | /api/auth/refresh     | Публичный           | Обновление access-токена    |
| GET    | /api/auth/me          | Авторизованный      | Профиль текущего пользователя |
| GET    | /api/users            | admin               | Список пользователей        |
| PATCH  | /api/users/:id/role   | admin               | Сменить роль                |
| DELETE | /api/users/:id        | admin               | Удалить пользователя        |
| GET    | /api/products         | Все                 | Каталог (25 смартфонов)     |
| GET    | /api/products/:id     | Все                 | Товар по ID                 |
| POST   | /api/products         | seller, admin       | Создать товар               |
| PUT    | /api/products/:id     | seller, admin       | Обновить товар              |
| DELETE | /api/products/:id     | admin               | Удалить товар               |

Swagger UI доступен по адресу `/api/docs` на каждом сервере (практики 19–21).

---

## Практика 19 — KR2 + PostgreSQL

**Задание:** перенести PhoneStore (KR2) с in-memory хранилища на PostgreSQL.

**Что реализовано:**
- Полный CRUD пользователей и товаров через `pg` (Pool)
- Таблицы `users` и `products` создаются автоматически при старте
- JWT-авторизация (access 15 мин + refresh 7 дней)
- RBAC: роли `user / seller / admin`
- Демо-аккаунты и 25 товаров заносятся через `ON CONFLICT DO NOTHING`
- Swagger UI: `http://localhost:3019/api/docs`

**Зависимости:** PostgreSQL

```bash
./start.sh 19
# или вручную:
DB_USER=$(whoami) DB_NAME=practice19 PORT=3019 node practice_19/server.js
```

**Эндпоинт:** `http://localhost:3019`

---

## Практика 20 — KR2 + MongoDB

**Задание:** перенести PhoneStore (KR2) на MongoDB.

**Что реализовано:**
- Mongoose ODM: схемы `UserSchema` и `ProductSchema` с валидацией
- Mongoose автоматически создаёт коллекции при первом обращении
- Тот же RBAC и JWT, что и в KR2
- Seed 3 демо-аккаунтов и 25 товаров при пустой коллекции
- Swagger UI: `http://localhost:3020/api/docs`

**Зависимости:** MongoDB

```bash
./start.sh 20
# или вручную:
PORT=3020 node practice_20/server.js
```

**Эндпоинт:** `http://localhost:3020`

---

## Практика 21 — KR2 + PostgreSQL + Redis

**Задание:** добавить Redis-кэширование к приложению из практики 19.

**Что реализовано:**
- Всё из практики 19 (PostgreSQL + RBAC + JWT)
- Redis-клиент (`redis` v4) с обработкой ошибок подключения
- Кэш пользователей: ключ `users:all`, TTL **60 сек**
- Кэш товаров: ключ `products:all` и `products:{id}`, TTL **600 сек**
- Инвалидация кэша при любом изменении данных
- Ответы содержат поле `source: "cache" | "db"`
- Swagger UI: `http://localhost:3021/api/docs`

**Зависимости:** PostgreSQL, Redis

```bash
./start.sh 21
# или вручную:
DB_USER=$(whoami) DB_NAME=phonestore PORT=3021 node practice_21/server.js
```

**Эндпоинт:** `http://localhost:3021`

**Пример ответа с кэшем:**
```json
{ "source": "cache", "data": [ ... ] }
```

---

## Практика 22 — KR2 + PostgreSQL + Redis + балансировка нагрузки

**Задание:** настроить балансировку нагрузки через Nginx и HAProxy.

**Что реализовано:**
- Три экземпляра backend-сервера с одним PostgreSQL и одним Redis
- Каждый сервер получает `SERVER_ID` — отдаёт его в заголовке `X-Server-Id`
- Всё кэширование из практики 21 (Redis, TTL, инвалидация)
- `nginx.conf` — Round Robin с `max_fails=2` и резервным сервером (backup)
- `haproxy.cfg` — Round Robin с активными health-check'ами и панелью статистики

**Зависимости:** PostgreSQL, Redis  
*(Nginx и HAProxy опциональны — бэкенды работают и напрямую)*

```bash
./start.sh 22
```

**Порты:**

| Сервис        | Порт   | Описание                    |
| ------------- | ------ | --------------------------- |
| Nginx         | `8022` | Балансировщик (Round Robin) |
| Backend 1     | `3022` | `SERVER_ID=1`               |
| Backend 2     | `3023` | `SERVER_ID=2`               |
| Backend 3     | `3024` | `SERVER_ID=3` (backup)      |
| HAProxy Stats | `8404` | `/stats` — панель статистики |

**Тест балансировки (заголовок меняется на каждом запросе):**
```bash
for i in $(seq 1 6); do
  curl -si http://localhost:8022/health | grep X-Server-Id
done
```

---

## Практика 23 — KR2 + PostgreSQL + Redis + Docker Compose

**Задание:** контейнеризировать всё приложение с помощью Docker Compose.

**Что реализовано:**
- `Dockerfile` на базе `node:18-alpine` (многоэтапная сборка не нужна)
- `docker-compose.yml` — пять сервисов в одной сети `app-network`:
  - `postgres` (postgres:16-alpine) с healthcheck
  - `redis` (redis:7-alpine) с healthcheck
  - `backend1/2/3` — Node.js-контейнеры с `SERVER_ID` и `REDIS_URL`
  - `nginx` — балансировщик, использует DNS-имена Docker-сервисов
- Backend ждёт готовности PostgreSQL и Redis (`depends_on: condition: service_healthy`)
- Retry-логика в коде: `connectWithRetry` (5 попыток, интервал 2 сек)
- Всё кэширование Redis из практики 21

**Зависимости:** Docker Desktop

```bash
./start.sh 23
# или вручную:
cd practice_23 && docker compose up --build
```

**Эндпоинт:** `http://localhost:8023`

**Тест балансировки:**
```bash
for i in $(seq 1 6); do curl -s http://localhost:8023/ ; echo; done
```

**Остановка:**
```bash
cd practice_23 && docker compose down
# с удалением данных:
docker compose down -v
```

---

## Структура репозитория

```
app_front_kr4/
├── start.sh                    ← Скрипт управления (запуск/остановка/статус)
├── README.md                   ← Этот файл
│
├── KR2/                        ← Базовый проект (in-memory, React SPA)
│   ├── pr7_8/server/           ← bcrypt + JWT access-токены
│   ├── pr9_10/server/          ← + refresh-токены
│   ├── pr9_10/client/          ← React + axios interceptors
│   ├── pr11_12/server/         ← + RBAC (user/seller/admin), Swagger
│   └── pr11_12/client/         ← PhoneStore UI (тёмная тема, фильтры)
│
├── practice_19/
│   ├── server.js               ← KR2 + PostgreSQL (pg)
│   └── package.json
│
├── practice_20/
│   ├── server.js               ← KR2 + MongoDB (mongoose)
│   └── package.json
│
├── practice_21/
│   ├── server.js               ← KR2 + PostgreSQL + Redis
│   └── package.json
│
├── practice_22/
│   ├── backend/
│   │   ├── server.js           ← KR2 + PostgreSQL + Redis + SERVER_ID
│   │   └── package.json
│   ├── nginx.conf              ← Round Robin :8022 → :3022/:3023/:3024
│   └── haproxy.cfg             ← HAProxy :8080, stats :8404
│
├── practice_23/
│   ├── backend/
│   │   ├── server.js           ← KR2 + PostgreSQL + Redis + retry
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── nginx.conf              ← Round Robin (Docker DNS)
│   └── docker-compose.yml      ← postgres + redis + nginx + 3×backend
│
└── practice_24/
    └── README.md               ← Чеклист сдачи КР №4
```

---

## Технологии

| Категория      | Инструмент                        | Использование                                  |
| -------------- | --------------------------------- | ---------------------------------------------- |
| Runtime        | Node.js 18+ / Express 4           | HTTP-сервер во всех практиках                  |
| Аутентификация | bcrypt, jsonwebtoken, nanoid      | Хеширование паролей, JWT access+refresh        |
| PostgreSQL     | pg (Pool), SQL                    | Хранение данных (пр. 19, 21, 22, 23)           |
| MongoDB        | mongoose, ODM-схемы               | Хранение данных (пр. 20)                       |
| Redis          | redis v4 (createClient)           | Кэширование с TTL и инвалидацией (пр. 21–23)   |
| Балансировка   | Nginx (Round Robin + backup)      | Распределение запросов (пр. 22, 23)            |
| Балансировка   | HAProxy (health-check, stats)     | Альтернативный балансировщик (пр. 22)          |
| Контейнеры     | Docker, Docker Compose            | Изолированная среда со всем стеком (пр. 23)    |
| Документация   | swagger-jsdoc, swagger-ui-express | Swagger UI `/api/docs` (пр. 19–21)             |
| Фронтенд (KR2) | React 18, react-router-dom v6     | PhoneStore SPA с ролевым UI                    |
| Фронтенд (KR2) | axios (interceptors), SASS        | HTTP-клиент с автообновлением токена           |

---

## Переменные окружения

| Переменная    | По умолчанию             | Практики        |
| ------------- | ------------------------ | --------------- |
| `PORT`        | `3000`                   | 19, 20, 21, 22  |
| `SERVER_ID`   | `unknown`                | 22, 23          |
| `DB_USER`     | `postgres`               | 19, 21, 22, 23  |
| `DB_HOST`     | `localhost`              | 19, 21, 22, 23  |
| `DB_NAME`     | `phonestore`             | 19, 21, 22, 23  |
| `DB_PASSWORD` | `password`               | 19, 21, 22, 23  |
| `DB_PORT`     | `5432`                   | 19, 21, 22, 23  |
| `MONGO_URI`   | `mongodb://localhost/phonestore` | 20      |
| `REDIS_URL`   | `redis://127.0.0.1:6379` | 21, 22, 23      |
| `ACCESS_SECRET`  | `access_secret`       | Все             |
| `REFRESH_SECRET` | `refresh_secret`      | Все             |

> **Важно:** `start.sh` автоматически устанавливает `DB_USER=$(whoami)` — стандартный пользователь macOS-установки PostgreSQL через Homebrew.

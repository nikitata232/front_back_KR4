# Контрольная работа №4 — Фронтенд и бэкенд разработка

**Дисциплина:** Фронтенд и бэкенд разработка  
**Институт:** ИПТИП  
**Кафедра:** Индустриального программирования  
**Семестр:** 4 семестр, 2025/2026 уч. год  
**Преподаватели:** Загородних Николай Анатольевич, Краснослободцева Дарья Борисовна
**Выполнил:** Лимонов Никита Андреевич, ЭФБО-08-24

---

## Содержание

Контрольная работа №4 включает практические занятия **19–23** по теме баз данных, кэширования, балансировки нагрузки и контейнеризации.

| Папка          | Практика | Тема                                     |
| -------------- | -------- | ---------------------------------------- |
| `practice_19/` | №19      | Работа с реляционными СУБД (PostgreSQL)  |
| `practice_20/` | №20      | Работа с NoSQL СУБД (MongoDB)            |
| `practice_21/` | №21      | Кэширование с использованием Redis       |
| `practice_22/` | №22      | Балансировка нагрузки (Nginx + HAProxy)  |
| `practice_23/` | №23      | Контейнеризация приложений с Docker      |
| `practice_24/` | №24      | Подготовка и сдача контрольной работы №4 |

---

## Практика 19 — PostgreSQL

**Задание:** Реализовать REST API для управления пользователями с подключением PostgreSQL.

**Что реализовано:**

- Node.js + Express сервер
- Подключение к PostgreSQL через драйвер `pg`
- Автоматическое создание таблицы `users` при старте
- Полный CRUD (Create, Read, Update, Delete)

**Эндпоинты:**

| Метод  | Адрес          | Описание                     |
| ------ | -------------- | ---------------------------- |
| POST   | /api/users     | Создание пользователя        |
| GET    | /api/users     | Список всех пользователей    |
| GET    | /api/users/:id | Получение пользователя по ID |
| PATCH  | /api/users/:id | Частичное обновление         |
| DELETE | /api/users/:id | Удаление пользователя        |

```bash
cd practice_19 && npm install && node server.js
```

---

## Практика 20 — MongoDB

**Задание:** Реализовать REST API для управления пользователями с подключением MongoDB.

**Что реализовано:**

- Node.js + Express сервер
- Подключение к MongoDB через Mongoose ODM
- Mongoose Schema с валидацией полей
- Полный CRUD (Create, Read, Update, Delete)

**Эндпоинты:**

| Метод  | Адрес          | Описание                     |
| ------ | -------------- | ---------------------------- |
| POST   | /api/users     | Создание пользователя        |
| GET    | /api/users     | Список всех пользователей    |
| GET    | /api/users/:id | Получение пользователя по ID |
| PATCH  | /api/users/:id | Частичное обновление         |
| DELETE | /api/users/:id | Удаление пользователя        |

```bash
cd practice_20 && npm install && node server.js
```

---

## Практика 21 — Redis (кэширование)

**Задание:** Добавить Redis-кэширование к приложению с RBAC-авторизацией.

**Что реализовано:**

- JWT-аутентификация (Access + Refresh токены)
- RBAC (роли `admin` и `user`)
- Redis-клиент для кэширования ответов
- `cacheMiddleware` — middleware для чтения из кэша
- `saveToCache` — сохранение в Redis с TTL
- Инвалидация кэша при изменении данных
- Кэш пользователей: TTL 60 сек; товаров: TTL 600 сек

```bash
cd practice_21 && npm install && node server.js
```

---

## Практика 22 — Балансировка нагрузки

**Задание:** Реализовать систему балансировки нагрузки через Nginx и HAProxy.

**Что реализовано:**

- Express backend-сервер с идентификатором (`SERVER_ID`)
- `nginx.conf` — Round Robin балансировка с `max_fails` и `fail_timeout`
- `haproxy.cfg` — HAProxy с активными health-check'ами и панелью статистики
- Резервный сервер (backup)

```bash
cd practice_22/backend && npm install
PORT=3000 SERVER_ID=1 node server.js &
PORT=3001 SERVER_ID=2 node server.js &
PORT=3002 SERVER_ID=3 node server.js &
# Запустить nginx с nginx.conf
```

---

## Практика 23 — Docker + Docker Compose

**Задание:** Контейнеризировать приложение с балансировкой нагрузки через Docker Compose.

**Что реализовано:**

- `Dockerfile` для Node.js сервиса (на базе `node:18-alpine`)
- `docker-compose.yml` с тремя backend-контейнерами и Nginx
- `nginx.conf` использует имена Docker-сервисов вместо IP-адресов
- Настройки отказоустойчивости (`max_fails`, `fail_timeout`, `backup`)
- `.dockerignore` для оптимизации сборки

```bash
cd practice_23
docker compose up --build
# Тест балансировки:
for i in $(seq 1 6); do curl -s http://localhost/; echo; done
# Остановка:
docker compose down
```

---

## Практика 24 — Подготовка к КР №4

Финальная сдача контрольной работы. Все практики (19–23) реализованы, протестированы и задокументированы. Подробности в `practice_24/README.md`.

---

## Общая структура репозитория

```
app_front_kr4/
├── README.md               ← Этот файл (общий обзор)
├── practice_19/
│   ├── server.js           ← Express + pg + PostgreSQL
│   ├── package.json
│   └── README.md
├── practice_20/
│   ├── server.js           ← Express + Mongoose + MongoDB
│   ├── package.json
│   └── README.md
├── practice_21/
│   ├── server.js           ← Express + JWT + RBAC + Redis
│   ├── package.json
│   └── README.md
├── practice_22/
│   ├── backend/
│   │   ├── server.js       ← Backend-сервер для балансировки
│   │   └── package.json
│   ├── nginx.conf          ← Nginx балансировщик
│   ├── haproxy.cfg         ← HAProxy балансировщик
│   └── README.md
├── practice_23/
│   ├── backend/
│   │   ├── server.js       ← Backend-сервис
│   │   ├── package.json
│   │   └── Dockerfile      ← Docker-образ
│   ├── nginx.conf          ← Nginx для Docker-сети
│   ├── docker-compose.yml  ← Весь стек одной командой
│   ├── .dockerignore
│   └── README.md
└── practice_24/
    └── README.md           ← Чеклист сдачи КР №4
```

## Быстрый старт

```bash
# Практика 19 (нужен PostgreSQL)
cd practice_19 && npm install && node server.js

# Практика 20 (нужен MongoDB)
cd practice_20 && npm install && node server.js

# Практика 21 (нужен Redis)
cd practice_21 && npm install && node server.js

# Практика 23 (нужен Docker)
cd practice_23 && docker compose up --build
```

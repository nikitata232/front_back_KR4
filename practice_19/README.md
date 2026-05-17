# Практическое занятие №19 — Работа с реляционными СУБД на примере PostgreSQL

## Описание

В данной практической работе реализовано REST API для управления пользователями с использованием Node.js, Express и реляционной базы данных **PostgreSQL**.

## Технологии

- **Node.js** — среда выполнения JavaScript
- **Express** — веб-фреймворк
- **pg** — официальный драйвер PostgreSQL для Node.js
- **PostgreSQL** — реляционная СУБД

## Структура проекта

```
practice_19/
├── server.js      # Основной файл сервера
├── package.json   # Зависимости
└── README.md
```

## Сущность Пользователь

Таблица `users` в PostgreSQL:

| Поле       | Тип          | Описание                            |
|------------|--------------|-------------------------------------|
| id         | SERIAL (PK)  | Уникальный идентификатор            |
| first_name | VARCHAR(100) | Имя пользователя                    |
| last_name  | VARCHAR(100) | Фамилия пользователя                |
| age        | INTEGER      | Возраст пользователя                |
| created_at | BIGINT       | Время создания (Unix timestamp)     |
| updated_at | BIGINT       | Время обновления (Unix timestamp)   |

## API Эндпоинты

| Метод  | Адрес           | Описание                        |
|--------|-----------------|---------------------------------|
| POST   | /api/users      | Создание нового пользователя    |
| GET    | /api/users      | Получение списка пользователей  |
| GET    | /api/users/:id  | Получение конкретного пользователя |
| PATCH  | /api/users/:id  | Обновление информации пользователя |
| DELETE | /api/users/:id  | Удаление пользователя           |

## Установка и запуск

### 1. Установить PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

**Windows:** скачать установщик с официального сайта.

### 2. Создать базу данных

```sql
CREATE DATABASE practice19;
```

### 3. Установить зависимости и запустить

```bash
npm install
node server.js
```

### Переменные окружения (опционально)

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=practice19
DB_PASSWORD=password
DB_PORT=5432
PORT=3000
```

## Примеры запросов

### Создание пользователя
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Иван", "last_name": "Иванов", "age": 25}'
```

### Получение всех пользователей
```bash
curl http://localhost:3000/api/users
```

### Получение пользователя по ID
```bash
curl http://localhost:3000/api/users/1
```

### Обновление пользователя
```bash
curl -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age": 26}'
```

### Удаление пользователя
```bash
curl -X DELETE http://localhost:3000/api/users/1
```

## Ключевые моменты реализации

- При старте сервер автоматически создаёт таблицу `users` если она не существует (`CREATE TABLE IF NOT EXISTS`)
- Поля `created_at` и `updated_at` хранятся в формате Unix timestamp (секунды)
- При обновлении (`PATCH`) автоматически обновляется поле `updated_at`
- Используется `COALESCE` для частичного обновления — передавать можно только изменяемые поля
- Все запросы к БД используют параметризованные запросы для защиты от SQL-инъекций

# Практическое занятие №20 — Работа с NoSQL СУБД на примере MongoDB

## Описание

В данной практической работе реализовано REST API для управления пользователями с использованием Node.js, Express и документоориентированной NoSQL базы данных **MongoDB** через ORM-библиотеку **Mongoose**.

## Технологии

- **Node.js** — среда выполнения JavaScript
- **Express** — веб-фреймворк
- **Mongoose** — ODM (Object Data Modeling) для MongoDB
- **MongoDB** — документоориентированная NoSQL СУБД

## Структура проекта

```
practice_20/
├── server.js      # Основной файл сервера
├── package.json   # Зависимости
└── README.md
```

## Схема документа Пользователь

Коллекция `users` в MongoDB:

| Поле       | Тип    | Описание                           |
|------------|--------|------------------------------------|
| _id        | ObjectId | Уникальный идентификатор MongoDB |
| first_name | String | Имя пользователя (обязательное)    |
| last_name  | String | Фамилия пользователя (обязательное)|
| age        | Number | Возраст пользователя (обязательное)|
| created_at | Number | Время создания (Unix timestamp)    |
| updated_at | Number | Время обновления (Unix timestamp)  |

## API Эндпоинты

| Метод  | Адрес           | Описание                           |
|--------|-----------------|------------------------------------|
| POST   | /api/users      | Создание нового пользователя       |
| GET    | /api/users      | Получение списка пользователей     |
| GET    | /api/users/:id  | Получение конкретного пользователя |
| PATCH  | /api/users/:id  | Обновление информации пользователя |
| DELETE | /api/users/:id  | Удаление пользователя              |

## Установка и запуск

### 1. Установить MongoDB (Ubuntu)

```bash
sudo apt update && sudo apt install -y curl
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod
```

### 2. Установить зависимости и запустить

```bash
npm install
node server.js
```

### Переменные окружения (опционально)

```
MONGO_URI=mongodb://localhost:27017/practice20
PORT=3000
```

## Примеры запросов

### Создание пользователя
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Мария", "last_name": "Петрова", "age": 22}'
```

### Получение всех пользователей
```bash
curl http://localhost:3000/api/users
```

### Получение пользователя по ID
```bash
curl http://localhost:3000/api/users/<ObjectId>
```

### Обновление пользователя
```bash
curl -X PATCH http://localhost:3000/api/users/<ObjectId> \
  -H "Content-Type: application/json" \
  -d '{"age": 23}'
```

### Удаление пользователя
```bash
curl -X DELETE http://localhost:3000/api/users/<ObjectId>
```

## Сравнение с PostgreSQL (практика 19)

| Критерий        | PostgreSQL (практика 19)     | MongoDB (практика 20)           |
|-----------------|------------------------------|---------------------------------|
| Тип БД          | Реляционная                  | Документоориентированная NoSQL  |
| Схема данных    | Жёсткая (DDL)                | Гибкая (schema-less)            |
| ID объекта      | SERIAL integer               | ObjectId (BSON)                 |
| ORM/драйвер     | pg (SQL-запросы)             | Mongoose (ODM)                  |
| Язык запросов   | SQL                          | MongoDB Query Language (MQL)    |
| Масштабирование | Вертикальное                 | Горизонтальное                  |

## Ключевые моменты реализации

- Mongoose Schema определяет структуру документа и правила валидации
- `runValidators: true` в `findByIdAndUpdate` включает проверку валидаторов при обновлении
- Поля `created_at` и `updated_at` хранятся в формате Unix timestamp
- При обновлении (`PATCH`) автоматически обновляется поле `updated_at`

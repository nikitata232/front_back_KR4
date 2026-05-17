# Практическое занятие №24 — Подготовка к контрольной работе №4

## Описание

В рамках данного практического занятия выполнена финальная доработка и сдача **Контрольной работы №4**. Контрольная работа является результатом выполнения практических занятий 19–24.

## Содержание контрольной работы

Контрольная работа №4 включает реализацию следующих практик:

| Практика | Тема                                    | Статус    |
| -------- | --------------------------------------- | --------- |
| №19      | Работа с реляционными СУБД (PostgreSQL) | Выполнено |
| №20      | Работа с NoSQL СУБД (MongoDB)           | Выполнено |
| №21      | Кэширование с использованием Redis      | Выполнено |
| №22      | Балансировка нагрузки (Nginx + HAProxy) | Выполнено |
| №23      | Контейнеризация приложений с Docker     | Выполнено |

## Чеклист сдачи

- [x] Практика 19 реализована и протестирована (PostgreSQL CRUD API)
- [x] Практика 20 реализована и протестирована (MongoDB CRUD API)
- [x] Практика 21 реализована и протестирована (Redis кэширование)
- [x] Практика 22 реализована и протестирована (Nginx + HAProxy балансировка)
- [x] Практика 23 реализована и протестирована (Docker Compose)
- [x] README.md написан для каждой практики
- [x] Общий README.md написан в корне репозитория
- [x] Репозиторий открытый (public)

## Как протестировать работоспособность

### Практика 19 (PostgreSQL)

```bash
cd practice_19 && npm install
# Запустить PostgreSQL, создать БД practice19
node server.js
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"first_name":"Иван","last_name":"Иванов","age":25}'
curl http://localhost:3000/api/users
```

### Практика 20 (MongoDB)

```bash
cd practice_20 && npm install
# Запустить MongoDB
node server.js
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"first_name":"Мария","last_name":"Петрова","age":22}'
curl http://localhost:3000/api/users
```

### Практика 21 (Redis)

```bash
cd practice_21 && npm install
# Запустить Redis
node server.js
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin","password":"secret","role":"admin"}'
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"secret"}'
```

### Практика 22 (Nginx + HAProxy)

```bash
cd practice_22/backend && npm install
PORT=3000 SERVER_ID=1 node server.js &
PORT=3001 SERVER_ID=2 node server.js &
PORT=3002 SERVER_ID=3 node server.js &
# Запустить Nginx с nginx.conf
for i in $(seq 1 6); do curl -s http://localhost/; echo; done
```

### Практика 23 (Docker)

```bash
cd practice_23
docker compose up --build
for i in $(seq 1 6); do curl -s http://localhost/; echo; done
docker compose down
```

## Формат отчёта

В качестве ответа на задание прикрепляется ссылка на репозиторий с реализованной практикой в раздел СДО: **Задания текущего контроля → Контрольная работа №4**.

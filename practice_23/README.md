# Практическое занятие №23 — Контейнеризация приложений с Docker

## Описание

В данной практической работе реализовано многоконтейнерное веб-приложение с балансировкой нагрузки через Nginx, развёрнутое с помощью **Docker Compose**. Приложение представляет собой продолжение практики 22: вместо ручного запуска серверов на разных портах каждый компонент системы — отдельный Docker-контейнер.

## Технологии

- **Docker** — платформа контейнеризации
- **Docker Compose** — оркестрация многоконтейнерных приложений
- **Node.js + Express** — backend-сервисы
- **Nginx** — балансировщик нагрузки

## Структура проекта

```
practice_23/
├── backend/
│   ├── server.js      # Backend-сервис
│   ├── package.json
│   └── Dockerfile     # Инструкции сборки образа
├── nginx.conf         # Конфигурация Nginx
├── docker-compose.yml # Описание всего стека сервисов
├── .dockerignore      # Исключения при сборке образа
└── README.md
```

## Архитектура приложения

```
Клиент → Nginx (порт 80) → backend1 (порт 3000)
                         → backend2 (порт 3000)
                         → backend3 (порт 3000, backup)
```

Docker сам разрешает имена сервисов (`backend1`, `backend2`, `backend3`) в IP-адреса контейнеров — IP-адреса и порты хоста не нужны.

## Dockerfile

Ключевые решения:
- `FROM node:18-alpine` — лёгкий базовый образ (~5 МБ)
- Сначала копируется `package*.json`, затем запускается `npm install` — Docker кэширует этот слой и не переустанавливает зависимости при изменении только кода
- `COPY . .` — копирование остального кода после установки зависимостей
- Сервер слушает на `0.0.0.0` (обязательно для Docker-сетей)

## Docker Compose

Сервисы:
- `nginx` — балансировщик, единственный контейнер с открытым портом (80)
- `backend1`, `backend2` — основные backend-серверы (Round Robin)
- `backend3` — резервный backend (backup)

Все сервисы объединены в одну Docker-сеть `app-network` типа `bridge`.

## Установка Docker (WSL/Ubuntu)

```bash
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Проверка:
```bash
docker --version
docker compose version
docker run hello-world
```

## Запуск

### Сборка и запуск всех контейнеров

```bash
docker compose up --build
```

### Запуск в фоновом режиме

```bash
docker compose up -d --build
```

### Просмотр запущенных контейнеров

```bash
docker ps
```

### Остановка

```bash
docker compose down
```

## Тестирование балансировки

После запуска проверьте, что запросы распределяются между серверами:

```bash
# Повторные запросы — поочерёдно приходят ответы от разных backend
for i in $(seq 1 6); do curl -s http://localhost/ | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['server'])"; done
```

Ожидаемый вывод:
```
backend-1
backend-2
backend-1
backend-2
backend-1
backend-2
```

### Тест отказоустойчивости

```bash
# Остановить один из backend-контейнеров
docker compose stop backend1

# Nginx перестанет направлять запросы на backend1 и продолжит через backend2
curl http://localhost/
```

## Полезные команды Docker

```bash
# Логи конкретного сервиса
docker compose logs nginx

# Логи всех сервисов в реальном времени
docker compose logs -f

# Войти внутрь контейнера для отладки
docker compose exec backend1 sh

# Перезапустить один сервис
docker compose restart backend2

# Просмотр всех образов
docker images

# Очистка неиспользуемых ресурсов
docker system prune
```

## Ключевые концепции

| Понятие        | Описание                                                    |
|----------------|-------------------------------------------------------------|
| Образ (Image)  | Неизменяемый шаблон для создания контейнера                 |
| Контейнер      | Запущенный экземпляр образа                                 |
| Dockerfile     | Инструкции сборки образа                                    |
| Docker Compose | Инструмент для запуска многоконтейнерных приложений         |
| Volume         | Область хранения данных вне контейнера                      |
| Network        | Виртуальная сеть для взаимодействия контейнеров             |

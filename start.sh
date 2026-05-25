#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  PhoneStore — запуск практик и баз данных
#
#  Порты:
#    practice_19  →  3019  (PostgreSQL)
#    practice_20  →  3020  (MongoDB)
#    practice_21  →  3021  (PostgreSQL + Redis)
#    practice_22  →  8022  (Nginx → backends 3022/3023/3024, PG + Redis)
#    practice_23  →  8023  (Docker Compose)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail 2>/dev/null || true   # bash/zsh safe

BASE="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$BASE/.pids"
LOG_DIR="$BASE/logs"

# ── Автоопределение пользователя PostgreSQL ───────────────────────────────────
PG_USER="${DB_USER:-$(whoami)}"

# ── Цвета ─────────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
C='\033[0;36m'; B='\033[1;34m'; W='\033[1;37m'; NC='\033[0m'

ok()   { echo -e "  ${G}✔${NC}  $*"; }
fail() { echo -e "  ${R}✘${NC}  $*"; }
info() { echo -e "  ${C}→${NC}  $*"; }
warn() { echo -e "  ${Y}!${NC}  $*"; }
hdr()  { echo -e "\n${W}$*${NC}"; }

has()         { command -v "$1" &>/dev/null; }
is_running()  { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }
port_open()   { curl -s --max-time 1 "http://localhost:$1/" &>/dev/null || \
                curl -s --max-time 1 "http://localhost:$1/health" &>/dev/null; }

# ── PID-файл ──────────────────────────────────────────────────────────────────
save_pid()  { echo "$1=$2" >> "$PIDS_FILE"; }
load_pid()  { [ -f "$PIDS_FILE" ] && grep "^$1=" "$PIDS_FILE" | tail -1 | cut -d= -f2 || true; }
clear_pids(){ rm -f "$PIDS_FILE"; }

# ── Освободить порт ───────────────────────────────────────────────────────────
kill_port() {
  local pids
  pids=$(lsof -ti :"$1" 2>/dev/null || true)
  [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null || true
  sleep 0.1
}

# ── Ждём, пока сервер ответит ─────────────────────────────────────────────────
wait_ready() {
  local port="$1" label="$2" attempts="${3:-20}"
  for _ in $(seq 1 "$attempts"); do
    sleep 0.5
    if port_open "$port"; then return 0; fi
  done
  # Последняя попытка — может просто нет /health, но процесс жив
  return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
#  БАЗЫ ДАННЫХ
# ═══════════════════════════════════════════════════════════════════════════════

# ── Создать БД PostgreSQL, если не существует ─────────────────────────────────
pg_create_db() {
  local dbname="$1"
  if psql -U "$PG_USER" -d postgres -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$dbname"; then
    ok "БД '$dbname' уже существует"
  else
    info "Создаю БД PostgreSQL: $dbname"
    createdb -U "$PG_USER" "$dbname" 2>/dev/null \
      && ok "БД '$dbname' создана" \
      || warn "Не удалось создать БД '$dbname' (возможно, нет прав)"
  fi
}

start_postgres() {
  hdr "PostgreSQL (пользователь: $PG_USER)"

  # Уже работает?
  if psql -U "$PG_USER" -d postgres -c '\q' &>/dev/null; then
    ok "PostgreSQL уже запущен"
    return 0
  fi

  # Homebrew
  if has brew; then
    local formula
    formula=$(brew list --formula 2>/dev/null | grep -E '^postgresql' | tail -1)
    if [ -n "$formula" ]; then
      brew services start "$formula" &>/dev/null && sleep 1
      psql -U "$PG_USER" -d postgres -c '\q' &>/dev/null && ok "PostgreSQL запущен через Homebrew ($formula)" && return 0
    fi
  fi

  # Docker fallback
  if has docker && docker info &>/dev/null; then
    if docker ps --format '{{.Names}}' | grep -q '^ps_phonestore$'; then
      ok "PostgreSQL уже запущен в Docker (ps_phonestore)"
    else
      docker rm -f ps_phonestore &>/dev/null || true
      docker run -d --name ps_phonestore \
        -e POSTGRES_USER="$PG_USER" \
        -e POSTGRES_DB=phonestore \
        -p 5432:5432 postgres:16-alpine &>/dev/null
      info "Жду запуска PostgreSQL в Docker..."
      sleep 3
      ok "PostgreSQL запущен в Docker (ps_phonestore, user=$PG_USER)"
    fi
    return 0
  fi

  fail "PostgreSQL не найден. Установите: brew install postgresql@14"
  return 1
}

start_mongodb() {
  hdr "MongoDB"

  # Уже работает?
  if mongosh --quiet --eval 'db.runCommand({ping:1})' &>/dev/null 2>&1; then
    ok "MongoDB уже запущен"
    return 0
  fi

  if has brew; then
    local formula
    formula=$(brew list --formula 2>/dev/null | grep 'mongodb-community' | tail -1)
    if [ -n "$formula" ]; then
      brew services start "$formula" &>/dev/null && sleep 1
      ok "MongoDB запущен через Homebrew" && return 0
    fi
  fi

  if has mongod; then
    mkdir -p /tmp/mongo_data
    mongod --dbpath /tmp/mongo_data --logpath /tmp/mongo.log --fork &>/dev/null \
      && ok "MongoDB запущен (dbpath=/tmp/mongo_data)" && return 0
  fi

  if has docker && docker info &>/dev/null; then
    if docker ps --format '{{.Names}}' | grep -q '^mg_phonestore$'; then
      ok "MongoDB уже запущен в Docker (mg_phonestore)"
    else
      docker rm -f mg_phonestore &>/dev/null || true
      docker run -d --name mg_phonestore -p 27017:27017 mongo:7 &>/dev/null
      sleep 2
      ok "MongoDB запущен в Docker (mg_phonestore)"
    fi
    return 0
  fi

  fail "MongoDB не найден. Установите: brew tap mongodb/brew && brew install mongodb-community"
  return 1
}

start_redis() {
  hdr "Redis"

  # Уже работает?
  if redis-cli ping &>/dev/null 2>&1; then
    ok "Redis уже запущен"
    return 0
  fi

  if has brew; then
    # Установить, если не установлен
    if ! brew list --formula 2>/dev/null | grep -q '^redis$'; then
      info "Redis не установлен — устанавливаю (brew install redis)..."
      brew install redis &>/dev/null && ok "Redis установлен" || { fail "Ошибка установки Redis"; return 1; }
    fi
    brew services start redis &>/dev/null && sleep 1
    redis-cli ping &>/dev/null && ok "Redis запущен через Homebrew" && return 0
  fi

  if has redis-server; then
    redis-server --daemonize yes --logfile /tmp/redis.log &>/dev/null \
      && ok "Redis запущен (daemonize)" && return 0
  fi

  if has docker && docker info &>/dev/null; then
    if docker ps --format '{{.Names}}' | grep -q '^rd_phonestore$'; then
      ok "Redis уже запущен в Docker (rd_phonestore)"
    else
      docker rm -f rd_phonestore &>/dev/null || true
      docker run -d --name rd_phonestore -p 6379:6379 redis:7-alpine &>/dev/null
      sleep 1
      ok "Redis запущен в Docker (rd_phonestore)"
    fi
    return 0
  fi

  fail "Redis не найден. Установите: brew install redis"
  return 1
}

menu_db() {
  while true; do
    echo -e "\n${B}┌──────────────────────────────────┐${NC}"
    echo -e "${B}│${NC}    Выберите базу данных           ${B}│${NC}"
    echo -e "${B}├──────────────────────────────────┤${NC}"
    echo -e "${B}│${NC}  ${W}1)${NC} PostgreSQL                    ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}2)${NC} MongoDB                       ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}3)${NC} Redis                         ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}4)${NC} Все сразу                     ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}0)${NC} Назад                         ${B}│${NC}"
    echo -e "${B}└──────────────────────────────────┘${NC}"
    printf "  Ваш выбор: "; read -r ch
    case "$ch" in
      1) start_postgres ;;
      2) start_mongodb  ;;
      3) start_redis    ;;
      4) start_postgres; start_mongodb; start_redis ;;
      0) return ;;
      *) warn "Неверный выбор" ;;
    esac
  done
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ЗАПУСК NODE-СЕРВЕРА
# ═══════════════════════════════════════════════════════════════════════════════

# $1=метка  $2=папка  $3=порт  $4+=доп. env (KEY=VAL ...)
node_start() {
  local label="$1" dir="$2" port="$3"; shift 3
  local extra="$*"

  [ ! -f "$dir/server.js" ] && fail "$label: server.js не найден в $dir" && return 1

  [ ! -d "$dir/node_modules" ] && info "$label: npm install..." && \
    (cd "$dir" && npm install --silent 2>/dev/null)

  kill_port "$port"
  mkdir -p "$LOG_DIR"

  # Запускаем в фоне с env-переменными
  env PORT="$port" $extra node "$dir/server.js" >> "$LOG_DIR/${label}.log" 2>&1 &
  local pid=$!

  # Ждём готовности (до 10 сек)
  local ready=0
  for _ in $(seq 1 20); do
    sleep 0.5
    if ! is_running "$pid"; then break; fi
    if port_open "$port"; then ready=1; break; fi
  done

  if [ "$ready" -eq 1 ]; then
    save_pid "$label" "$pid"
    ok "$label  →  http://localhost:$port  (PID $pid)"
    return 0
  elif is_running "$pid"; then
    save_pid "$label" "$pid"
    warn "$label запущен, /health не отвечает  (PID $pid) — см. logs/${label}.log"
    return 0
  else
    fail "$label не запустился — см. logs/${label}.log"
    tail -3 "$LOG_DIR/${label}.log" 2>/dev/null | sed 's/^/         /'
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ПРАКТИКИ
# ═══════════════════════════════════════════════════════════════════════════════

start_practice_19() {
  hdr "Практика 19 — PostgreSQL CRUD API  →  :3019"
  start_postgres || return 1
  pg_create_db "practice19"
  node_start "pr19" "$BASE/practice_19" 3019 \
    "DB_USER=$PG_USER" "DB_NAME=practice19"
}

start_practice_20() {
  hdr "Практика 20 — MongoDB CRUD API  →  :3020"
  start_mongodb || return 1
  node_start "pr20" "$BASE/practice_20" 3020
}

start_practice_21() {
  hdr "Практика 21 — PostgreSQL + Redis + RBAC  →  :3021"
  start_postgres || return 1
  start_redis    || return 1
  pg_create_db "phonestore"
  node_start "pr21" "$BASE/practice_21" 3021 \
    "DB_USER=$PG_USER" "DB_NAME=phonestore"
}

start_practice_22() {
  hdr "Практика 22 — Балансировка нагрузки  →  :8022  (backends :3022/:3023/:3024)"
  start_postgres || return 1
  start_redis    || return 1
  pg_create_db "phonestore"

  local bdir="$BASE/practice_22/backend"
  [ ! -d "$bdir/node_modules" ] && info "pr22: npm install..." && \
    (cd "$bdir" && npm install --silent 2>/dev/null)

  for i in 1 2 3; do
    local port=$((3021 + i))   # 3022, 3023, 3024
    kill_port "$port"
    env PORT="$port" SERVER_ID="$i" DB_USER="$PG_USER" DB_NAME="phonestore" \
      node "$bdir/server.js" >> "$LOG_DIR/pr22_b${i}.log" 2>&1 &
    local pid=$!
    sleep 1
    if is_running "$pid"; then
      save_pid "pr22_b${i}" "$pid"
      ok "pr22 backend-${i}  →  http://localhost:$port  (PID $pid)"
    else
      fail "pr22 backend-${i} не запустился — см. logs/pr22_b${i}.log"
      tail -3 "$LOG_DIR/pr22_b${i}.log" 2>/dev/null | sed 's/^/         /'
    fi
  done

  if has nginx; then
    local pid_file="/tmp/ps_nginx22.pid"
    kill_port 8022
    nginx -c "$BASE/practice_22/nginx.conf" \
          -g "pid $pid_file; daemon on;" 2>/dev/null \
      && ok "pr22 Nginx  →  http://localhost:8022" \
      || warn "Nginx не запустился (нужны права или занят порт 8022)"
  else
    warn "nginx не установлен — backends доступны напрямую: :3022 :3023 :3024"
  fi
}

start_practice_23() {
  hdr "Практика 23 — Docker Compose  →  :8023"
  if ! has docker; then
    fail "Docker не установлен"; return 1
  fi
  if ! docker info &>/dev/null; then
    fail "Docker не запущен — запустите Docker Desktop"; return 1
  fi

  info "Сборка и запуск контейнеров..."
  (cd "$BASE/practice_23" && docker compose up --build -d 2>&1) | \
    grep -E 'Creating|Started|Running|done|error|warning' || true
  ok "pr23 Docker Compose  →  http://localhost:8023"
}

# ── Меню выбора конкретной практики ───────────────────────────────────────────
menu_single() {
  while true; do
    echo -e "\n${B}┌──────────────────────────────────────────┐${NC}"
    echo -e "${B}│${NC}       Выберите практику                  ${B}│${NC}"
    echo -e "${B}├──────────────────────────────────────────┤${NC}"
    echo -e "${B}│${NC}  ${W}1)${NC} Практика 19 — PostgreSQL CRUD        ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}2)${NC} Практика 20 — MongoDB CRUD           ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}3)${NC} Практика 21 — PostgreSQL + Redis      ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}4)${NC} Практика 22 — Балансировка нагрузки  ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}5)${NC} Практика 23 — Docker Compose         ${B}│${NC}"
    echo -e "${B}│${NC}  ${W}0)${NC} Назад                                ${B}│${NC}"
    echo -e "${B}└──────────────────────────────────────────┘${NC}"
    printf "  Ваш выбор: "; read -r ch
    case "$ch" in
      1) start_practice_19 ;;
      2) start_practice_20 ;;
      3) start_practice_21 ;;
      4) start_practice_22 ;;
      5) start_practice_23 ;;
      0) return ;;
      *) warn "Неверный выбор" ;;
    esac
  done
}

# ── Запуск всех практик ───────────────────────────────────────────────────────
start_all() {
  hdr "═══ Запуск всех практик ═══"
  start_practice_19
  start_practice_20
  start_practice_21
  start_practice_22
  start_practice_23

  echo -e "\n${G}═══════════════════════════════════════════${NC}"
  echo -e " ${W}Все практики запущены:${NC}"
  echo -e "   practice_19  →  http://localhost:3019"
  echo -e "   practice_20  →  http://localhost:3020"
  echo -e "   practice_21  →  http://localhost:3021"
  echo -e "   practice_22  →  http://localhost:8022  (Nginx)"
  echo -e "   practice_23  →  http://localhost:8023  (Docker)"
  echo -e "${G}═══════════════════════════════════════════${NC}\n"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ОСТАНОВКА
# ═══════════════════════════════════════════════════════════════════════════════

stop_all() {
  hdr "═══ Остановка практик ═══"

  # Node-процессы из PID-файла
  if [ -f "$PIDS_FILE" ]; then
    while IFS='=' read -r label pid; do
      [ -z "${pid:-}" ] && continue
      if is_running "$pid"; then
        kill "$pid" 2>/dev/null && ok "Остановлен $label (PID $pid)"
      fi
    done < "$PIDS_FILE"
    clear_pids
  fi

  # Принудительно зачистить порты практик
  for port in 3019 3020 3021 3022 3023 3024; do
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null && info "Освобождён порт $port"
  done

  # Nginx practice_22
  if [ -f /tmp/ps_nginx22.pid ]; then
    local npid
    npid=$(cat /tmp/ps_nginx22.pid)
    kill "$npid" 2>/dev/null && ok "Nginx practice_22 остановлен"
    rm -f /tmp/ps_nginx22.pid
  fi

  # Docker Compose practice_23
  if has docker && [ -f "$BASE/practice_23/docker-compose.yml" ]; then
    (cd "$BASE/practice_23" && docker compose down 2>/dev/null) \
      && ok "Docker Compose practice_23 остановлен" || true
  fi

  ok "Готово"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  СТАТУС
# ═══════════════════════════════════════════════════════════════════════════════

show_status() {
  hdr "═══ Статус практик ═══"
  printf "  %-14s %-6s %-7s  %s\n" "Практика" "Порт" "PID" "Статус"
  echo "  ────────────────────────────────────────"

  status_row() {
    local label="$1" port="$2" pid_key="$3"
    local pid state
    pid=$(load_pid "$pid_key")
    if is_running "$pid"; then
      state="${G}запущен${NC}"
    elif port_open "$port"; then
      state="${G}доступен${NC}"
    else
      state="${R}остановлен${NC}"
      pid="-"
    fi
    printf "  %-14s %-6s %-7s  " "$label" "$port" "${pid:--}"
    echo -e "$state"
  }

  status_row "practice_19"   3019  "pr19"
  status_row "practice_20"   3020  "pr20"
  status_row "practice_21"   3021  "pr21"
  status_row "pr22 backend1" 3022  "pr22_b1"
  status_row "pr22 backend2" 3023  "pr22_b2"
  status_row "pr22 backend3" 3024  "pr22_b3"
  status_row "pr22 nginx"    8022  "pr22_nginx"

  # practice_23 через Docker
  printf "  %-14s %-6s %-7s  " "practice_23" "8023" "docker"
  if has docker && docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'practice.23'; then
    echo -e "${G}запущен${NC}"
  else
    echo -e "${R}остановлен${NC}"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ГЛАВНОЕ МЕНЮ
# ═══════════════════════════════════════════════════════════════════════════════

main_menu() {
  while true; do
    echo -e "\n${B}╔════════════════════════════════════════╗${NC}"
    echo -e "${B}║${NC}  ${W}PhoneStore — управление практиками${NC}   ${B}║${NC}"
    echo -e "${B}╠════════════════════════════════════════╣${NC}"
    echo -e "${B}║${NC}  ${W}1)${NC} Запустить базу данных             ${B}║${NC}"
    echo -e "${B}║${NC}  ${W}2)${NC} Запустить все практики            ${B}║${NC}"
    echo -e "${B}║${NC}  ${W}3)${NC} Запустить отдельную практику      ${B}║${NC}"
    echo -e "${B}║${NC}  ${W}4)${NC} Остановить все практики           ${B}║${NC}"
    echo -e "${B}║${NC}  ${W}5)${NC} Статус практик                    ${B}║${NC}"
    echo -e "${B}║${NC}  ${W}0)${NC} Выход                             ${B}║${NC}"
    echo -e "${B}╚════════════════════════════════════════╝${NC}"
    printf "  Ваш выбор: "; read -r choice
    case "$choice" in
      1) menu_db     ;;
      2) start_all   ;;
      3) menu_single ;;
      4) stop_all    ;;
      5) show_status ;;
      0) echo -e "\n${G}Выход.${NC}\n"; exit 0 ;;
      *) warn "Неверный выбор" ;;
    esac
  done
}

# ── CLI-режим (без меню) ──────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
case "${1:-menu}" in
  db)     menu_db     ;;
  all)    start_all   ;;
  19)     start_practice_19 ;;
  20)     start_practice_20 ;;
  21)     start_practice_21 ;;
  22)     start_practice_22 ;;
  23)     start_practice_23 ;;
  stop)   stop_all    ;;
  status) show_status ;;
  menu)   main_menu   ;;
  *)
    echo "Использование: $0 [menu|db|all|19|20|21|22|23|stop|status]"
    exit 1
    ;;
esac

FROM node:18-alpine

WORKDIR /app

# Копируем манифест зависимостей отдельно — Docker кэширует этот слой
# и не переустанавливает пакеты при изменении только кода
COPY package*.json ./
RUN npm install

# Копируем остальной код приложения
COPY . .

EXPOSE 3000

CMD ["npm", "start"]

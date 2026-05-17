const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_ID = process.env.SERVER_ID || 'unknown';

app.get('/', (req, res) => {
  res.json({
    server: `backend-${SERVER_ID}`,
    message: 'Response from backend server',
    port: PORT,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: `backend-${SERVER_ID}` });
});

// Слушаем на 0.0.0.0 — обязательно для работы внутри Docker-контейнера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server-${SERVER_ID} running on port ${PORT}`);
});

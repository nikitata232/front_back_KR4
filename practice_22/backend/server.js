const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_ID = process.env.SERVER_ID || 'unknown';

app.get('/', (req, res) => {
  res.json({
    message: 'Response from backend server',
    server: `backend-${SERVER_ID}`,
    port: PORT,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: `backend-${SERVER_ID}` });
});

app.listen(PORT, () => {
  console.log(`Backend server-${SERVER_ID} started on port ${PORT}`);
});

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 s — fails fast instead of hanging forever
});

export default api;

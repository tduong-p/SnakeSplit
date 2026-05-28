import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Normalize errors so every catch block gets a useful message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||   // backend JSON error
      err.response?.data?.message || // alternate backend format
      (err.code === 'ECONNABORTED' ? 'Request timed out — check your MongoDB connection' : null) ||
      err.message ||                  // network error, etc.
      'Unknown error';
    err.displayMessage = message;
    return Promise.reject(err);
  }
);

export default api;

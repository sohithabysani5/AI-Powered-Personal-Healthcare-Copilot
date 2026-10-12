import axios from 'axios';

const apiHost = import.meta.env.VITE_API_HOST;
const API_BASE_URL = import.meta.env.VITE_API_URL
  || (apiHost
    ? `${apiHost.startsWith('http') ? apiHost : `https://${apiHost}`}`.replace(/\/+$/, '') + '/api/v1'
    : 'http://127.0.0.1:8000/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

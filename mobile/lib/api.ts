import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:3001/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('token', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('token');
}

export async function getToken() {
  return SecureStore.getItemAsync('token');
}

export default api;

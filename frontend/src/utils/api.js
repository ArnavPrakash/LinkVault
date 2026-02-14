import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Upload text or file
 * @param {FormData} formData - Form data with text or file
 * @returns {Promise} API response
 */
export const uploadPaste = async (formData) => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get paste by ID
 * @param {string} id - Paste ID
 * @param {string} password - Optional password
 * @returns {Promise} API response
 */
export const getPaste = async (id, password = null) => {
  const params = password ? { password } : {};
  const response = await api.get(`/paste/${id}`, { params });
  return response.data;
};

/**
 * Delete paste by ID
 * @param {string} id - Paste ID
 * @param {string} password - Optional password
 * @returns {Promise} API response
 */
export const deletePaste = async (id, password = null) => {
  const params = password ? { password } : {};
  const response = await api.delete(`/paste/${id}`, { params });
  return response.data;
};

/**
 * Get database stats
 * @returns {Promise} API response
 */
export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

export default api;

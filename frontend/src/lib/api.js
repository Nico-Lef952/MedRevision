import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Store token in memory as fallback when cookies don't work
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

// Add auth header interceptor
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Helper to format error messages
export function formatApiError(error) {
  const detail = error?.response?.data?.detail;
  if (detail == null) return "Une erreur s'est produite. Veuillez réessayer.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// Subjects API
export const subjectsApi = {
  getAll: () => api.get(`/api/subjects`),
  get: (id) => api.get(`/api/subjects/${id}`),
  create: (data) => api.post(`/api/subjects`, data),
  update: (id, data) => api.put(`/api/subjects/${id}`, data),
  delete: (id) => api.delete(`/api/subjects/${id}`)
};

// Courses API
export const coursesApi = {
  getAll: (params) => api.get(`/api/courses`, { params }),
  get: (id) => api.get(`/api/courses/${id}`),
  create: (data) => api.post(`/api/courses`, data),
  update: (id, data) => api.put(`/api/courses/${id}`, data),
  delete: (id) => api.delete(`/api/courses/${id}`),
  upload: (formData, subjectId) => api.post(
    `/api/courses/upload?subject_id=${subjectId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
  regenerateQuestions: (id) => api.post(`/api/courses/${id}/regenerate-questions`),
  getFileUrl: (id) => `${API_URL}/api/courses/${id}/file`,
  getFileHtml: (id) => api.get(`/api/courses/${id}/file/html`, { responseType: 'text' })
};

// Questions API
export const questionsApi = {
  getAll: (params) => api.get(`/api/questions`, { params })
};

// Quiz API
export const quizApi = {
  start: (data) => api.post(`/api/quiz/start`, data),
  answer: (sessionId, data) => api.post(`/api/quiz/${sessionId}/answer`, data),
  complete: (sessionId) => api.post(`/api/quiz/${sessionId}/complete`)
};

// Flashcards API
export const flashcardsApi = {
  getAll: (params) => api.get(`/api/flashcards`, { params }),
  getDue: () => api.get(`/api/flashcards/due`),
  review: (cardId, data) => api.post(`/api/flashcards/${cardId}/review`, data)
};

// Stats API
export const statsApi = {
  overview: () => api.get(`/api/stats/overview`),
  bySubject: () => api.get(`/api/stats/by-subject`),
  weakConcepts: () => api.get(`/api/stats/weak-concepts`)
};

// Dashboard API
export const dashboardApi = {
  get: () => api.get(`/api/dashboard`)
};

// Knowledge Graph API
export const knowledgeGraphApi = {
  get: () => api.get(`/api/knowledge-graph`)
};

// Auth API (for direct use)
export const authApi = {
  login: (data) => api.post(`/api/auth/login`, data),
  register: (data) => api.post(`/api/auth/register`, data),
  logout: () => api.post(`/api/auth/logout`),
  me: () => api.get(`/api/auth/me`),
  refresh: () => api.post(`/api/auth/refresh`)
};

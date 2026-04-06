import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configure axios
axios.defaults.withCredentials = true;

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
  getAll: () => axios.get(`${API_URL}/api/subjects`),
  get: (id) => axios.get(`${API_URL}/api/subjects/${id}`),
  create: (data) => axios.post(`${API_URL}/api/subjects`, data),
  update: (id, data) => axios.put(`${API_URL}/api/subjects/${id}`, data),
  delete: (id) => axios.delete(`${API_URL}/api/subjects/${id}`)
};

// Courses API
export const coursesApi = {
  getAll: (params) => axios.get(`${API_URL}/api/courses`, { params }),
  get: (id) => axios.get(`${API_URL}/api/courses/${id}`),
  create: (data) => axios.post(`${API_URL}/api/courses`, data),
  update: (id, data) => axios.put(`${API_URL}/api/courses/${id}`, data),
  delete: (id) => axios.delete(`${API_URL}/api/courses/${id}`),
  upload: (formData, subjectId) => axios.post(
    `${API_URL}/api/courses/upload?subject_id=${subjectId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
  regenerateQuestions: (id) => axios.post(`${API_URL}/api/courses/${id}/regenerate-questions`)
};

// Questions API
export const questionsApi = {
  getAll: (params) => axios.get(`${API_URL}/api/questions`, { params })
};

// Quiz API
export const quizApi = {
  start: (data) => axios.post(`${API_URL}/api/quiz/start`, data),
  answer: (sessionId, data) => axios.post(`${API_URL}/api/quiz/${sessionId}/answer`, data),
  complete: (sessionId) => axios.post(`${API_URL}/api/quiz/${sessionId}/complete`)
};

// Flashcards API
export const flashcardsApi = {
  getAll: (params) => axios.get(`${API_URL}/api/flashcards`, { params }),
  getDue: () => axios.get(`${API_URL}/api/flashcards/due`),
  review: (cardId, data) => axios.post(`${API_URL}/api/flashcards/${cardId}/review`, data)
};

// Stats API
export const statsApi = {
  overview: () => axios.get(`${API_URL}/api/stats/overview`),
  bySubject: () => axios.get(`${API_URL}/api/stats/by-subject`),
  weakConcepts: () => axios.get(`${API_URL}/api/stats/weak-concepts`)
};

// Dashboard API
export const dashboardApi = {
  get: () => axios.get(`${API_URL}/api/dashboard`)
};

// Knowledge Graph API
export const knowledgeGraphApi = {
  get: () => axios.get(`${API_URL}/api/knowledge-graph`)
};

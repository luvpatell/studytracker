/**
 * StudyTrack Frontend API Client
 */

const API = {
  TOKEN_KEY: 'studytrack_token',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
          this.setToken(null);
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  auth: {
    register: (userData) => API.request('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (creds) => API.request('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
    logout: () => API.request('/api/auth/logout', { method: 'POST' }),
    me: () => API.request('/api/auth/me'),
    updateProfile: (data) => API.request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => API.request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (email) => API.request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (data) => API.request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(data) })
  },

  // Subjects & Syllabus
  subjects: {
    getAll: () => API.request('/api/subjects'),
    getOne: (id) => API.request(`/api/subjects/${id}`),
    create: (data) => API.request('/api/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => API.request(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => API.request(`/api/subjects/${id}`, { method: 'DELETE' }),
    addUnit: (subjectId, data) => API.request(`/api/subjects/${subjectId}/units`, { method: 'POST', body: JSON.stringify(data) }),
    deleteUnit: (unitId) => API.request(`/api/subjects/units/${unitId}`, { method: 'DELETE' }),
    addTopics: (unitId, data) => API.request(`/api/subjects/units/${unitId}/topics`, { method: 'POST', body: JSON.stringify(data) }),
    updateTopicStatus: (topicId, status) => API.request(`/api/subjects/topics/${topicId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    deleteTopic: (topicId) => API.request(`/api/subjects/topics/${topicId}`, { method: 'DELETE' }),
    seedSample: () => API.request('/api/subjects/seed-sample', { method: 'POST' })
  },

  // Daily Study Tracking
  studyLogs: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/study-logs${query ? '?' + query : ''}`);
    },
    create: (data) => API.request('/api/study-logs', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => API.request(`/api/study-logs/${id}`, { method: 'DELETE' })
  },

  // Question Papers
  papers: {
    getAll: () => API.request('/api/papers'),
    getOne: (id) => API.request(`/api/papers/${id}`),
    generate: (data) => API.request('/api/papers/generate', { method: 'POST', body: JSON.stringify(data) }),
    regenerate: (id) => API.request(`/api/papers/regenerate/${id}`, { method: 'POST' }),
    delete: (id) => API.request(`/api/papers/${id}`, { method: 'DELETE' })
  },

  // Tests & Results
  tests: {
    getAll: () => API.request('/api/tests'),
    getOne: (id) => API.request(`/api/tests/${id}`),
    record: (data) => API.request('/api/tests', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => API.request(`/api/tests/${id}`, { method: 'DELETE' })
  },

  // Revision System
  revision: {
    getAll: (status = 'active') => API.request(`/api/revision?status=${status}`),
    add: (data) => API.request('/api/revision', { method: 'POST', body: JSON.stringify(data) }),
    resolve: (id) => API.request(`/api/revision/${id}/resolve`, { method: 'PATCH' }),
    delete: (id) => API.request(`/api/revision/${id}`, { method: 'DELETE' }),
    generatePaper: (data) => API.request('/api/revision/generate-paper', { method: 'POST', body: JSON.stringify(data) })
  },

  // Analytics & Dashboard
  analytics: {
    getDashboard: () => API.request('/api/analytics/dashboard'),
    getWeeklyReview: () => API.request('/api/analytics/weekly-review'),
    getCharts: () => API.request('/api/analytics/charts')
  }
};

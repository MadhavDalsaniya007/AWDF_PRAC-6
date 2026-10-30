const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const AUTH_EVENT = 'auth:unauthorized';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore non-JSON errors
    }
    throw new Error(message);
  }
  return res.json();
}

export const register = (email, password) =>
  fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

export const login = (email, password) =>
  fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handleResponse);

export const getMe = () =>
  fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const getTasks = () =>
  fetch(`${BASE_URL}/tasks`, {
    headers: getAuthHeaders(),
  }).then(handleResponse);

export const createTask = (task) =>
  fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(task),
  }).then(handleResponse);

export const updateTask = (id, updates) =>
  fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  }).then(handleResponse);

export const deleteTask = (id) =>
  fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  }).then(handleResponse);

/**
 * Practical 13: AI API Integration
 * Securely calls Express backend /api/ai/generate-description
 * Never calls OpenAI/Gemini directly from browser to protect API keys.
 */
export const generateAiDescription = async (title) => {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/generate-description`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    });

    const data = await res.json();

    if (!res.ok && res.status !== 429) {
      return {
        description: '',
        fallback: true,
        message: data?.message || `AI request failed with status ${res.status}`,
      };
    }

    return data;
  } catch (err) {
    return {
      description: '',
      fallback: true,
      message: err.message || 'AI service unavailable',
    };
  }
};

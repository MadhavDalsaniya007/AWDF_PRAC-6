// Central API client for the Task Manager backend (Practicals 4 & 5)
// Mirrors the pattern used in pages/Projects.jsx from Practical 3,
// but points at our own Express + MongoDB backend instead of the GitHub API.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function isAuthenticated() {
  return Boolean(getToken())
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch (err) {
    // Network-level failure: backend not running, wrong port, CORS block, etc.
    throw new Error(
      'Could not reach the server. Is the backend running on ' + BASE_URL + '?',
      { cause: err },
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      data.message ||
      data.errors?.[0]?.msg ||
      data.errors?.[0]?.message ||
      `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

// ---- Tasks (Practical 4/5 CRUD endpoints) ----
export const getTasks = () => request('/tasks')
export const getTask = (id) => request(`/tasks/${id}`)
export const createTask = (task) =>
  request('/tasks', { method: 'POST', body: JSON.stringify(task) })
export const updateTask = (id, updates) =>
  request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' })

// ---- Auth (needed because POST/PUT /tasks are protected by auth middleware) ----
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const register = (email, password) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })

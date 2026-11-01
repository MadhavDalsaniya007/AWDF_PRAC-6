import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfirmDialog from '../components/ConfirmDialog'
import Toast from '../components/Toast'
import AuthGate from '../components/AuthGate'
import { getTasks, createTask, updateTask, deleteTask, isAuthenticated, setToken } from '../api'

function Tasks() {
  // ---- read state (initial GET /tasks) ----
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ---- write state (separate from read state, per-operation) ----
  const [creating, setCreating] = useState(false)
  const [writeError, setWriteError] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // ---- auth ----
  const [authed, setAuthed] = useState(isAuthenticated())

  // ---- misc UI ----
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' })

  const showToast = (type, message) => setToast({ type, message })

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (err) {
      setError(err.message || 'Something went wrong while fetching tasks.')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadTasks = async () => {
      await fetchTasks()
    }

    loadTasks()
  }, [])

  // ---- create (optimistic UI) ----
  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return

    setCreating(true)
    setWriteError(null)

    // Optimistic entry shown immediately, replaced/removed once the server responds
    const tempId = `temp-${Date.now()}`
    const optimisticTask = { _id: tempId, ...form, completed: false, optimistic: true }
    setTasks((prev) => [optimisticTask, ...prev])

    try {
      const { task } = await createTask(form)
      setTasks((prev) => prev.map((t) => (t._id === tempId ? task : t)))
      setForm({ title: '', description: '', priority: 'medium' })
      showToast('success', 'Task created.')
    } catch (err) {
      // Roll back the optimistic entry on failure
      setTasks((prev) => prev.filter((t) => t._id !== tempId))
      setWriteError(err.message || 'Failed to create task.')
      showToast('error', err.message || 'Failed to create task.')
    } finally {
      setCreating(false)
    }
  }

  // ---- toggle complete (PUT) ----
  const handleToggleComplete = async (task) => {
    const previous = tasks
    setTasks((prev) =>
      prev.map((t) => (t._id === task._id ? { ...t, completed: !t.completed } : t))
    )
    try {
      await updateTask(task._id, { completed: !task.completed })
      showToast('success', 'Task updated.')
    } catch (err) {
      setTasks(previous) // rollback
      showToast('error', err.message || 'Failed to update task.')
    }
  }

  // ---- edit title/description (PUT) ----
  const handleSaveEdit = async (id, updates) => {
    try {
      const { task } = await updateTask(id, updates)
      setTasks((prev) => prev.map((t) => (t._id === id ? task : t)))
      setEditingId(null)
      showToast('success', 'Task updated.')
    } catch (err) {
      showToast('error', err.message || 'Failed to update task.')
    }
  }

  // ---- delete (with confirmation dialog) ----
  const handleConfirmDelete = async () => {
    const id = pendingDeleteId
    setPendingDeleteId(null)
    const previous = tasks
    setTasks((prev) => prev.filter((t) => t._id !== id))
    try {
      await deleteTask(id)
      showToast('success', 'Task deleted.')
    } catch (err) {
      setTasks(previous) // rollback
      showToast('error', err.message || 'Failed to delete task.')
    }
  }

  return (
    <section className="section">
      <div className="section-heading">
        <p className="section-label">Tasks</p>
        <h2>Task Manager</h2>
        <p>Live data from our own Express + MongoDB backend (Practicals 4 &amp; 5).</p>
      </div>

      {!authed && <AuthGate onAuthenticated={() => setAuthed(true)} />}

      {authed && (
        <form className="task-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="cta-button" disabled={creating}>
            {creating ? 'Adding…' : 'Add task'}
          </button>
          {writeError && <p className="auth-error">{writeError}</p>}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setToken(null)
              setAuthed(false)
            }}
          >
            Log out
          </button>
        </form>
      )}

      {loading && <LoadingSpinner message="Loading tasks..." />}
      {error && !loading && <ErrorMessage message={error} onRetry={fetchTasks} />}

      {!loading && !error && (
        <div className="repo-list">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                editing={editingId === task._id}
                onEdit={() => setEditingId(task._id)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={(updates) => handleSaveEdit(task._id, updates)}
                onToggleComplete={() => handleToggleComplete(task)}
                onDelete={() => setPendingDeleteId(task._id)}
                canWrite={authed}
              />
            ))
          ) : (
            <div className="empty-state">
              <h3>No tasks yet.</h3>
              <p>{authed ? 'Add your first task above.' : 'Log in to add a task.'}</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete this task?"
        message="This action can't be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  )
}

function TaskCard({
  task,
  editing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleComplete,
  onDelete,
  canWrite,
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)

  if (editing) {
    return (
      <article className="project-card">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="modal-actions">
          <button
            type="button"
            className="cta-button"
            onClick={() => onSaveEdit({ title, description })}
          >
            Save
          </button>
          <button type="button" className="cta-button secondary" onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      </article>
    )
  }

  return (
    <article className={`project-card ${task.optimistic ? 'is-optimistic' : ''}`}>
      <div className="repo-meta">
        <h3 style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
          {task.title}
        </h3>
        <span>{task.priority}</span>
      </div>
      <p>{task.description || 'No description provided.'}</p>
      <div className="modal-actions">
        <button type="button" className="cta-button secondary" onClick={onToggleComplete}>
          {task.completed ? 'Mark incomplete' : 'Mark complete'}
        </button>
        {canWrite && (
          <button type="button" className="cta-button secondary" onClick={onEdit}>
            Edit
          </button>
        )}
        <button type="button" className="cta-button danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  )
}

export default Tasks

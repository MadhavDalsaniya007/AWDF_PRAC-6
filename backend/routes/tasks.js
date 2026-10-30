const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { validateTask } = require('../middleware/validate');
const { cache, stats } = require('../cache');
// Practical 10 – import shared EventEmitter singleton
const taskEvents = require('../events');

// Protect all task routes with JWT auth middleware
router.use(auth);

// GET /tasks/cache/stats - inspect cache lookups
router.get('/cache/stats', (req, res) => {
  res.status(200).json({ ...stats, keys: cache.keys().length, ttlSeconds: 60 });
});

// GET /tasks - fetch all tasks
router.get('/', async (req, res) => {
  try {
    if (req.query.cache === 'false') {
      const tasks = await Task.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json(tasks);
    }

    if (cache.has('all_tasks')) {
      stats.hits += 1;
      return res.status(200).json(cache.get('all_tasks'));
    }

    stats.misses += 1;
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();
    cache.set('all_tasks', tasks);
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
});

// POST /tasks - create a task
// Practical 10: emit 'task-created' AFTER res.json() so the API responds
// immediately and the notification handler runs asynchronously.
router.post('/', validateTask, async (req, res) => {
  try {
    const { title, description } = req.body;
    const task = await Task.create({ title, description });
    cache.del('all_tasks');

    // ── Practical 10 Step 3 ───────────────────────────────────────────────
    // Log the API response timestamp FIRST, then send the response,
    // THEN emit the event.  The listener will log its own (later) timestamp.
    console.log(`[API] Task created – response sent at ${new Date().toISOString()}`);
    res.status(201).json(task);

    // emit() is called after res.json() – the client already has the 201.
    // The listener runs asynchronously (via setTimeout inside listeners.js)
    // which proves the response is never blocked by notification logic.
    taskEvents.emit('task-created', task);
    // ─────────────────────────────────────────────────────────────────────
  } catch (err) {
    res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
});

// PUT /tasks/:id - update a task
router.put('/:id', async (req, res) => {
  try {
    const taskCacheKey = `task:${req.params.id}`;
    const { title, description, completed } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, completed },
      { new: true, runValidators: true }
    ).lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    cache.del(['all_tasks', taskCacheKey]);
    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
});

// GET /tasks/:id - fetch one task
router.get('/:id', async (req, res) => {
  try {
    const taskCacheKey = `task:${req.params.id}`;
    if (cache.has(taskCacheKey)) {
      stats.hits += 1;
      return res.status(200).json(cache.get(taskCacheKey));
    }

    stats.misses += 1;
    const task = await Task.findById(req.params.id).lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    cache.set(taskCacheKey, task);
    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch task', error: err.message });
  }
});

// DELETE /tasks/:id - delete a task
// Practical 10: emit 'task-deleted' after responding.
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    cache.del(['all_tasks', `task:${req.params.id}`]);

    // Respond first, then emit – mirrors the same pattern as task-created
    console.log(`[API] Task deleted – response sent at ${new Date().toISOString()}`);
    res.status(200).json({ message: 'Task deleted', id: req.params.id });

    // Practical 10 supplementary: task-deleted event
    taskEvents.emit('task-deleted', task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
});

module.exports = router;

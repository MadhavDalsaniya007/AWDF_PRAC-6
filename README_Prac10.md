# Practical 10 – Asynchronous Processing with Event-Driven Architecture

**CO/PO:** CO4 / PO3, PO5  
**Module:** Node.js built-in `EventEmitter` (no external dependencies)

---

## Objective

Add a background notification system to the existing Task Management application using Node.js's built-in `events` module.  
When a new task is **created** or **deleted** via the REST API, an event is emitted and handled asynchronously — without blocking the HTTP response.

---

## Architecture

```
POST /tasks  ──► Save task to MongoDB
                 │
                 ├── console.log([API] response timestamp)
                 ├── res.status(201).json(task)   ← client gets 201 HERE
                 │
                 └── taskEvents.emit('task-created', task)
                           │
                           ▼  (asynchronously, after response is sent)
                     Notification Listener (listeners.js)
                     └── logs: task title · task ID · timestamp
                                (with 2-second artificial delay)
```

---

## Files Changed

### 🆕 New Files

| File | Purpose |
|------|---------|
| `backend/events.js` | Defines `TaskEvents` class (extends `EventEmitter`) and exports a singleton |
| `backend/listeners.js` | Registers all event listeners: `task-created`, `task-deleted`, `error` |

### ✏️ Edited Files

| File | What changed |
|------|-------------|
| `backend/server.js` | Added `require('./listeners')` at startup to register listeners before any route runs |
| `backend/routes/tasks.js` | POST route: emits `task-created` **after** `res.json()`; DELETE route: emits `task-deleted` **after** `res.json()`; imports `taskEvents` |

---

## Step-by-Step Implementation

### Step 1 – `events.js` (EventEmitter singleton)

```js
const EventEmitter = require('events');
class TaskEvents extends EventEmitter {}
module.exports = new TaskEvents();
```

### Step 2 – `listeners.js` (register listeners)

```js
const taskEvents = require('./events');

// task-created: logs title, ID, timestamp (2-sec artificial delay)
taskEvents.on('task-created', (task) => {
  setTimeout(() => {
    setTimeout(() => {
      console.log(`[Notification] Task "${task.title}" created at ${new Date().toISOString()}`);
    }, 2000);
  }, 0);
});

// task-deleted (supplementary)
taskEvents.on('task-deleted', (task) => { ... });

// error (supplementary – prevents Node crash on unhandled error event)
taskEvents.on('error', (err) => { ... });
```

### Step 3 – POST route emits after response

```js
console.log(`[API] Task created – response sent at ${new Date().toISOString()}`);
res.status(201).json(task);          // ← client gets this instantly
taskEvents.emit('task-created', task); // ← notification fires after
```

### Step 4 – Register listeners at startup (`server.js`)

```js
require('./listeners'); // side-effect: all .on() calls execute
```

---

## Console Log Evidence (Expected Output)

```
[API] Task created – response sent at 2026-10-27T04:50:00.000Z
─────────────────────────────────────────────────────────────
[Notification] ✉  task-created event received
  Title       : "My New Task"
  Task ID     : 67...abc
  Handler ran : 2026-10-27T04:50:02.004Z   ← ~2 seconds later
─────────────────────────────────────────────────────────────
```

The `[API]` line appears **before** the `[Notification]` line, proving the response was never blocked.

---

## Key Concepts

| Question | Answer |
|----------|--------|
| Why doesn't `emit()` block the response? | `emit()` is synchronous, but placing it **after** `res.json()` means the response is already flushed. The listener uses `setTimeout(fn, 0)` to defer execution to the next event-loop tick. |
| What if notification logic were inside the route directly? | It would run synchronously before the response, increasing latency for every client. |
| Why use `EventEmitter` at this scale, not RabbitMQ? | `EventEmitter` is in-process, zero-dependency, and sufficient for a single-server app. For distributed systems or millions of events/day, a message queue is needed for persistence, retries, and fan-out across services. |

---

## Supplementary Implementations

- ✅ `task-deleted` event with its own listener and distinct log message  
- ✅ `error` event listener to prevent Node.js crash on unhandled error events  
- ✅ 2-second `setTimeout` inside `task-created` listener to make async timing visible  

---

## Testing with Postman

1. `POST /tasks` with body `{ "title": "Hello", "description": "World" }` and JWT `Authorization: Bearer <token>`
2. Observe server console: `[API]` timestamp appears, client gets `201`, then ~2 s later `[Notification]` appears
3. `DELETE /tasks/:id` → observe `[API]` then `[Notification] 🗑  task-deleted`

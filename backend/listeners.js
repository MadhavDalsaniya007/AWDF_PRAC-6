// listeners.js
// Practical 10 – Asynchronous Processing with Event-Driven Architecture
//
// All event listeners are registered here and this file is required
// ONCE at server startup (server.js) so the .on() calls happen before
// any event is ever emitted.

const taskEvents = require('./events');

// ─────────────────────────────────────────────────────────────────────────────
// 1. task-created listener
//    Demonstrates non-blocking notification: the API has already responded
//    before this handler begins (or finishes) its work.
// ─────────────────────────────────────────────────────────────────────────────
taskEvents.on('task-created', (task) => {
  // Wrap the slow work inside setTimeout(0) so it is queued as a
  // macro-task on the event loop AFTER the current call-stack (and
  // therefore after res.json() has been called in the route handler).
  setTimeout(() => {
    // ── Simulate a slow notification (2-second artificial delay) ──────────
    // This proves the API responded instantly even though the handler
    // takes time.  Remove or reduce for production use.
    const start = Date.now();
    // Busy-wait substitute: use a real setTimeout to keep the event loop free
    setTimeout(() => {
      console.log('─'.repeat(60));
      console.log('[Notification] ✉  task-created event received');
      console.log(`  Title       : "${task.title}"`);
      console.log(`  Task ID     : ${task._id}`);
      console.log(`  Description : ${task.description || '(none)'}`);
      console.log(`  Completed   : ${task.completed}`);
      console.log(`  Handler ran : ${new Date().toISOString()}`);
      console.log('─'.repeat(60));
    }, 2000); // 2-second artificial delay to make async timing visible
  }, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. task-deleted listener  (Supplementary requirement)
//    Logs a distinct message when a task is removed.
// ─────────────────────────────────────────────────────────────────────────────
taskEvents.on('task-deleted', (task) => {
  setTimeout(() => {
    console.log('─'.repeat(60));
    console.log('[Notification] 🗑  task-deleted event received');
    console.log(`  Title    : "${task.title}"`);
    console.log(`  Task ID  : ${task._id}`);
    console.log(`  Deleted  : ${new Date().toISOString()}`);
    console.log('─'.repeat(60));
  }, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. error listener  (Supplementary requirement)
//    EventEmitter has a special rule: if an 'error' event is emitted and
//    no listener is registered, Node.js throws and crashes the process.
//    Registering this listener prevents that.
// ─────────────────────────────────────────────────────────────────────────────
taskEvents.on('error', (err) => {
  console.error('[TaskEvents] ⚠  Error event caught:', err.message || err);
});

console.log('[listeners.js] All task event listeners registered.');

// events.js
// Practical 10 – Asynchronous Processing with Event-Driven Architecture
//
// A single shared EventEmitter instance for the entire application.
// Using a class that extends EventEmitter lets us add task-specific
// methods in the future without touching the rest of the codebase.

const EventEmitter = require('events');

class TaskEvents extends EventEmitter {}

// Export a singleton so every module that requires this file
// gets the SAME emitter and listeners are registered once.
module.exports = new TaskEvents();

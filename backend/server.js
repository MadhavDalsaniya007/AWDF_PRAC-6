require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');

// Practical 10 – register all EventEmitter listeners BEFORE any route
// could possibly emit an event.  Requiring this file is enough; the
// .on() calls execute as a side-effect when the module is loaded.
require('./listeners');

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'test') {
    process.env.JWT_SECRET = 'ci-test-secret-key-12345';
  } else {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/taskdb';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Backend running', version: 'PR10' });
});

// --- MongoDB connection + server start ---
async function startServer() {
  let uri = MONGO_URI;
  try {
    console.log(`Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.warn('MongoDB connection failed:', err.message);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('In-memory MongoDB connected successfully at', uri);
    } catch {
      console.error('Could not connect to MongoDB. Please ensure MongoDB service is running.');
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;

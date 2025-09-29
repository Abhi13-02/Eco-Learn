// src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import uploadRoutes from './routes/uploads.js';
import teacherRoutes from './routes/teacher.js';
import blogRoutes from './routes/blogs.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/uploads', uploadRoutes);
app.use('/teacher', teacherRoutes);
app.use('/blogs', blogRoutes);

// Boot
const port = process.env.PORT || 4000;
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

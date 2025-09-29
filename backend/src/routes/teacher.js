// src/routes/teacher.js
import express from 'express';
import { connectDB } from '../lib/db.js';
import { Task, TaskSubmission } from '../models/tasks.js';

const router = express.Router();

// List latest submissions for tasks created by a teacher
router.get('/submissions', async (req, res) => {
  try {
    await connectDB();
    const teacherId = String(req.query.teacherId || '').trim();
    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });

    const tasks = await Task.find({ createdBy: teacherId }).select('_id title points').lean();
    const byId = new Map(tasks.map((t) => [String(t._id), t]));
    const taskIds = tasks.map((t) => t._id);

    if (taskIds.length === 0) return res.json({ items: [] });

    const subs = await TaskSubmission.find({ task: { $in: taskIds } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const items = subs.map((s) => {
      const task = byId.get(String(s.task));
      return {
        id: String(s._id),
        taskId: String(s.task),
        taskTitle: task?.title || 'Task',
        taskPoints: task?.points || 0,
        studentId: String(s.student),
        studentName: s.studentName || 'Student',
        studentGrade: s.studentGrade || null,
        status: s.status,
        feedback: s.feedback || '',
        awardedPoints: s.awardedPoints || 0,
        textResponse: s.textResponse || '',
        attachments: (s.attachments || []).map((a) => ({ kind: a.kind, url: a.url, name: a.name || null })),
        submittedAt: s.submittedAt || s.createdAt,
      };
    });

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;

// Summary of tasks with submission counts for a teacher
router.get('/tasks/summary', async (req, res) => {
  try {
    await connectDB();
    const teacherId = String(req.query.teacherId || '').trim();
    if (!teacherId) return res.status(400).json({ error: 'teacherId is required' });

    const tasks = await Task.find({ createdBy: teacherId }).select('_id title points createdAt').lean();
    const taskIds = tasks.map((t) => t._id);
    const counts = await TaskSubmission.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: { task: '$task', status: '$status' }, count: { $sum: 1 } } },
    ]);
    const byTask = new Map(tasks.map((t) => [String(t._id), { id: String(t._id), title: t.title, points: t.points, createdAt: t.createdAt, total: 0, pending: 0, accepted: 0, rejected: 0 }]));
    for (const row of counts) {
      const t = byTask.get(String(row._id.task));
      if (!t) continue;
      t[row._id.status] = row.count;
      t.total += row.count;
    }
    return res.json({ items: Array.from(byTask.values()) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});



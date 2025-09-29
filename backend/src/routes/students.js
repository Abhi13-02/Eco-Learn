// src/routes/students.js
import express from 'express';
import { connectDB } from '../lib/db.js';
import { TaskSubmission } from '../models/tasks.js';
import { PointTransaction, UserScore } from '../models/gamification.js';

const router = express.Router();

// Overview for student dashboard: task status counts and points timeline
router.get('/:studentId/overview', async (req, res) => {
  try {
    await connectDB();
    const studentId = String(req.params.studentId || '').trim();
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    // Task status counts
    const byStatus = await TaskSubmission.aggregate([
      { $match: { student: (await import('mongoose')).default.Types.ObjectId.createFromHexString(studentId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = { accepted: 0, pending: 0, rejected: 0 };
    for (const row of byStatus) {
      const key = String(row._id || 'pending');
      if (counts[key] !== undefined) counts[key] = row.count;
    }

    // Total points
    let totalPoints = 0;
    const scoreDoc = await UserScore.findOne({ user: studentId }).lean();
    if (scoreDoc) {
      totalPoints = scoreDoc.totalPoints || 0;
    } else {
      const sum = await PointTransaction.aggregate([
        { $match: { user: (await import('mongoose')).default.Types.ObjectId.createFromHexString(studentId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      totalPoints = Number(sum?.[0]?.total || 0);
    }

    // Points timeline (last 6 weeks)
    const now = new Date();
    const sixWeeksAgo = new Date(now.getTime() - 6 * 7 * 24 * 60 * 60 * 1000);
    const tx = await PointTransaction.find({ user: studentId, createdAt: { $gte: sixWeeksAgo } })
      .sort({ createdAt: 1 })
      .lean();

    const weekLabels = [];
    const weekPoints = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      let total = 0;
      for (const t of tx) {
        const ct = new Date(t.createdAt).getTime();
        if (ct >= start.getTime() && ct < end.getTime()) total += Number(t.amount || 0);
      }
      weekLabels.push(label);
      weekPoints.push(total);
    }

    return res.json({ counts, totalPoints, week: { labels: weekLabels, points: weekPoints } });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load student overview' });
  }
});

export default router;



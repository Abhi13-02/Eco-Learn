// src/controllers/studentController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Task } from '../models/tasks.js';
import { User } from '../models/users.js';
import { TaskSubmission } from '../models/tasks.js';

const { Types } = mongoose;

const normalizeId = (value) => {
  if (!value) return null;
  try {
    return new Types.ObjectId(String(value));
  } catch (error) {
    return null;
  }
};

const buildWeeklySeries = (submissions = []) => {
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    days.push({ key: d.toDateString(), label, points: 0 });
  }

  submissions.forEach((submission) => {
    const submittedAt = submission.submittedAt ? new Date(submission.submittedAt) : null;
    if (!submittedAt || Number.isNaN(submittedAt.getTime())) return;
    const diff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(submittedAt.setHours(0, 0, 0, 0))) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff > 6) return;
    const index = 6 - diff;
    if (index >= 0 && index < days.length) {
      days[index].points += submission.awardedPoints || 0;
    }
  });

  return {
    labels: days.map((d) => d.label),
    points: days.map((d) => d.points),
  };
};

export const getStudentOverview = async (req, res) => {
  try {
    await connectDB();

    const studentId = normalizeId(req.params?.studentId);
    if (!studentId) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const student = await User.findById(studentId).lean();
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const submissions = await TaskSubmission.find({ student: studentId }).lean();

    const counts = { accepted: 0, pending: 0, rejected: 0 };
    let totalPoints = 0;

    submissions.forEach((submission) => {
      if (counts[submission.status] !== undefined) counts[submission.status] += 1;
      if (submission.status === 'accepted') totalPoints += submission.awardedPoints || 0;
    });

    const week = buildWeeklySeries(submissions);

    return res.json({ counts, totalPoints, week });
  } catch (error) {
    console.error('Failed to build student overview:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch student overview' });
  }
};

export const listStudentSubmissions = async (req, res) => {
  try {
    await connectDB();

    const studentId = normalizeId(req.params?.studentId);
    if (!studentId) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const submissions = await TaskSubmission.find({ student: studentId })
      .sort({ submittedAt: -1 })
      .populate({ path: 'task', select: 'title points' })
      .lean();

    const results = submissions.map((submission) => ({
      id: String(submission._id),
      taskId: submission.task ? String(submission.task._id) : null,
      taskTitle: submission.task?.title || 'Task',
      taskPoints: submission.task?.points || 0,
      status: submission.status,
      textResponse: submission.textResponse || '',
      attachments: submission.attachments || [],
      feedback: submission.feedback || '',
      awardedPoints: submission.awardedPoints || 0,
      submittedAt: submission.submittedAt || submission.createdAt,
      reviewedAt: submission.reviewedAt || null,
    }));

    return res.json({ submissions: results });
  } catch (error) {
    console.error('Failed to list student submissions:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
};

export default {
  getStudentOverview,
  listStudentSubmissions,
};

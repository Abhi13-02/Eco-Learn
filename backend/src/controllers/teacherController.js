// src/controllers/teacherController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Task, TaskSubmission } from '../models/tasks.js';
import { User } from '../models/users.js';

const { Types } = mongoose;

const normalizeId = (value) => {
  if (!value) return null;
  try {
    return new Types.ObjectId(String(value));
  } catch (error) {
    return null;
  }
};

export const getTeacherSubmissions = async (req, res) => {
  try {
    await connectDB();

    const teacherId = normalizeId(req.query?.teacherId);
    if (!teacherId) {
      return res.status(400).json({ error: 'Invalid teacher id' });
    }

    const tasks = await Task.find({ createdBy: teacherId }).select('title points').lean();
    if (tasks.length === 0) {
      return res.json({ items: [] });
    }

    const taskMap = new Map(tasks.map((task) => [String(task._id), task]));
    const taskIds = Array.from(taskMap.keys()).map((id) => new Types.ObjectId(id));

    const submissions = await TaskSubmission.find({ task: { $in: taskIds } })
      .sort({ submittedAt: -1 })
      .populate({ path: 'student', select: 'name student.grade' })
      .lean();

    const payload = submissions.map((submission) => {
      const task = taskMap.get(String(submission.task));
      return {
        id: String(submission._id),
        taskId: String(submission.task),
        taskTitle: task?.title || 'Task',
        taskPoints: task?.points || 0,
        studentId: submission.student ? String(submission.student._id) : null,
        studentName: submission.student?.name || 'Student',
        studentGrade: submission.student?.student?.grade || null,
        status: submission.status,
        textResponse: submission.textResponse || '',
        feedback: submission.feedback || '',
        attachments: submission.attachments || [],
        awardedPoints: submission.awardedPoints || 0,
        submittedAt: submission.submittedAt || submission.createdAt,
        reviewedAt: submission.reviewedAt || null,
        attempt: submission.attempt || 1,
      };
    });

    return res.json({ items: payload });
  } catch (error) {
    console.error('Failed to fetch teacher submissions:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
};

export const getTeacherTaskSummary = async (req, res) => {
  try {
    await connectDB();

    const teacherId = normalizeId(req.query?.teacherId);
    if (!teacherId) {
      return res.status(400).json({ error: 'Invalid teacher id' });
    }

    const tasks = await Task.find({ createdBy: teacherId }).select('title points').lean();
    if (tasks.length === 0) {
      return res.json({ items: [] });
    }

    const taskIds = tasks.map((task) => task._id);

    const aggregates = await TaskSubmission.aggregate([
      { $match: { task: { $in: taskIds } } },
      {
        $group: {
          _id: { task: '$task', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryMap = new Map();
    aggregates.forEach((row) => {
      const taskId = String(row._id.task);
      const status = row._id.status;
      const count = row.count;
      if (!summaryMap.has(taskId)) {
        summaryMap.set(taskId, { accepted: 0, pending: 0, rejected: 0 });
      }
      const entry = summaryMap.get(taskId);
      if (entry[status] !== undefined) entry[status] += count;
    });

    const items = tasks.map((task) => {
      const counts = summaryMap.get(String(task._id)) || { accepted: 0, pending: 0, rejected: 0 };
      const total = counts.accepted + counts.pending + counts.rejected;
      return {
        id: String(task._id),
        title: task.title,
        points: task.points || 0,
        accepted: counts.accepted,
        pending: counts.pending,
        rejected: counts.rejected,
        total,
      };
    });

    return res.json({ items });
  } catch (error) {
    console.error('Failed to build teacher summary:', error);
    return res.status(500).json({ error: error.message || 'Failed to build summary' });
  }
};

export const listTeacherStudents = async (req, res) => {
  try {
    await connectDB();

    const teacherId = normalizeId(req.query?.teacherId);
    if (!teacherId) {
      return res.status(400).json({ error: 'Invalid teacher id' });
    }

    const teacher = await User.findById(teacherId).select('school').lean();
    if (!teacher || !teacher.school) {
      return res.status(404).json({ error: 'Teacher not associated with a school' });
    }

    const students = await User.find({ school: teacher.school, role: 'student' })
      .select('name email student.grade lastLoginAt')
      .sort({ 'student.grade': 1, name: 1 })
      .lean();

    const items = students.map((student) => ({
      id: String(student._id),
      name: student.name,
      email: student.email,
      grade: student.student?.grade || null,
      lastLoginAt: student.lastLoginAt || null,
    }));

    return res.json({ students: items });
  } catch (error) {
    console.error('Failed to fetch teacher students:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch students' });
  }
};

export default {
  getTeacherSubmissions,
  getTeacherTaskSummary,
  listTeacherStudents,
};

// src/controllers/taskController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Task, ALLOWED_GRADES } from '../models/tasks.js';
import { User } from '../models/users.js';

const { Types } = mongoose;

const normalizeString = (value) => String(value || '').trim();
const normalizeTitle = (value) => normalizeString(value);

const VALID_TARGET_TYPES = new Set(['ALL', 'GRADE', 'STUDENTS']);
const TEACHER_ROLES = new Set(['teacher', 'schoolAdmin']);

const sanitizeObjectIdArray = (list = []) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((value) => {
      try {
        return new Types.ObjectId(String(value));
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);
};

const sanitizeGradeArray = (list = []) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const sanitized = [];
  for (const raw of list) {
    const normalized = normalizeString(raw);
    if (ALLOWED_GRADES.includes(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      sanitized.push(normalized);
    }
  }
  return sanitized;
};

const sanitizeResources = (resources = []) => {
  if (!Array.isArray(resources)) return [];
  return resources
    .map((resource) => {
      const kind = resource?.kind;
      const url = normalizeString(resource?.url);
      if (!['image', 'video', 'file'].includes(kind) || !url) return null;
      const sanitized = {
        kind,
        url,
      };
      if (resource?.name) sanitized.name = normalizeString(resource.name);
      if (resource?.size && Number.isFinite(Number(resource.size))) {
        sanitized.size = Number(resource.size);
      }
      if (resource?.meta && typeof resource.meta === 'object') {
        sanitized.meta = resource.meta;
      }
      return sanitized;
    })
    .filter(Boolean);
};

const parseDueAt = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const ensureTeacher = async ({
  user,
  fallbackUserId,
}) => {
  if (user && TEACHER_ROLES.has(user.role)) {
    return {
      teacherId: new Types.ObjectId(user.id || user._id),
      schoolId: user.school ? new Types.ObjectId(user.school) : null,
    };
  }

  if (!fallbackUserId) {
    throw Object.assign(new Error('Teacher context missing'), { statusCode: 400 });
  }

  const teacher = await User.findById(fallbackUserId).lean();
  if (!teacher) {
    throw Object.assign(new Error('Teacher not found'), { statusCode: 404 });
  }
  if (!TEACHER_ROLES.has(teacher.role)) {
    throw Object.assign(new Error('Only teachers or school admins can create tasks'), {
      statusCode: 403,
    });
  }
  if (!teacher.school) {
    throw Object.assign(new Error('Teacher must belong to a school'), {
      statusCode: 400,
    });
  }

  return {
    teacherId: teacher._id,
    schoolId: teacher.school,
  };
};

const ensureStudent = async ({ user, fallbackUserId }) => {
  const candidateId = user?.role === 'student' ? user.id || user._id : fallbackUserId;
  if (!candidateId) {
    throw Object.assign(new Error('Student context missing'), { statusCode: 400 });
  }

  let student;
  try {
    student = await User.findById(candidateId).lean();
  } catch (err) {
    throw Object.assign(new Error('Invalid student id'), { statusCode: 400 });
  }

  if (!student) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }
  if (student.role !== 'student') {
    throw Object.assign(new Error('Only students can access assigned tasks'), {
      statusCode: 403,
    });
  }
  if (!student.school) {
    throw Object.assign(new Error('Student must belong to a school'), { statusCode: 400 });
  }

  const grade = normalizeString(student.student?.grade);
  return {
    studentId: student._id,
    schoolId: student.school,
    grade: grade && ALLOWED_GRADES.includes(grade) ? grade : null,
    name: student.name,
  };
};

export const createTask = async (req, res) => {
  try {
    await connectDB();

    const {
      title,
      description,
      points,
      target = {},
      dueAt,
      resources,
      schoolId: rawSchoolId,
      createdBy: fallbackTeacherId,
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) {
      return res.status(400).json({ error: 'Title must not be empty' });
    }

    const numericPoints = Number(points);
    if (!Number.isFinite(numericPoints) || numericPoints <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    let teacherContext;
    try {
      teacherContext = await ensureTeacher({
        user: req.user,
        fallbackUserId: fallbackTeacherId,
      });
    } catch (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }

    let targetType = normalizeString(target?.type).toUpperCase();
    if (!VALID_TARGET_TYPES.has(targetType)) {
      targetType = 'ALL';
    }

    const targetDoc = { type: targetType };
    if (targetType === 'GRADE') {
      const grades = sanitizeGradeArray(target?.grades);
      if (!grades.length) {
        return res.status(400).json({ error: 'At least one valid grade is required' });
      }
      targetDoc.grades = grades;
    }
    if (targetType === 'STUDENTS') {
      const studentIds = sanitizeObjectIdArray(target?.students);
      if (!studentIds.length) {
        return res.status(400).json({ error: 'At least one target student is required' });
      }
      targetDoc.students = studentIds;
    }

    const resolvedSchoolId = (() => {
      if (rawSchoolId) return new Types.ObjectId(rawSchoolId);
      if (teacherContext.schoolId) return teacherContext.schoolId;
      return null;
    })();

    if (!resolvedSchoolId) {
      return res.status(400).json({ error: 'School id is required' });
    }

    const sanitizedResources = sanitizeResources(resources);
    const dueDate = parseDueAt(dueAt);

    const task = await Task.create({
      school: resolvedSchoolId,
      createdBy: teacherContext.teacherId,
      title: normalizedTitle,
      description: normalizeString(description),
      points: Math.round(numericPoints),
      target: targetDoc,
      dueAt: dueDate,
      resources: sanitizedResources,
    });

    return res.status(201).json({
      task: {
        id: String(task._id),
        schoolId: String(task.school),
        createdBy: String(task.createdBy),
        title: task.title,
        description: task.description,
        points: task.points,
        target: task.target,
        dueAt: task.dueAt,
        resources: task.resources,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAssignedTasks = async (req, res) => {
  try {
    await connectDB();

    const { studentId: queryStudentId } = req.query || {};

    let studentContext;
    try {
      studentContext = await ensureStudent({
        user: req.user,
        fallbackUserId: queryStudentId,
      });
    } catch (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }

    const matchClauses = [{ 'target.type': 'ALL' }];
    if (studentContext.grade) {
      matchClauses.push({ 'target.type': 'GRADE', 'target.grades': studentContext.grade });
    }
    matchClauses.push({ 'target.type': 'STUDENTS', 'target.students': studentContext.studentId });

    const tasks = await Task.find({
      school: studentContext.schoolId,
      isActive: true,
      $or: matchClauses,
    })
      .sort({ dueAt: 1, createdAt: -1 })
      .lean();

    const now = new Date();

    return res.json({
      tasks: tasks.map((task) => ({
        id: String(task._id),
        title: task.title,
        description: task.description,
        points: task.points,
        dueAt: task.dueAt || null,
        createdAt: task.createdAt,
        resources: task.resources || [],
        target: task.target,
        overdue: task.dueAt ? new Date(task.dueAt) < now : false,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export default {
  createTask,
  getAssignedTasks,
};

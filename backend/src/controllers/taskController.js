// src/controllers/taskController.js
import mongoose from 'mongoose';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { connectDB } from '../lib/db.js';
import { awardBadgesForScore } from '../lib/badges.js';
import { Task, TaskSubmission, ALLOWED_GRADES } from '../models/tasks.js';
import { PointTransaction, UserScore } from '../models/gamification.js';
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

const sanitizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];
  const allowedKinds = new Set(['image', 'video', 'file']);

  return attachments
    .map((attachment) => {
      if (!attachment) return null;
      const rawKind = typeof attachment.kind === 'string' ? attachment.kind.toLowerCase() : '';
      const kind = allowedKinds.has(rawKind) ? rawKind : 'file';
      const url = normalizeString(attachment.url);
      if (!url) return null;
      const sanitized = { kind, url };

      if (attachment.name) sanitized.name = normalizeString(attachment.name);
      if (attachment.size && Number.isFinite(Number(attachment.size))) {
        sanitized.size = Number(attachment.size);
      }
      if (attachment.key) sanitized.key = normalizeString(attachment.key);
      if (attachment.meta && typeof attachment.meta === 'object') {
        sanitized.meta = attachment.meta;
      }
      return sanitized;
    })
    .filter(Boolean);
};

const canStudentAccessTask = (task, studentContext) => {
  if (!task?.target || !task.target.type) return false;
  const targetType = task.target.type;

  if (targetType === 'ALL') return true;

  if (targetType === 'GRADE') {
    if (!studentContext.grade) return false;
    return Array.isArray(task.target.grades) && task.target.grades.includes(studentContext.grade);
  }

  if (targetType === 'STUDENTS') {
    if (!Array.isArray(task.target.students)) return false;
    return task.target.students.some((id) => String(id) === String(studentContext.studentId));
  }

  return false;
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

export const createTaskSubmission = async (req, res) => {
  try {
    await connectDB();

    const { taskId } = req.params || {};
    const { studentId: bodyStudentId } = req.body || {};
    const textResponse = normalizeString(req.body?.textResponse);
    const attachments = sanitizeAttachments(req.body?.attachments);

    if (!taskId || !Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    let studentContext;
    try {
      studentContext = await ensureStudent({
        user: req.user,
        fallbackUserId: bodyStudentId,
      });
    } catch (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }

    if (!textResponse && attachments.length === 0) {
      return res.status(400).json({ error: 'Provide a message or at least one attachment' });
    }

    const task = await Task.findById(taskId).lean();
    if (!task || !task.isActive) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!canStudentAccessTask(task, studentContext)) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    const attempt =
      (await TaskSubmission.countDocuments({
        task: task._id,
        student: studentContext.studentId,
      })) + 1;

    const submission = await TaskSubmission.create({
      task: task._id,
      school: task.school,
      student: studentContext.studentId,
      studentName: studentContext.name,
      studentGrade: studentContext.grade,
      attempt,
      textResponse: textResponse || undefined,
      attachments,
      submittedAt: new Date(),
    });

    return res.status(201).json({
      submission: {
        id: String(submission._id),
        taskId: String(submission.task),
        status: submission.status,
        attempt: submission.attempt,
        textResponse: submission.textResponse || '',
        attachments: submission.attachments || [],
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error('Failed to create task submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit task' });
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

    // Pull latest submission per task for this student to show status
    const taskIds = tasks.map((t) => t._id);
    let latestByTask = new Map();
    if (taskIds.length > 0) {
      const subs = await TaskSubmission.find({
        task: { $in: taskIds },
        student: studentContext.studentId,
      })
        .sort({ createdAt: -1 })
        .lean();
      for (const sub of subs) {
        const key = String(sub.task);
        if (!latestByTask.has(key)) latestByTask.set(key, sub);
      }
    }

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
        submission: (() => {
          const sub = latestByTask.get(String(task._id));
          if (!sub) return null;
          return {
            id: String(sub._id),
            status: sub.status,
            submittedAt: sub.submittedAt || sub.createdAt,
            edited: sub.updatedAt && sub.updatedAt.getTime() !== (sub.createdAt?.getTime?.() || 0),
            attempt: sub.attempt || 1,
            attachmentsCount: Array.isArray(sub.attachments) ? sub.attachments.length : 0,
            textResponse: sub.textResponse || '',
            feedback: sub.feedback || '',
            awardedPoints: sub.awardedPoints || 0,
            attachments: (sub.attachments || []).map((a) => ({
              kind: a.kind,
              url: a.url,
              name: a.name || null,
              size: a.size || null,
              key: a.key || null,
            })),
          };
        })(),
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateTaskSubmission = async (req, res) => {
  try {
    await connectDB();

    const { taskId } = req.params || {};
    const { studentId: bodyStudentId } = req.body || {};
    const textResponse = normalizeString(req.body?.textResponse);
    const newAttachments = sanitizeAttachments(req.body?.attachments);

    if (!taskId || !Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    let studentContext;
    try {
      studentContext = await ensureStudent({
        user: req.user,
        fallbackUserId: bodyStudentId,
      });
    } catch (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }

    const latest = await TaskSubmission.findOne({
      task: new Types.ObjectId(taskId),
      student: studentContext.studentId,
    })
      .sort({ createdAt: -1 });

    if (!latest) {
      return res.status(404).json({ error: 'No existing submission to edit' });
    }

    if (textResponse) latest.textResponse = textResponse;
    if (Array.isArray(newAttachments) && newAttachments.length > 0) {
      latest.attachments = [...(latest.attachments || []), ...newAttachments];
    }
    latest.status = 'pending';
    await latest.save();

    return res.json({
      submission: {
        id: String(latest._id),
        status: latest.status,
        submittedAt: latest.submittedAt,
        edited: true,
        attempt: latest.attempt || 1,
        attachmentsCount: Array.isArray(latest.attachments) ? latest.attachments.length : 0,
        textResponse: latest.textResponse || '',
      },
    });
  } catch (error) {
    console.error('Failed to update submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to update submission' });
  }
};

// --- Delete a single attachment from the latest submission for this student+task, and remove from R2 ---

let _r2Client;
const getR2Client = () => {
  if (_r2Client) return _r2Client;
  const { CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY } = process.env;
  if (!CLOUDFLARE_R2_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
    throw new Error('Missing Cloudflare R2 credentials');
  }
  _r2Client = new S3Client({
    region: 'auto',
    endpoint: 'https://' + CLOUDFLARE_R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
  return _r2Client;
};

export const deleteSubmissionAttachment = async (req, res) => {
  try {
    await connectDB();

    const { taskId } = req.params || {};
    const key = String((req.body?.key || req.query?.key || '')).replace(/^\/+/, '');
    const { studentId: bodyStudentId } = req.body || {};

    if (!taskId || !Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    if (!key) {
      return res.status(400).json({ error: 'Attachment key is required' });
    }

    let studentContext;
    try {
      studentContext = await ensureStudent({ user: req.user, fallbackUserId: bodyStudentId });
    } catch (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({ error: err.message });
    }

    const submission = await TaskSubmission.findOne({
      task: new Types.ObjectId(taskId),
      student: studentContext.studentId,
    })
      .sort({ createdAt: -1 });

    if (!submission) {
      return res.status(404).json({ error: 'No submission found' });
    }

    const index = (submission.attachments || []).findIndex((a) => String(a.key || '') === key);
    if (index === -1) {
      return res.status(404).json({ error: 'Attachment not found on submission' });
    }

    // Delete from R2 first
    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key,
      })
    );

    // Remove from submission and save
    submission.attachments.splice(index, 1);
    await submission.save();

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete submission attachment:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete attachment' });
  }
};

// --- Review a student's submission (accept/reject, with feedback) and adjust points ledger ---
export const reviewSubmission = async (req, res) => {
  try {
    await connectDB();

    const { submissionId } = req.params || {};
    const { status, feedback } = req.body || {};

    if (!submissionId || !Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ error: 'Invalid submission id' });
    }
    if (!['accepted', 'rejected', 'pending'].includes(String(status))) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const submission = await TaskSubmission.findById(submissionId).populate('task');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Only teachers/schoolAdmins should review – minimal check if req.user exists
    const reviewerId = req.user?._id || req.user?.id || null;
    if (reviewerId) submission.reviewedBy = reviewerId;
    submission.reviewedAt = new Date();
    submission.status = status;
    submission.feedback = typeof feedback === 'string' ? feedback.trim() : submission.feedback;

    // Points logic
    const taskPoints = Number(submission.task?.points || 0) || 0;
    let delta = 0;
    if (status === 'accepted') {
      // If previously rejected or pending, credit points; if already accepted, ensure points recorded once
      const alreadyCredited = submission.awardedPoints > 0;
      if (!alreadyCredited && taskPoints > 0) {
        delta = taskPoints;
        submission.awardedPoints = taskPoints;
      }
    } else if (status === 'rejected') {
      if (submission.awardedPoints > 0) {
        delta = -submission.awardedPoints;
        submission.awardedPoints = 0;
      }
    } else {
      // pending – no change
    }

    await submission.save();

    if (delta !== 0) {
      await PointTransaction.create({
        user: submission.student,
        school: submission.school,
        amount: delta,
        reason: delta > 0 ? 'TASK_ACCEPTED' : 'REVOKE',
        task: submission.task,
        submission: submission._id,
      });

      // Upsert UserScore total
      const student = await User.findById(submission.student).lean();
      const setPayload = {
        school: submission.school,
        lastUpdatedAt: new Date(),
      };
      const gradeSnapshot = student?.student?.grade;
      if (typeof gradeSnapshot === 'string' && gradeSnapshot.trim()) {
        setPayload.grade = gradeSnapshot.trim();
      }

      const updatedScore = await UserScore.findOneAndUpdate(
        { user: submission.student },
        {
          $set: setPayload,
          $inc: { totalPoints: delta },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (updatedScore) {
        await awardBadgesForScore(updatedScore.user, updatedScore.totalPoints);
      }

    }

    return res.json({
      submission: {
        id: String(submission._id),
        status: submission.status,
        feedback: submission.feedback || '',
        awardedPoints: submission.awardedPoints || 0,
        reviewedAt: submission.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Failed to review submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to review submission' });
  }
};

export default {
  createTask,
  createTaskSubmission,
  getAssignedTasks,
  updateTaskSubmission,
  deleteSubmissionAttachment,
};

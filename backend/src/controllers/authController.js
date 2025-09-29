// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import { connectDB } from '../lib/db.js';
import { School, Ngo, User } from '../models/users.js';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const normalizeString = (value) => String(value || '').trim();
const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_GRADE_VALUES = new Set(Array.from({ length: 12 }, (_, i) => String(i + 1)));

const normalizeGradeValue = (value) => {
  const trimmed = normalizeString(value);
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isInteger(numeric)) return null;
  const asString = String(numeric);
  return ALLOWED_GRADE_VALUES.has(asString) ? asString : null;
};

export const createSchool = async (req, res) => {
  try {
    await connectDB();
    let { schoolName, adminName, adminEmail, password, provider } = req.body;

    schoolName = normalizeString(schoolName);
    adminName = normalizeString(adminName);
    adminEmail = normalizeEmail(adminEmail);
    provider = normalizeString(provider);
    const isSocial = provider === 'google';

    if (!schoolName || !adminEmail || (!password && !isSocial)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const existing = await User.findOne({ email: adminEmail }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const school = await School.create({ name: schoolName });

    const admin = new User({
      name: adminName || adminEmail,
      email: adminEmail,
      role: 'schoolAdmin',
      school: school._id,
    });
    if (password) {
      await admin.setPassword(password);
    }
    await admin.save();

    school.createdBy = admin._id;
    await school.save();

    return res.status(201).json({
      school: { id: String(school._id), name: school.name, code: school.code },
      admin: { id: String(admin._id), email: admin.email, name: admin.name },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const createNgo = async (req, res) => {
  try {
    await connectDB();
    let { ngoName, adminName, adminEmail, password, provider } = req.body;

    ngoName = normalizeString(ngoName);
    adminName = normalizeString(adminName);
    adminEmail = normalizeEmail(adminEmail);
    provider = normalizeString(provider);
    const isSocial = provider === 'google';

    if (!ngoName || !adminEmail || (!password && !isSocial)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const existing = await User.findOne({ email: adminEmail }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const ngo = await Ngo.create({ name: ngoName });

    const admin = new User({
      name: adminName || adminEmail,
      email: adminEmail,
      role: 'ngoAdmin',
      ngo: ngo._id,
    });
    if (password) {
      await admin.setPassword(password);
    }
    await admin.save();

    ngo.createdBy = admin._id;
    await ngo.save();

    return res.status(201).json({
      ngo: { id: String(ngo._id), name: ngo.name, code: ngo.code },
      admin: { id: String(admin._id), email: admin.email, name: admin.name },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const joinSchool = async (req, res) => {
  try {
    await connectDB();
    let { code, role, name, email, password, grade, teacherBio } = req.body;

    code = normalizeCode(code);
    email = normalizeEmail(email);
    name = normalizeString(name);
    role = normalizeString(role);
    teacherBio = normalizeString(teacherBio);
    const gradeValue = normalizeGradeValue(grade);

    if (!code || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or teacher' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    if (role === 'student' && !gradeValue) {
      return res.status(400).json({ error: 'Grade must be a number between 1 and 12' });
    }
    if (role === 'teacher' && !teacherBio) {
      return res.status(400).json({ error: 'Bio is required for teachers' });
    }

    const school = await School.findOne({ code });
    if (!school) {
      return res.status(404).json({ error: 'Invalid school code' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = new User({
      name: name || email,
      email,
      role,
      school: school._id,
      student: role === 'student' ? { grade: gradeValue } : undefined,
      teacher: role === 'teacher' ? { bio: teacherBio } : undefined,
    });
    await user.setPassword(password);
    await user.save();

    return res.status(201).json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: String(school._id),
        grade: user.student?.grade || null,
        teacherBio: user.teacher?.bio || null,
        orgType: 'SCHOOL',
        orgId: String(school._id),
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const joinSchoolSocial = async (req, res) => {
  try {
    await connectDB();
    let { code, role, name, email, grade, teacherBio } = req.body;

    code = normalizeCode(code);
    email = normalizeEmail(email);
    name = normalizeString(name);
    role = normalizeString(role);
    const gradeValue = normalizeGradeValue(grade);
    teacherBio = normalizeString(teacherBio);

    if (!code || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['student', 'teacher', 'schoolAdmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role for school' });
    }
    if (role === 'student' && !gradeValue) {
      return res.status(400).json({ error: 'Grade must be a number between 1 and 12' });
    }
    if (role === 'teacher' && !teacherBio) {
      return res.status(400).json({ error: 'Bio is required for teachers' });
    }

    const school = await School.findOne({ code });
    if (!school) {
      return res.status(404).json({ error: 'Invalid school code' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name: name || email,
        email,
        role,
        school: school._id,
        student: role === 'student' ? { grade: gradeValue } : undefined,
        teacher: role === 'teacher' ? { bio: teacherBio } : undefined,
      });
      await user.save();
    } else {
      if (user.ngo) {
        return res.status(400).json({ error: 'User already belongs to an NGO' });
      }
      user.role = role;
      user.school = school._id;
      if (role === 'student') {
        user.student = { grade: gradeValue };
        user.teacher = undefined;
      }
      if (role === 'teacher') {
        user.teacher = { bio: teacherBio };
        user.student = undefined;
      }
      await user.save();
    }

    return res.status(200).json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: String(school._id),
        grade: user.student?.grade || null,
        teacherBio: user.teacher?.bio || null,
        orgType: 'SCHOOL',
        orgId: String(school._id),
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    await connectDB();
    const email = normalizeEmail(req.body.email);
    const password = normalizeString(req.body.password);

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account disabled' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const orgType = user.school ? 'SCHOOL' : user.ngo ? 'NGO' : null;
    const orgId = user.school || user.ngo || null;

    return res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      orgType,
      orgId: orgId ? String(orgId) : null,
      grade: user.student?.grade || null,
      teacherBio: user.teacher?.bio || null,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getSchoolDetails = async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'School id is required' });
    }

    const school = await School.findById(id).lean();
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    return res.json({
      id: String(school._id),
      name: school.name,
      code: school.code,
      createdBy: school.createdBy ? String(school.createdBy) : null,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/**
 * Convenience endpoint: fetch a school by its admin's email.
 * Useful when the session does not yet contain orgId/orgType but we do know the email.
 */
export const getSchoolByAdminEmail = async (req, res) => {
  try {
    await connectDB();
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    if (!user.school) {
      return res.status(404).json({ error: 'User is not linked to any school' });
    }

    const school = await School.findById(user.school).lean();
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    return res.json({
      id: String(school._id),
      name: school.name,
      code: school.code,
      createdBy: school.createdBy ? String(school.createdBy) : null,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export default {
  createSchool,
  createNgo,
  joinSchool,
  joinSchoolSocial,
  login,
  getSchoolDetails,
  getSchoolByAdminEmail,
};

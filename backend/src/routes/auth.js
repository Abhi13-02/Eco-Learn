// src/routes/auth.js
import express from 'express';
import { connectDB } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import { School, Ngo, User, generateCode } from '../models/users.js';

const router = express.Router();

// Quick health for this router
router.get('/ping', (_req, res) => res.json({ pong: true }));

// Create a School and its admin
router.post('/school', async (req, res) => {
  try {
    await connectDB();
    const { schoolName, adminName, adminEmail, password } = req.body;
    if (!schoolName || !adminEmail || !password) throw new Error('Missing required fields');

    const code = generateCode(6);
    const school = await School.create({ name: schoolName, code });

    const admin = new User({
      name: adminName || adminEmail,
      email: adminEmail,
      role: 'schoolAdmin',
      school: school._id,
    });
    await admin.setPassword(password);
    await admin.save();

    school.createdBy = admin._id;
    await school.save();

    res.status(201).json({
      school: { id: school._id, name: school.name, code: school.code },
      admin: { id: admin._id, email: admin.email },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create an NGO and its admin
router.post('/ngo', async (req, res) => {
  try {
    await connectDB();
    const { ngoName, adminName, adminEmail, password } = req.body;
    if (!ngoName || !adminEmail || !password) throw new Error('Missing required fields');

    const code = generateCode(6);
    const ngo = await Ngo.create({ name: ngoName, code });

    const admin = new User({
      name: adminName || adminEmail,
      email: adminEmail,
      role: 'ngoAdmin',
      ngo: ngo._id,
    });
    await admin.setPassword(password);
    await admin.save();

    ngo.createdBy = admin._id;
    await ngo.save();

    res.status(201).json({
      ngo: { id: ngo._id, name: ngo.name, code: ngo.code },
      admin: { id: admin._id, email: admin.email },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Teacher or Student joins a School using a code
router.post('/join-school', async (req, res) => {
  try {
    await connectDB();
    const { code, role, name, email, password, grade } = req.body;
    if (!code || !email || !password) throw new Error('Missing required fields');
    if (!['student', 'teacher'].includes(role)) throw new Error('Role must be student or teacher');

    const school = await School.findOne({ code });
    if (!school) throw new Error('Invalid school code');

    const user = new User({
      name: name || email,
      email,
      role,
      school: school._id,
      student: role === 'student' && grade ? { grade } : undefined,
    });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({ userId: user._id, schoolId: school._id, role: user.role });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Simple email/password login (for NextAuth Credentials or your own client)
router.post('/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account disabled' });

    const orgType = user.school ? 'SCHOOL' : 'NGO';
    const orgId = user.school || user.ngo;

    res.json({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      orgType,
      orgId,
      grade: user.student?.grade || null,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;

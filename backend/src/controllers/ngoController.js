// src/controllers/ngoController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Ngo, School, User } from '../models/users.js';
import { NgoSchoolCollaboration } from '../models/collaboration.js';
import { Notification } from '../models/notifications.js';
import { BlogPost } from '../models/blog.js';

const { Types } = mongoose;

const norm = (v) => (typeof v === 'string' ? v.trim() : '');
const toId = (v) => {
  try { return v ? new Types.ObjectId(String(v)) : null; } catch { return null; }
};

async function findSchoolAdminUserId(schoolId) {
  const school = await School.findById(schoolId).lean();
  if (!school) return null;
  if (school.createdBy) return school.createdBy;
  const admin = await User.findOne({ school: schoolId, role: 'schoolAdmin' }, { _id: 1 }).lean();
  return admin?._id || null;
}

async function findNgoAdminUserId(ngoId) {
  const ngo = await Ngo.findById(ngoId).lean();
  if (!ngo) return null;
  if (ngo.createdBy) return ngo.createdBy;
  const admin = await User.findOne({ ngo: ngoId, role: 'ngoAdmin' }, { _id: 1 }).lean();
  return admin?._id || null;
}

export const searchSchools = async (req, res) => {
  try {
    await connectDB();
    const ngoId = toId(req.query.ngoId || req.body?.ngoId);
    const q = norm(req.query.q || req.body?.q || '');

    if (!ngoId) return res.status(400).json({ error: 'ngoId is required' });

    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ];
    }

    const [schools, collabs] = await Promise.all([
      School.find(filter).limit(200).lean(),
      NgoSchoolCollaboration.find({ ngo: ngoId }).lean(),
    ]);

    const statusBySchool = new Map(collabs.map((c) => [String(c.school), { status: c.status, id: String(c._id) }]));

    const items = schools.map((s) => ({
      id: String(s._id),
      name: s.name,
      code: s.code,
      status: statusBySchool.get(String(s._id))?.status || 'none',
      collabId: statusBySchool.get(String(s._id))?.id || null,
    }));

    return res.json({ schools: items });
  } catch (error) {
    console.error('searchSchools failed', error);
    return res.status(500).json({ error: error.message || 'Failed to list schools' });
  }
};

export const sendInvite = async (req, res) => {
  try {
    await connectDB();
    const ngoId = toId(req.body?.ngoId);
    const schoolId = toId(req.body?.schoolId);
    const actorId = toId(req.body?.actorId);
    const message = norm(req.body?.message || '');

    if (!ngoId || !schoolId || !actorId) {
      return res.status(400).json({ error: 'ngoId, schoolId and actorId are required' });
    }

    const [ngo, school, actor] = await Promise.all([
      Ngo.findById(ngoId).lean(),
      School.findById(schoolId).lean(),
      User.findById(actorId).lean(),
    ]);
    if (!ngo || !school || !actor) return res.status(404).json({ error: 'Invalid ngo, school or user' });
    if (actor.role !== 'ngoAdmin' || String(actor.ngo) !== String(ngoId)) {
      return res.status(403).json({ error: 'Only NGO admins of this NGO can invite' });
    }

    let collab = await NgoSchoolCollaboration.findOne({ ngo: ngoId, school: schoolId });
    if (collab) {
      if (collab.status === 'accepted' || collab.status === 'pending') {
        return res.status(409).json({ error: `Collaboration already ${collab.status}` });
      }
      collab.status = 'pending';
      collab.invitedBy = actorId;
      collab.respondedBy = undefined;
      collab.respondedAt = undefined;
      collab.message = message || collab.message;
      await collab.save();
    } else {
      collab = await NgoSchoolCollaboration.create({
        ngo: ngoId,
        school: schoolId,
        status: 'pending',
        invitedBy: actorId,
        message,
      });
    }

    const adminId = await findSchoolAdminUserId(schoolId);
    if (adminId) {
      await Notification.create({
        recipient: adminId,
        actor: actorId,
        school: schoolId,
        ngo: ngoId,
        type: 'NGO_COLLAB_INVITE',
        title: 'NGO Collaboration Invite',
        message: `${ngo.name} invited your school to collaborate`,
        collab: collab._id,
        payload: { collabId: String(collab._id), ngoId: String(ngoId), schoolId: String(schoolId) },
      });
    }

    return res.status(201).json({ collab: { id: String(collab._id), status: collab.status } });
  } catch (error) {
    console.error('sendInvite failed', error);
    return res.status(500).json({ error: error.message || 'Failed to send invite' });
  }
};

export const listCollaborations = async (req, res) => {
  try {
    await connectDB();
    const ngoId = toId(req.query.ngoId || req.body?.ngoId);
    const status = norm(req.query.status || req.body?.status || '');
    if (!ngoId) return res.status(400).json({ error: 'ngoId is required' });

    const filter = { ngo: ngoId };
    if (status && ['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) filter.status = status;

    const collabs = await NgoSchoolCollaboration.find(filter).populate('school', 'name code').sort({ createdAt: -1 }).lean();
    const items = collabs.map((c) => ({
      id: String(c._id),
      status: c.status,
      schoolId: c.school ? String(c.school._id) : null,
      schoolName: c.school?.name || 'School',
      schoolCode: c.school?.code || null,
      invitedBy: c.invitedBy ? String(c.invitedBy) : null,
      respondedBy: c.respondedBy ? String(c.respondedBy) : null,
      respondedAt: c.respondedAt || null,
      createdAt: c.createdAt,
    }));
    return res.json({ collaborations: items });
  } catch (error) {
    console.error('listCollaborations failed', error);
    return res.status(500).json({ error: error.message || 'Failed to list collaborations' });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    await connectDB();
    const collabId = toId(req.params?.collabId);
    const actorId = toId(req.body?.actorId);
    if (!collabId || !actorId) return res.status(400).json({ error: 'Invalid parameters' });

    const [collab, actor] = await Promise.all([
      NgoSchoolCollaboration.findById(collabId),
      User.findById(actorId).lean(),
    ]);
    if (!collab) return res.status(404).json({ error: 'Collaboration not found' });
    if (!actor || actor.role !== 'schoolAdmin' || String(actor.school) !== String(collab.school)) {
      return res.status(403).json({ error: 'Only this school admin can accept' });
    }
    if (collab.status !== 'pending') return res.status(400).json({ error: `Cannot accept ${collab.status}` });

    collab.status = 'accepted';
    collab.respondedBy = actorId;
    collab.respondedAt = new Date();
    await collab.save();

    const ngoAdminId = await findNgoAdminUserId(collab.ngo);
    if (ngoAdminId) {
      const ngo = await Ngo.findById(collab.ngo).lean();
      await Notification.create({
        recipient: ngoAdminId,
        actor: actorId,
        school: collab.school,
        ngo: collab.ngo,
        type: 'NGO_COLLAB_ACCEPTED',
        title: 'Collaboration accepted',
        message: `Your invite was accepted by the school`,
        collab: collab._id,
        payload: { collabId: String(collab._id) },
      });
    }

    return res.json({ success: true, status: 'accepted' });
  } catch (error) {
    console.error('acceptInvite failed', error);
    return res.status(500).json({ error: error.message || 'Failed to accept invite' });
  }
};

export const rejectInvite = async (req, res) => {
  try {
    await connectDB();
    const collabId = toId(req.params?.collabId);
    const actorId = toId(req.body?.actorId);
    if (!collabId || !actorId) return res.status(400).json({ error: 'Invalid parameters' });

    const [collab, actor] = await Promise.all([
      NgoSchoolCollaboration.findById(collabId),
      User.findById(actorId).lean(),
    ]);
    if (!collab) return res.status(404).json({ error: 'Collaboration not found' });
    if (!actor || actor.role !== 'schoolAdmin' || String(actor.school) !== String(collab.school)) {
      return res.status(403).json({ error: 'Only this school admin can reject' });
    }
    if (collab.status !== 'pending') return res.status(400).json({ error: `Cannot reject ${collab.status}` });

    collab.status = 'rejected';
    collab.respondedBy = actorId;
    collab.respondedAt = new Date();
    await collab.save();

    return res.json({ success: true, status: 'rejected' });
  } catch (error) {
    console.error('rejectInvite failed', error);
    return res.status(500).json({ error: error.message || 'Failed to reject invite' });
  }
};

export const studentNgoFeed = async (req, res) => {
  try {
    await connectDB();
    const studentId = toId(req.query.studentId || req.body?.studentId);
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const student = await User.findById(studentId).lean();
    if (!student || student.role !== 'student' || !student.school) {
      return res.status(404).json({ error: 'Student not found or not linked to a school' });
    }

    const accepted = await NgoSchoolCollaboration.find({ school: student.school, status: 'accepted' }, { ngo: 1 }).lean();
    const ngoIds = accepted.map((c) => c.ngo);
    if (!ngoIds.length) return res.json({ posts: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } });

    const ngoAdmins = await User.find({ role: 'ngoAdmin', ngo: { $in: ngoIds } }, { _id: 1 }).lean();
    const authorIds = ngoAdmins.map((u) => u._id);
    if (!authorIds.length) return res.json({ posts: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const [posts, total] = await Promise.all([
      BlogPost.find({ author: { $in: authorIds }, status: 'published' })
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name image')
        .lean(),
      BlogPost.countDocuments({ author: { $in: authorIds }, status: 'published' }),
    ]);

    const items = posts.map((post) => ({
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      excerpt: post.content?.slice(0, 280) || '',
      coverAttachment: post.coverAttachment || null,
      youtubeUrl: post.youtubeUrl || null,
      authorRole: post.authorRole,
      authorName: post.author?.name || null,
      authorImage: post.author?.image || null,
      likesCount: post.likesCount,
      dislikesCount: post.dislikesCount,
      commentCount: post.commentCount,
      tags: post.tags || [],
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
    }));

    return res.json({ posts: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    console.error('studentNgoFeed failed', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch NGO feed' });
  }
};

export default {
  searchSchools,
  sendInvite,
  listCollaborations,
  acceptInvite,
  rejectInvite,
  studentNgoFeed,
};

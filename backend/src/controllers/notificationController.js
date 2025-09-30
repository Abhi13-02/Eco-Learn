// src/controllers/notificationController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Notification } from '../models/notifications.js';

const { Types } = mongoose;
const toId = (v) => { try { return v ? new Types.ObjectId(String(v)) : null; } catch { return null; } };

export const listNotifications = async (req, res) => {
  try {
    await connectDB();
    const recipientId = toId(req.query.userId || req.body?.userId);
    if (!recipientId) return res.status(400).json({ error: 'userId is required' });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [items, total] = await Promise.all([
      Notification.find({ recipient: recipientId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipient: recipientId }),
    ]);

    return res.json({
      notifications: items.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        message: n.message || '',
        payload: n.payload || {},
        readAt: n.readAt || null,
        createdAt: n.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error('listNotifications failed', error);
    return res.status(500).json({ error: error.message || 'Failed to list notifications' });
  }
};

export const markRead = async (req, res) => {
  try {
    await connectDB();
    const notificationId = toId(req.params?.notificationId);
    if (!notificationId) return res.status(400).json({ error: 'Invalid id' });

    await Notification.updateOne({ _id: notificationId }, { $set: { readAt: new Date() } });
    return res.json({ success: true });
  } catch (error) {
    console.error('markRead failed', error);
    return res.status(500).json({ error: error.message || 'Failed to mark read' });
  }
};

export default { listNotifications, markRead };

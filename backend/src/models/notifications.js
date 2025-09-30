// src/models/notifications.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: { type: Types.ObjectId, ref: 'User', required: true },
    actor: { type: Types.ObjectId, ref: 'User' },
    school: { type: Types.ObjectId, ref: 'School' },
    ngo: { type: Types.ObjectId, ref: 'Ngo' },

    type: {
      type: String,
      enum: [
        'TASK_SUBMISSION_CREATED',
        'TASK_SUBMISSION_REVIEWED',
        'TASK_ASSIGNED',
        'NGO_COLLAB_INVITE',
        'NGO_COLLAB_ACCEPTED',
        'NGO_POST_PUBLISHED',
        'SYSTEM',
      ],
      required: true,
      default: 'SYSTEM',
    },
    title: { type: String, required: true },
    message: { type: String },

    task: { type: Types.ObjectId, ref: 'Task' },
    submission: { type: Types.ObjectId, ref: 'TaskSubmission' },
    collab: { type: Types.ObjectId, ref: 'NgoSchoolCollaboration' },

    payload: { type: Schema.Types.Mixed },

    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ school: 1, createdAt: -1 });
NotificationSchema.index({ ngo: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

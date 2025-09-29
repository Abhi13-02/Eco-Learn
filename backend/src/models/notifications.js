// src/models/notifications.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: { type: Types.ObjectId, ref: 'User', required: true },
    actor: { type: Types.ObjectId, ref: 'User' }, // e.g., teacher who reviewed
    school: { type: Types.ObjectId, ref: 'School' },

    type: {
      type: String,
      enum: ['TASK_SUBMISSION_CREATED', 'TASK_SUBMISSION_REVIEWED', 'TASK_ASSIGNED', 'SYSTEM'],
      required: true,
      default: 'SYSTEM',
    },
    title: { type: String, required: true },
    message: { type: String },

    task: { type: Types.ObjectId, ref: 'Task' },
    submission: { type: Types.ObjectId, ref: 'TaskSubmission' },

    payload: { type: Schema.Types.Mixed }, // any extra data for the client

    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ school: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);


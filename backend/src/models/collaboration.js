// src/models/collaboration.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const NgoSchoolCollaborationSchema = new Schema(
  {
    ngo: { type: Types.ObjectId, ref: 'Ngo', required: true },
    school: { type: Types.ObjectId, ref: 'School', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      required: true,
    },
    invitedBy: { type: Types.ObjectId, ref: 'User' },
    respondedBy: { type: Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
    message: { type: String, trim: true },
  },
  { timestamps: true }
);

// unique pair constraint (latest status holds truth)
NgoSchoolCollaborationSchema.index({ ngo: 1, school: 1 }, { unique: true });
NgoSchoolCollaborationSchema.index({ ngo: 1, status: 1, createdAt: -1 });
NgoSchoolCollaborationSchema.index({ school: 1, status: 1, createdAt: -1 });

export const NgoSchoolCollaboration =
  mongoose.models.NgoSchoolCollaboration ||
  mongoose.model('NgoSchoolCollaboration', NgoSchoolCollaborationSchema);

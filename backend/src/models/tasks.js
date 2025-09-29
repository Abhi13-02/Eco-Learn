// src/models/tasks.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

// Shared attachment schema (actual storage handled elsewhere)
const AssetSchema = new Schema(
  {
    kind: { type: String, enum: ['image', 'video', 'file'], required: true },
    url: { type: String, required: true },
    name: { type: String, trim: true },
    size: { type: Number }, // in bytes
    key: { type: String, trim: true }, // storage key in R2 (needed for deletes)
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// Allowed grades for targeting and snapshots
export const ALLOWED_GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));

/* ---------------- Task (created by teachers) ---------------- */
const TaskSchema = new Schema(
  {
    school: { type: Types.ObjectId, ref: 'School', required: true },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true }, // teacher/admin

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    points: { type: Number, required: true, min: 0 }, // integer points awarded upon acceptance

    target: {
      type: {
        type: String,
        enum: ['ALL', 'GRADE', 'STUDENTS'],
        default: 'ALL',
      },
      // When targeting by grade(s)
      grades: [{ type: String, enum: ALLOWED_GRADES }],
      // When targeting specific students
      students: [{ type: Types.ObjectId, ref: 'User' }],
    },

    dueAt: { type: Date },
    resources: [AssetSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TaskSchema.index({ school: 1, createdBy: 1, isActive: 1 });
TaskSchema.index({ school: 1, 'target.type': 1 });

/* ---------------- TaskSubmission (by students) ---------------- */
const TaskSubmissionSchema = new Schema(
  {
    task: { type: Types.ObjectId, ref: 'Task', required: true },
    school: { type: Types.ObjectId, ref: 'School', required: true },

    // Student who submitted
    student: { type: Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, trim: true }, // snapshot for easier searching
    studentGrade: { type: String, enum: ALLOWED_GRADES }, // snapshot at submission time

    attempt: { type: Number, default: 1, min: 1 },

    // Student response
    textResponse: { type: String, trim: true },
    attachments: [AssetSchema],

    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    reviewedBy: { type: Types.ObjectId, ref: 'User' }, // teacher
    reviewedAt: { type: Date },
    feedback: { type: String, trim: true },

    // Points actually awarded for this submission (usually equals task.points when accepted)
    awardedPoints: { type: Number, default: 0, min: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure school is set from task if omitted
TaskSubmissionSchema.pre('validate', async function ensureSchool(next) {
  if (this.school || !this.task) return next();
  try {
    const task = await mongoose.models.Task.findById(this.task).select('school').lean();
    if (task?.school) this.school = task.school;
    next();
  } catch (err) {
    next(err);
  }
});

TaskSubmissionSchema.index({ task: 1, student: 1, attempt: 1 });
TaskSubmissionSchema.index({ school: 1, status: 1, createdAt: -1 });
TaskSubmissionSchema.index({ student: 1, status: 1, createdAt: -1 });
TaskSubmissionSchema.index({ reviewedBy: 1, status: 1, reviewedAt: -1 });

/* ---------------- Export models (avoid OverwriteModelError) ---------------- */
export const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
export const TaskSubmission =
  mongoose.models.TaskSubmission || mongoose.model('TaskSubmission', TaskSubmissionSchema);


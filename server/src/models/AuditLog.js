import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actorEmail: String, // stored for historical reference even if user is deleted
    action: {
      type: String,
      required: true,
      enum: [
        // Auth
        'user_registered', 'user_login', 'user_logout', 'password_reset',
        'email_verified', 'account_locked',
        // User management
        'user_created', 'user_updated', 'user_deleted', 'user_activated', 'user_deactivated',
        // Donations
        'donation_created', 'donation_updated', 'donation_deleted',
        'donation_approved', 'donation_rejected',
        // Requests
        'request_created', 'request_approved', 'request_rejected', 'request_cancelled',
        // Matches
        'match_created', 'match_accepted', 'match_rejected', 'item_delivered',
        // Feedback
        'feedback_created', 'feedback_hidden', 'feedback_deleted',
        // Admin
        'admin_action', 'report_generated', 'settings_changed',
      ],
    },
    target: String,
    targetModel: {
      type: String,
      enum: ['User', 'Donation', 'Request', 'Match', 'Feedback', 'Notification'],
    },
    targetId: mongoose.Schema.Types.ObjectId,
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: String,
    userAgent: String,
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });
// Auto-delete audit logs after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

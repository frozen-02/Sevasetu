import mongoose from 'mongoose';

const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'approved', 'rejected', 'matched', 'delivered', 'cancelled'];

const requestSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
    },
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: [true, 'Donation is required'],
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
    },
    message: {
      type: String,
      required: [true, 'Request message is required'],
      minlength: [20, 'Message must be at least 20 characters'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    urgencyLevel: {
      type: String,
      enum: URGENCY_LEVELS,
      default: 'medium',
    },
    quantityRequested: {
      type: Number,
      min: [1, 'Must request at least 1 item'],
      default: 1,
    },
    purposeDescription: {
      type: String,
      maxlength: [500],
    },
    beneficiaryCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    adminNotes: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    deliveredAt: Date,
    deliveryConfirmedByReceiver: { type: Boolean, default: false },
    deliveryConfirmedByDonor: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

requestSchema.index({ receiver: 1 });
requestSchema.index({ donation: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ urgencyLevel: 1 });
requestSchema.index({ createdAt: -1 });

// Prevent duplicate requests from same receiver for same donation
requestSchema.index(
  { receiver: 1, donation: 1 },
  { unique: true, partialFilterExpression: { status: { $nin: ['cancelled', 'rejected'] } } }
);

const Request = mongoose.model('Request', requestSchema);
export default Request;

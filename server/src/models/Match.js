import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Smart Matching Score (0-100)
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    scoreBreakdown: {
      category: { type: Number, default: 0, min: 0, max: 40 },   // 40%
      location: { type: Number, default: 0, min: 0, max: 20 },   // 20%
      urgency: { type: Number, default: 0, min: 0, max: 15 },    // 15%
      availability: { type: Number, default: 0, min: 0, max: 15 }, // 15%
      condition: { type: Number, default: 0, min: 0, max: 10 },  // 10%
    },
    status: {
      type: String,
      enum: ['suggested', 'accepted', 'rejected', 'delivered', 'cancelled'],
      default: 'suggested',
    },
    matchedBy: {
      type: String,
      enum: ['system', 'admin'],
      default: 'system',
    },
    matchedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

matchSchema.index({ donation: 1 });
matchSchema.index({ request: 1 });
matchSchema.index({ donor: 1 });
matchSchema.index({ receiver: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ score: -1 });
matchSchema.index({ createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);
export default Match;

import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Feedback comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    // AI Sentiment Analysis
    sentimentScore: {
      type: Number,
      default: 0,
      min: -1,
      max: 1,
    },
    sentimentLabel: {
      type: String,
      enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'],
      default: 'neutral',
    },
    isToxic: {
      type: Boolean,
      default: false,
    },
    toxicityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    toxicCategories: [String],
    isHidden: {
      type: Boolean,
      default: false,
    },
    hiddenReason: String,
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    fromRole: {
      type: String,
      enum: ['donor', 'receiver'],
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

feedbackSchema.index({ from: 1 });
feedbackSchema.index({ to: 1 });
feedbackSchema.index({ match: 1 });
feedbackSchema.index({ isToxic: 1 });
feedbackSchema.index({ isHidden: 1 });
feedbackSchema.index({ createdAt: -1 });

// One feedback per match per user
feedbackSchema.index({ from: 1, match: 1 }, { unique: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;

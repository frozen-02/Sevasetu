import mongoose from 'mongoose';

const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    totalDonations: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalDelivered: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    badges: [
      {
        name: String,
        description: String,
        awardedAt: { type: Date, default: Date.now },
        icon: String,
      },
    ],
    preferredCategories: [
      {
        type: String,
        enum: [
          'Education', 'Clothing', 'Electronics', 'Food',
          'Medical', 'Furniture', 'Books', 'Sports', 'Others',
        ],
      },
    ],
    socialLinks: {
      website: String,
      linkedin: String,
      twitter: String,
    },
    isVerifiedDonor: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

donorProfileSchema.index({ user: 1 }, { unique: true });
donorProfileSchema.index({ impactScore: -1 });
donorProfileSchema.index({ 'rating.average': -1 });

const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);
export default DonorProfile;

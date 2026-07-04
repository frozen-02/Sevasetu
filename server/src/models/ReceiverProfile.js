import mongoose from 'mongoose';

const receiverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    ngoRegistrationNumber: {
      type: String,
      trim: true,
    },
    isNGO: { type: Boolean, default: false },
    isVerifiedNGO: { type: Boolean, default: false },
    verificationDocs: [
      {
        name: String,
        url: String,
        publicId: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    totalReceived: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    totalApprovedRequests: { type: Number, default: 0 },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    beneficiaryCount: { type: Number, default: 0 },
    needCategories: [
      {
        type: String,
        enum: [
          'Education', 'Clothing', 'Electronics', 'Food',
          'Medical', 'Furniture', 'Books', 'Sports', 'Others',
        ],
      },
    ],
    location: {
      city: String,
      state: String,
      pincode: String,
    },
    website: String,
    socialLinks: {
      facebook: String,
      instagram: String,
      linkedin: String,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

receiverProfileSchema.index({ user: 1 }, { unique: true });
receiverProfileSchema.index({ trustScore: -1 });
receiverProfileSchema.index({ isVerifiedNGO: 1 });

const ReceiverProfile = mongoose.model('ReceiverProfile', receiverProfileSchema);
export default ReceiverProfile;

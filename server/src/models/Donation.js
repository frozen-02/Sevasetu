import mongoose from 'mongoose';

const CATEGORIES = [
  'Education', 'Clothing', 'Electronics', 'Food',
  'Medical', 'Furniture', 'Books', 'Sports', 'Others',
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'matched', 'delivered', 'expired', 'cancelled'];

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: CATEGORIES,
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [100],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    quantity: {
      value: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
      },
      unit: {
        type: String,
        default: 'pieces',
        trim: true,
      },
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: CONDITIONS,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    location: {
      address: String,
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      pincode: String,
      country: { type: String, default: 'India' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },
    pickupAvailable: {
      type: Boolean,
      default: true,
    },
    pickupInstructions: {
      type: String,
      maxlength: [500],
    },
    expiryDate: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    viewCount: { type: Number, default: 0 },
    requestCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    adminNotes: String,
    // AI fields
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
    contentHash: { type: String, select: false }, // for duplicate detection
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
donationSchema.index({ donor: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ category: 1 });
donationSchema.index({ 'location.state': 1 });
donationSchema.index({ 'location.city': 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ expiryDate: 1 });
donationSchema.index({ 'location.coordinates': '2dsphere' });
donationSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
});

// Virtual: is expired
donationSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Virtual: primary image
donationSchema.virtual('primaryImage').get(function () {
  if (!this.images || this.images.length === 0) return null;
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.images[0].url;
});

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;

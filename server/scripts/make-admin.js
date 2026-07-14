// Quick admin seeder — run from /server directory: node scripts/make-admin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

await mongoose.connect(process.env.MONGODB_URI);

const email = process.argv[2] || 'admin@sevasetu.com';
const password = process.argv[3] || 'Admin@1234';

const existing = await User.findOne({ email });
if (existing) {
  // Update role/status — use save() so pre-save hook fires if password changed
  existing.role = 'admin';
  existing.isVerified = true;
  existing.isActive = true;
  await existing.save({ validateBeforeSave: false });
  console.log(`✅ Existing user updated to admin: ${email}`);
} else {
  // Use plain password — User model's pre-save hook will hash it
  await User.create({
    name: 'Platform Admin',
    email,
    password,          // plain text — model hashes it
    role: 'admin',
    phone: '9000000001',
    isVerified: true,
    isActive: true,
  });
  console.log(`✅ Admin created: ${email} / ${password}`);
}

await mongoose.disconnect();
process.exit(0);


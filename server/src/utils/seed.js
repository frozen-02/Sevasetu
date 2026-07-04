/**
 * SEVASETU Seed Script
 * Run: node src/utils/seed.js
 * Creates: 1 admin, 3 donors, 3 receivers, 10 donations, 8 requests, 5 matches
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import DonorProfile from '../models/DonorProfile.js';
import ReceiverProfile from '../models/ReceiverProfile.js';
import Donation from '../models/Donation.js';
import Request from '../models/Request.js';
import Match from '../models/Match.js';
import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
};

const clearDB = async () => {
  await Promise.all([
    User.deleteMany(),
    DonorProfile.deleteMany(),
    ReceiverProfile.deleteMany(),
    Donation.deleteMany(),
    Request.deleteMany(),
    Match.deleteMany(),
    Feedback.deleteMany(),
    Notification.deleteMany(),
    AuditLog.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');
};

const seed = async () => {
  await connectDB();
  await clearDB();

  // ─── USERS ────────────────────────────────────────────────────────────
  console.log('👥 Creating users...');

  const admin = await User.create({
    name: 'Admin SEVASETU',
    email: 'admin@sevasetu.in',
    password: 'Admin@1234',
    role: 'admin',
    isVerified: true,
    isActive: true,
    phone: '+91-9999000001',
  });

  const donors = await User.insertMany([
    { name: 'Priya Sharma', email: 'priya@example.com', password: 'Donor@1234', role: 'donor', isVerified: true, isActive: true, phone: '+91-9876543210', address: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' } },
    { name: 'Rajesh Verma', email: 'rajesh@example.com', password: 'Donor@1234', role: 'donor', isVerified: true, isActive: true, phone: '+91-9876543211', address: { city: 'Delhi', state: 'Delhi', pincode: '110001' } },
    { name: 'Ananya Krishnan', email: 'ananya@example.com', password: 'Donor@1234', role: 'donor', isVerified: true, isActive: true, phone: '+91-9876543212', address: { city: 'Bangalore', state: 'Karnataka', pincode: '560001' } },
  ]);

  const receivers = await User.insertMany([
    { name: 'Helping Hands NGO', email: 'helpinghands@example.com', password: 'Receiver@1234', role: 'receiver', isVerified: true, isActive: true, phone: '+91-9876543220', address: { city: 'Mumbai', state: 'Maharashtra' } },
    { name: 'Bright Future Foundation', email: 'brightfuture@example.com', password: 'Receiver@1234', role: 'receiver', isVerified: true, isActive: true, phone: '+91-9876543221', address: { city: 'Pune', state: 'Maharashtra' } },
    { name: 'Care India Trust', email: 'careindia@example.com', password: 'Receiver@1234', role: 'receiver', isVerified: true, isActive: true, phone: '+91-9876543222', address: { city: 'Delhi', state: 'Delhi' } },
  ]);

  console.log(`✅ Created ${1 + donors.length + receivers.length} users`);

  // ─── PROFILES ──────────────────────────────────────────────────────────
  console.log('📋 Creating profiles...');

  await Promise.all(
    donors.map((d) => DonorProfile.create({
      user: d._id,
      totalDonations: Math.floor(Math.random() * 10) + 1,
      totalApproved: Math.floor(Math.random() * 8),
      totalDelivered: Math.floor(Math.random() * 5),
      impactScore: Math.floor(Math.random() * 500) + 100,
      preferredCategories: ['Education', 'Clothing', 'Electronics'].slice(0, Math.floor(Math.random() * 3) + 1),
    }))
  );

  await Promise.all(
    receivers.map((r, i) => ReceiverProfile.create({
      user: r._id,
      organization: ['Helping Hands Foundation', 'Bright Future Foundation', 'Care India Trust'][i],
      isNGO: true,
      isVerifiedNGO: i === 0,
      totalRequests: Math.floor(Math.random() * 15),
      totalReceived: Math.floor(Math.random() * 10),
      trustScore: 70 + Math.floor(Math.random() * 30),
      needCategories: ['Education', 'Clothing', 'Food', 'Medical'][i] ? [['Education', 'Books'][i % 2], 'Clothing'] : ['Food', 'Medical'],
      location: { city: ['Mumbai', 'Pune', 'Delhi'][i], state: ['Maharashtra', 'Maharashtra', 'Delhi'][i] },
    }))
  );

  console.log('✅ Profiles created');

  // ─── DONATIONS ─────────────────────────────────────────────────────────
  console.log('📦 Creating donations...');

  const donationData = [
    { title: 'Class 10 NCERT Textbooks Set', category: 'Education', subcategory: 'Textbooks', description: 'Complete set of Class 10 NCERT textbooks in excellent condition. Includes Science, Math, English, Social Studies, Hindi. Used for one year only.', quantityValue: 5, condition: 'Good', city: 'Mumbai', state: 'Maharashtra', status: 'approved', donorIdx: 0 },
    { title: 'Kids Winter Clothing Bundle', category: 'Clothing', subcategory: 'Winter Wear', description: 'A bundle of winter clothes for children aged 5-10 years. Includes sweaters, jackets, and warm pants. All clean and in good condition.', quantityValue: 20, condition: 'Good', city: 'Delhi', state: 'Delhi', status: 'approved', donorIdx: 1 },
    { title: 'Laptop - Dell Inspiron 2018', category: 'Electronics', subcategory: 'Computers', description: 'Dell Inspiron laptop, 2018 model, 8GB RAM, 256GB SSD, Intel i5. Working perfectly. Upgrading to newer model hence donating.', quantityValue: 1, condition: 'Like New', city: 'Bangalore', state: 'Karnataka', status: 'approved', donorIdx: 2 },
    { title: 'Medical First Aid Supplies', category: 'Medical', subcategory: 'First Aid', description: 'Complete first aid kit with bandages, antiseptics, gloves, thermometers, and basic medicines. Sealed and unopened.', quantityValue: 10, condition: 'New', city: 'Mumbai', state: 'Maharashtra', status: 'pending', donorIdx: 0 },
    { title: 'Storybooks Collection (50 books)', category: 'Books', subcategory: 'Children Books', description: 'Collection of 50 colorful storybooks for children aged 3-12. Includes fairy tales, moral stories, and educational books. All in good condition.', quantityValue: 50, condition: 'Good', city: 'Delhi', state: 'Delhi', status: 'approved', donorIdx: 1 },
    { title: 'Rice 25kg Bags', category: 'Food', subcategory: 'Grains', description: 'Premium quality basmati rice, 25kg bags, freshly packed. Expiry: 6 months from now. Can be used for community kitchen.', quantityValue: 10, condition: 'New', city: 'Bangalore', state: 'Karnataka', status: 'approved', donorIdx: 2 },
    { title: 'Wooden Study Table Set', category: 'Furniture', subcategory: 'Study Furniture', description: 'Solid wood study table with attached chair, perfect for students. Minor scratches but structurally sound. Disassembled for easy transport.', quantityValue: 3, condition: 'Fair', city: 'Mumbai', state: 'Maharashtra', status: 'matched', donorIdx: 0 },
    { title: 'Football & Sports Equipment', category: 'Sports', subcategory: 'Team Sports', description: 'Sports equipment for a school: 5 footballs, 2 cricket bats, stumps, 10 badminton rackets, nets. All in usable condition.', quantityValue: 1, condition: 'Good', city: 'Delhi', state: 'Delhi', status: 'approved', donorIdx: 1 },
    { title: 'School Uniform Set for Girls', category: 'Clothing', subcategory: 'School Uniform', description: 'School uniforms for girls, sizes 8-14 years. White shirts, blue skirts/pants, 15 sets available. Washed and ironed.', quantityValue: 15, condition: 'Good', city: 'Bangalore', state: 'Karnataka', status: 'delivered', donorIdx: 2 },
    { title: 'Electronic Tablets for Education', category: 'Electronics', subcategory: 'Tablets', description: 'Samsung Galaxy Tab A7, 2020 model. Pre-installed with educational apps. 3 tablets available for underprivileged students.', quantityValue: 3, condition: 'Like New', city: 'Mumbai', state: 'Maharashtra', status: 'approved', donorIdx: 0 },
  ];

  const donations = await Promise.all(
    donationData.map(async (d) => {
      return Donation.create({
        donor: donors[d.donorIdx]._id,
        title: d.title,
        category: d.category,
        subcategory: d.subcategory,
        description: d.description,
        quantity: { value: d.quantityValue, unit: 'pieces' },
        condition: d.condition,
        images: [{ url: `https://picsum.photos/seed/${d.title.slice(0,8)}/600/400`, publicId: `sevasetu/donations/seed_${Date.now()}`, isPrimary: true }],
        location: { city: d.city, state: d.state, country: 'India' },
        pickupAvailable: true,
        tags: [d.category.toLowerCase(), d.subcategory?.toLowerCase().replace(' ', '-')].filter(Boolean),
        status: d.status,
        approvedBy: d.status !== 'pending' ? admin._id : undefined,
        approvedAt: d.status !== 'pending' ? new Date() : undefined,
        viewCount: Math.floor(Math.random() * 200),
        requestCount: ['approved', 'matched', 'delivered'].includes(d.status) ? Math.floor(Math.random() * 5) + 1 : 0,
      });
    })
  );

  console.log(`✅ Created ${donations.length} donations`);

  // ─── REQUESTS ─────────────────────────────────────────────────────────
  console.log('📋 Creating requests...');

  const approvedDonations = donations.filter((d) => d.status === 'approved');

  const requests = await Promise.all([
    Request.create({ receiver: receivers[0]._id, donation: approvedDonations[0]._id, message: 'We urgently need textbooks for 50 underprivileged students in our slum school who cannot afford books.', urgencyLevel: 'high', quantityRequested: 5, beneficiaryCount: 50, status: 'approved', approvedBy: admin._id }),
    Request.create({ receiver: receivers[1]._id, donation: approvedDonations[1]._id, message: 'Our orphanage houses 30 children who desperately need warm clothes for the upcoming winter season.', urgencyLevel: 'critical', quantityRequested: 15, beneficiaryCount: 30, status: 'pending' }),
    Request.create({ receiver: receivers[2]._id, donation: approvedDonations[2]._id, message: 'We run a digital literacy program for underprivileged youth. A laptop would enable training for 20+ students.', urgencyLevel: 'medium', quantityRequested: 1, beneficiaryCount: 20, status: 'pending' }),
    Request.create({ receiver: receivers[0]._id, donation: approvedDonations[3]._id, message: 'Our community library needs storybooks to encourage reading habits among children in our slum area.', urgencyLevel: 'low', quantityRequested: 30, beneficiaryCount: 100, status: 'approved' }),
    Request.create({ receiver: receivers[1]._id, donation: approvedDonations[4]._id, message: 'Our community kitchen serves 200 meals daily to homeless families. Rice is our primary need.', urgencyLevel: 'critical', quantityRequested: 8, beneficiaryCount: 200, status: 'pending' }),
  ]);

  console.log(`✅ Created ${requests.length} requests`);

  // ─── MATCHES ──────────────────────────────────────────────────────────
  console.log('🤝 Creating matches...');

  const matchedDonation = donations.find((d) => d.status === 'matched');
  const deliveredDonation = donations.find((d) => d.status === 'delivered');

  const matches = [];

  if (matchedDonation) {
    // Create a request for the matched donation
    const matchRequest = await Request.create({
      receiver: receivers[0]._id,
      donation: matchedDonation._id,
      message: 'We need study tables for our school which has 30 students studying on the floor.',
      urgencyLevel: 'high',
      quantityRequested: 3,
      beneficiaryCount: 30,
      status: 'matched',
    });

    const match = await Match.create({
      donation: matchedDonation._id,
      request: matchRequest._id,
      donor: donors[0]._id,
      receiver: receivers[0]._id,
      score: 87.5,
      scoreBreakdown: { category: 30, location: 20, urgency: 12, availability: 15, condition: 10.5 },
      status: 'accepted',
      matchedBy: 'admin',
      matchedByAdmin: admin._id,
    });
    matches.push(match);

    await Request.findByIdAndUpdate(matchRequest._id, { match: match._id });
  }

  if (deliveredDonation) {
    const deliveredRequest = await Request.create({
      receiver: receivers[2]._id,
      donation: deliveredDonation._id,
      message: 'We need school uniforms for 15 girls in our scholarship program.',
      urgencyLevel: 'medium',
      quantityRequested: 15,
      beneficiaryCount: 15,
      status: 'delivered',
      deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      deliveryConfirmedByDonor: true,
      deliveryConfirmedByReceiver: true,
    });

    const deliveredMatch = await Match.create({
      donation: deliveredDonation._id,
      request: deliveredRequest._id,
      donor: donors[2]._id,
      receiver: receivers[2]._id,
      score: 92.0,
      scoreBreakdown: { category: 35, location: 18, urgency: 12, availability: 15, condition: 12 },
      status: 'delivered',
      matchedBy: 'admin',
      matchedByAdmin: admin._id,
      deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    matches.push(deliveredMatch);

    // Create feedback for delivered match
    await Feedback.create({
      from: receivers[2]._id,
      to: donors[2]._id,
      match: deliveredMatch._id,
      donation: deliveredDonation._id,
      rating: 5,
      comment: 'Excellent! The uniforms were in perfect condition and fit all the girls beautifully. Thank you so much for your generous donation. The children were overjoyed!',
      fromRole: 'receiver',
      sentimentScore: 0.9,
      sentimentLabel: 'very_positive',
      isToxic: false,
      toxicityScore: 0,
    });

    await Feedback.create({
      from: donors[2]._id,
      to: receivers[2]._id,
      match: deliveredMatch._id,
      donation: deliveredDonation._id,
      rating: 5,
      comment: 'Great organization! They are genuinely helping children. The delivery confirmation was prompt and they sent photos of the children wearing the uniforms. Very professional.',
      fromRole: 'donor',
      sentimentScore: 0.85,
      sentimentLabel: 'very_positive',
      isToxic: false,
      toxicityScore: 0,
    });
  }

  console.log(`✅ Created ${matches.length} matches`);

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────
  console.log('🔔 Creating notifications...');

  await Notification.insertMany([
    { recipient: donors[0]._id, type: 'donation_approved', title: '✅ Donation Approved!', message: 'Your donation "Class 10 NCERT Textbooks Set" has been approved.', isRead: false, priority: 'high' },
    { recipient: receivers[0]._id, type: 'request_approved', title: '✅ Request Approved!', message: 'Your request for textbooks has been approved. A match will be made soon.', isRead: false, priority: 'high' },
    { recipient: admin._id, type: 'new_donation', title: '📦 New Donation Pending', message: 'Medical First Aid Supplies requires your review.', isRead: true, priority: 'normal' },
  ]);

  // ─── UPDATE DONOR PROFILES ─────────────────────────────────────────────
  await DonorProfile.findOneAndUpdate({ user: donors[0]._id }, { totalDonations: 4, totalApproved: 3, totalDelivered: 1, impactScore: 450 });
  await DonorProfile.findOneAndUpdate({ user: donors[1]._id }, { totalDonations: 3, totalApproved: 2, totalDelivered: 0, impactScore: 280 });
  await DonorProfile.findOneAndUpdate({ user: donors[2]._id }, { totalDonations: 3, totalApproved: 3, totalDelivered: 1, impactScore: 520 });

  await ReceiverProfile.findOneAndUpdate({ user: receivers[0]._id }, { totalRequests: 2, totalReceived: 0, totalApprovedRequests: 1 });
  await ReceiverProfile.findOneAndUpdate({ user: receivers[1]._id }, { totalRequests: 2, totalReceived: 0 });
  await ReceiverProfile.findOneAndUpdate({ user: receivers[2]._id }, { totalRequests: 2, totalReceived: 1, totalApprovedRequests: 1 });

  console.log('\n🎉 Seeding complete!\n');
  console.log('📧 Login Credentials:');
  console.log('================================');
  console.log('ADMIN:    admin@sevasetu.in / Admin@1234');
  console.log('DONOR 1:  priya@example.com / Donor@1234');
  console.log('DONOR 2:  rajesh@example.com / Donor@1234');
  console.log('RECEIVER: helpinghands@example.com / Receiver@1234');
  console.log('================================\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

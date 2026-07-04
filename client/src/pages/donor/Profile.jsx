import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, MapPin, Camera, Lock, Eye, EyeOff, Save, AlertCircle,
  CheckCircle, Shield, Bell, Star, Gift, Package, Truck, ChevronDown,
  Loader2, X, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import useAuthStore from '../../store/authStore.js';
import { userService } from '../../services/index.js';
import {
  CATEGORIES, INDIAN_STATES, getCategoryIcon, getInitials, getApiError, formatDate,
} from '../../utils/index.js';

// ─── Validation Schemas ───────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  phone: z.string().optional(),
  bio: z.string().max(300, 'Bio must be under 300 characters').optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPincode: z.string().regex(/^\d{6}$/, 'Must be 6 digits').optional().or(z.literal('')),
  preferredCategories: z.array(z.string()).optional(),
  notificationEmail: z.boolean().optional(),
  notificationPush: z.boolean().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Must include uppercase, lowercase, and number'
  ),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FieldError = ({ msg }) =>
  msg ? (
    <p className="error-message">
      <AlertCircle size={12} /> {msg}
    </p>
  ) : null;

const SectionHeading = ({ icon: Icon, title, color = 'text-primary-400', bg = 'bg-primary-600/15' }) => (
  <div className="flex items-center gap-2 mb-5">
    <div className={`p-2 rounded-lg ${bg} ${color}`}>
      <Icon size={16} />
    </div>
    <h2 className="text-base font-bold text-gray-200">{title}</h2>
  </div>
);

// ─── Avatar Section ───────────────────────────────────────────────────────────
const AvatarUpload = ({ user, onUpload, isUploading }) => {
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    onUpload(file);
    e.target.value = '';
  };

  const avatarUrl = user?.avatar?.url;
  const initials = getInitials(user?.name || 'U');

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative group">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-3xl font-bold text-white overflow-hidden ring-2 ring-primary-500/30">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
          ) : initials}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white hover:bg-primary-500 transition-all shadow-lg disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      <div>
        <p className="font-bold text-lg text-white">{user?.name}</p>
        <p className="text-sm text-gray-400">{user?.email}</p>
        <p className="text-xs text-gray-600 mt-1">
          Joined {formatDate(user?.createdAt)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="badge-primary capitalize">{user?.role}</span>
          {user?.isVerified && (
            <span className="badge-success flex items-center gap-1">
              <CheckCircle size={10} /> Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Category Checkbox Grid ───────────────────────────────────────────────────
const CategoryPicker = ({ selected = [], onChange }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {CATEGORIES.map(cat => {
      const active = selected.includes(cat);
      return (
        <button
          key={cat}
          type="button"
          onClick={() => {
            onChange(active ? selected.filter(c => c !== cat) : [...selected, cat]);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
            active
              ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
              : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          }`}
        >
          <span>{getCategoryIcon(cat)}</span> {cat}
        </button>
      );
    })}
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, label, description }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-700/40">
    <div>
      <p className="text-sm font-semibold text-gray-200">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none flex-shrink-0 ${
        value ? 'bg-primary-600' : 'bg-gray-700'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
        value ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  </div>
);

// ─── Password Change Form ─────────────────────────────────────────────────────
const PasswordSection = () => {
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation({
    mutationFn: (data) => userService.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const EyeToggle = ({ field }) => (
    <button
      type="button"
      onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
    >
      {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div className="glass-card">
      <SectionHeading icon={Lock} title="Change Password" color="text-yellow-400" bg="bg-yellow-500/15" />

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {[
          { name: 'currentPassword', label: 'Current Password', field: 'current' },
          { name: 'newPassword', label: 'New Password', field: 'new' },
          { name: 'confirmPassword', label: 'Confirm New Password', field: 'confirm' },
        ].map(({ name, label, field }) => (
          <div key={name} className="form-group">
            <label className="label">{label}</label>
            <div className="relative">
              <input
                {...register(name)}
                type={show[field] ? 'text' : 'password'}
                placeholder="••••••••"
                className={`input pr-10 ${errors[name] ? 'input-error' : ''}`}
              />
              <EyeToggle field={field} />
            </div>
            <FieldError msg={errors[name]?.message} />
          </div>
        ))}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending
            ? <><Loader2 size={15} className="animate-spin" /> Updating...</>
            : <><Lock size={15} /> Update Password</>
          }
        </button>
      </form>
    </div>
  );
};

// ─── Stats Card (from profile) ────────────────────────────────────────────────
const StatItem = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2.5 rounded-xl ${color}`}>
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xl font-black text-white">{value ?? 0}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  </div>
);

// ─── Main Profile Component ───────────────────────────────────────────────────
export default function DonorProfile() {
  const queryClient = useQueryClient();
  const { user, profile, updateUser, updateProfile } = useAuthStore();
  const [categories, setCategories] = useState(profile?.preferredCategories ?? []);
  const [notifEmail, setNotifEmail] = useState(user?.notificationPreferences?.email ?? true);
  const [notifPush, setNotifPush] = useState(user?.notificationPreferences?.push ?? true);

  const {
    register, handleSubmit, reset, formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      addressCity: user?.address?.city || '',
      addressState: user?.address?.state || '',
      addressPincode: user?.address?.pincode || '',
    },
  });

  // Keep form in sync if auth store updates
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        addressCity: user.address?.city || '',
        addressState: user.address?.state || '',
        addressPincode: user.address?.pincode || '',
      });
    }
    if (profile) setCategories(profile.preferredCategories ?? []);
  }, [user?._id]);

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: (data) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.phone) formData.append('phone', data.phone);
      if (data.bio) formData.append('bio', data.bio);
      if (data.addressCity) formData.append('address[city]', data.addressCity);
      if (data.addressState) formData.append('address[state]', data.addressState);
      if (data.addressPincode) formData.append('address[pincode]', data.addressPincode);
      categories.forEach(c => formData.append('preferredCategories[]', c));
      formData.append('notificationPreferences[email]', notifEmail);
      formData.append('notificationPreferences[push]', notifPush);
      return userService.updateWithFiles(user._id, formData);
    },
    onSuccess: (res) => {
      const updated = res.data?.user ?? res.data;
      updateUser(updated);
      toast.success('Profile updated successfully ✅');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  // Avatar upload mutation
  const avatarMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return userService.updateWithFiles(user._id, formData);
    },
    onSuccess: (res) => {
      const updated = res.data?.user ?? res.data;
      updateUser(updated);
      toast.success('Avatar updated');
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const onSubmit = (values) => profileMutation.mutate(values);

  const donationStats = {
    total: profile?.totalDonations ?? 0,
    approved: profile?.totalApproved ?? 0,
    delivered: profile?.totalDelivered ?? 0,
    impactScore: profile?.impactScore ?? 0,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">
          My <span className="gradient-text">Profile</span>
        </h1>
        <p className="text-gray-400 mt-1">Manage your personal information and preferences</p>
      </motion.div>

      {/* ── Avatar + Basic Info Card ───────────────────────────────────────── */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <AvatarUpload
          user={user}
          onUpload={(file) => avatarMutation.mutate(file)}
          isUploading={avatarMutation.isPending}
        />
      </motion.div>

      {/* ── Impact Stats ──────────────────────────────────────────────────── */}
      <motion.div
        className="glass-card bg-gradient-to-br from-primary-600/5 to-accent-600/5 border-primary-500/15"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-base font-bold text-gray-200 mb-4">Donation Impact</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatItem icon={Gift} label="Total Donations" value={donationStats.total} color="bg-primary-500/20 text-primary-400" />
          <StatItem icon={CheckCircle} label="Approved" value={donationStats.approved} color="bg-green-500/20 text-green-400" />
          <StatItem icon={Truck} label="Delivered" value={donationStats.delivered} color="bg-teal-500/20 text-teal-400" />
          <StatItem icon={Star} label="Impact Score" value={donationStats.impactScore} color="bg-yellow-500/20 text-yellow-400" />
        </div>
      </motion.div>

      {/* ── Profile Form ──────────────────────────────────────────────────── */}
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Personal Details */}
        <div className="glass-card space-y-4">
          <SectionHeading icon={User} title="Personal Information" />

          {/* Name */}
          <div className="form-group">
            <label className="label">Full Name <span className="text-red-400">*</span></label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                {...register('name')}
                placeholder="Your full name"
                className={`input pl-9 ${errors.name ? 'input-error' : ''}`}
              />
            </div>
            <FieldError msg={errors.name?.message} />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="label">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                {...register('phone')}
                placeholder="+91 98765 43210"
                className="input pl-9"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label className="label">Bio <span className="text-gray-600 text-xs font-normal">(optional)</span></label>
            <textarea
              {...register('bio')}
              rows={3}
              placeholder="Tell receivers a little about yourself and why you donate..."
              className="input resize-none"
            />
            <FieldError msg={errors.bio?.message} />
          </div>
        </div>

        {/* Address */}
        <div className="glass-card space-y-4">
          <SectionHeading icon={MapPin} title="Address" color="text-teal-400" bg="bg-teal-500/15" />

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">City</label>
              <input
                {...register('addressCity')}
                placeholder="e.g. Mumbai"
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">State</label>
              <div className="relative">
                <select {...register('addressState')} className="input appearance-none pr-8">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Pincode</label>
              <input
                {...register('addressPincode')}
                placeholder="6-digit"
                maxLength={6}
                className={`input ${errors.addressPincode ? 'input-error' : ''}`}
              />
              <FieldError msg={errors.addressPincode?.message} />
            </div>
          </div>
        </div>

        {/* Category Preferences */}
        <div className="glass-card">
          <SectionHeading icon={Package} title="Preferred Donation Categories" color="text-accent-400" bg="bg-accent-500/15" />
          <CategoryPicker selected={categories} onChange={setCategories} />
          <p className="text-xs text-gray-600 mt-3">
            These help us suggest relevant donation opportunities and match you with the right receivers.
          </p>
        </div>

        {/* Notification Preferences */}
        <div className="glass-card space-y-3">
          <SectionHeading icon={Bell} title="Notification Preferences" color="text-blue-400" bg="bg-blue-500/15" />
          <Toggle
            value={notifEmail}
            onChange={setNotifEmail}
            label="Email Notifications"
            description="Get updates via email about your donations and matches"
          />
          <Toggle
            value={notifPush}
            onChange={setNotifPush}
            label="Push Notifications"
            description="Receive real-time alerts in the app"
          />
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="btn-primary flex-1 justify-center"
          >
            {profileMutation.isPending
              ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
              : <><Save size={16} /> Save Changes</>
            }
          </button>
        </div>
      </motion.form>

      {/* ── Password Section ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <PasswordSection />
      </motion.div>

      {/* ── Account Info ──────────────────────────────────────────────────── */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <SectionHeading icon={Shield} title="Account Information" color="text-gray-400" bg="bg-gray-500/15" />
        <div className="space-y-3">
          {[
            { label: 'Email Address', value: user?.email },
            { label: 'Account Role', value: <span className="capitalize badge-primary">{user?.role}</span> },
            { label: 'Verification', value: user?.isVerified
              ? <span className="badge-success flex items-center gap-1 w-fit"><CheckCircle size={10} /> Verified</span>
              : <span className="badge-warning">Pending Verification</span>
            },
            { label: 'Member Since', value: formatDate(user?.createdAt) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-800/60 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm text-gray-200">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

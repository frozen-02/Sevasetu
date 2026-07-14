import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload, X, Plus, ArrowLeft, Image, MapPin, Tag,
  Package, Calendar, ChevronDown, AlertCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { donationService } from '../../services/index.js';
import {
  CATEGORIES, CONDITIONS, INDIAN_STATES, getCategoryIcon, getApiError,
} from '../../utils/index.js';

// ─── Validation Schema ────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  category: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000),
  quantityValue: z.coerce.number().min(1, 'Quantity must be at least 1'),
  quantityUnit: z.string().min(1, 'Please enter a unit'),
  condition: z.string().min(1, 'Please select a condition'),
  locationCity: z.string().min(2, 'City is required'),
  locationState: z.string().min(1, 'Please select a state'),
  locationPincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('')),
  pickupAvailable: z.boolean().default(false),
  expiryDate: z.string().optional(),
  tags: z.string().optional(),
});

// ─── Image Preview Item ───────────────────────────────────────────────────────
const ImagePreviewItem = ({ src, index, onRemove }) => (
  <div className="relative group aspect-square rounded-xl overflow-hidden border border-gray-700/60">
    <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
    {index === 0 && (
      <div className="absolute top-1 left-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-md font-semibold">
        Primary
      </div>
    )}
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1
                 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
    >
      <X size={12} />
    </button>
  </div>
);

// ─── Field Error ──────────────────────────────────────────────────────────────
const FieldError = ({ msg }) =>
  msg ? (
    <p className="error-message">
      <AlertCircle size={12} /> {msg}
    </p>
  ) : null;

// ─── Section Heading ──────────────────────────────────────────────────────────
const SectionHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-2 rounded-lg bg-primary-600/15 text-primary-400">
      <Icon size={16} />
    </div>
    <h2 className="text-base font-bold text-gray-200">{title}</h2>
  </div>
);

// ─── AddDonation ──────────────────────────────────────────────────────────────
export default function AddDonation() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [images, setImages] = useState([]); // { file, preview }[]

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      pickupAvailable: false,
      quantityValue: 1,
      quantityUnit: 'piece',
    },
  });

  const mutation = useMutation({
    mutationFn: (formData) => donationService.create(formData),
    onSuccess: () => {
      toast.success('Donation listed successfully! 🎉');
      navigate('/donor/donations');
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const allowed = files.slice(0, remaining);
    const newImages = allowed.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (values) => {
    const formData = new FormData();

    // Scalar fields — names must match what the server reads from req.body
    formData.append('title',          values.title);
    formData.append('category',       values.category);
    if (values.subcategory) formData.append('subcategory', values.subcategory);
    formData.append('description',    values.description);
    formData.append('quantityValue',  values.quantityValue);
    formData.append('quantityUnit',   values.quantityUnit);
    formData.append('condition',      values.condition);
    formData.append('locationCity',   values.locationCity);
    formData.append('locationState',  values.locationState);
    if (values.locationPincode) formData.append('locationPincode', values.locationPincode);
    formData.append('pickupAvailable', String(values.pickupAvailable));
    if (values.expiryDate) formData.append('expiryDate', values.expiryDate);

    // Tags — send as comma-separated string; server splits it
    if (values.tags) {
      const tagArray = values.tags.split(',').map((t) => t.trim()).filter(Boolean);
      tagArray.forEach((tag) => formData.append('tags[]', tag));
    }

    // Images
    images.forEach(({ file }) => formData.append('images', file));

    mutation.mutate(formData);
  };


  const pickupAvailable = watch('pickupAvailable');

  const inputVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link to="/donor/donations" className="btn-ghost py-2 px-3">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-black">
            Add <span className="gradient-text">Donation</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Fill in the details below to list your item</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          className="glass-card space-y-4"
          variants={inputVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
        >
          <SectionHeading icon={Package} title="Basic Information" />

          {/* Title */}
          <div className="form-group">
            <label className="label">Title <span className="text-red-400">*</span></label>
            <input
              {...register('title')}
              placeholder="e.g. School Textbooks for Grade 8"
              className={`input ${errors.title ? 'input-error' : ''}`}
            />
            <FieldError msg={errors.title?.message} />
          </div>

          {/* Category + Subcategory */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Category <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  {...register('category')}
                  className={`input appearance-none pr-8 ${errors.category ? 'input-error' : ''}`}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <FieldError msg={errors.category?.message} />
            </div>

            <div className="form-group">
              <label className="label">Subcategory</label>
              <input
                {...register('subcategory')}
                placeholder="e.g. Science, Fiction, Winter"
                className="input"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label">Description <span className="text-red-400">*</span></label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Describe your donation — condition, what's included, any special notes..."
              className={`input resize-none ${errors.description ? 'input-error' : ''}`}
            />
            <FieldError msg={errors.description?.message} />
          </div>
        </motion.div>

        {/* Quantity & Condition */}
        <motion.div
          className="glass-card space-y-4"
          variants={inputVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.18 }}
        >
          <SectionHeading icon={Package} title="Quantity & Condition" />

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Quantity <span className="text-red-400">*</span></label>
              <input
                {...register('quantityValue')}
                type="number"
                min="1"
                className={`input ${errors.quantityValue ? 'input-error' : ''}`}
              />
              <FieldError msg={errors.quantityValue?.message} />
            </div>

            <div className="form-group">
              <label className="label">Unit <span className="text-red-400">*</span></label>
              <input
                {...register('quantityUnit')}
                placeholder="piece, kg, box..."
                className={`input ${errors.quantityUnit ? 'input-error' : ''}`}
              />
              <FieldError msg={errors.quantityUnit?.message} />
            </div>

            <div className="form-group">
              <label className="label">Condition <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  {...register('condition')}
                  className={`input appearance-none pr-8 ${errors.condition ? 'input-error' : ''}`}
                >
                  <option value="">Select condition</option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <FieldError msg={errors.condition?.message} />
            </div>
          </div>

          {/* Expiry Date */}
          <div className="form-group">
            <label className="label flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" />
              Expiry / Best Before Date
            </label>
            <input
              {...register('expiryDate')}
              type="date"
              className="input max-w-xs"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </motion.div>

        {/* Images */}
        <motion.div
          className="glass-card space-y-4"
          variants={inputVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.24 }}
        >
          <SectionHeading icon={Image} title="Images (Up to 5)" />

          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-gray-700/60 rounded-xl p-8 text-center cursor-pointer
                       hover:border-primary-500/60 hover:bg-primary-500/5 transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto text-gray-600 group-hover:text-primary-400 transition-colors mb-3" />
            <p className="text-gray-400 font-medium">Click to upload images</p>
            <p className="text-sm text-gray-600 mt-1">PNG, JPG, WebP up to 10MB each · {images.length}/5 selected</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={images.length >= 5}
            />
          </div>

          {/* Preview Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-5 gap-3">
              {images.map((img, i) => (
                <ImagePreviewItem key={i} src={img.preview} index={i} onRemove={removeImage} />
              ))}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center
                             text-gray-600 hover:border-primary-500/60 hover:text-primary-400 transition-all"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Location */}
        <motion.div
          className="glass-card space-y-4"
          variants={inputVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.30 }}
        >
          <SectionHeading icon={MapPin} title="Location" />

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">City <span className="text-red-400">*</span></label>
              <input
                {...register('locationCity')}
                placeholder="e.g. Mumbai"
                className={`input ${errors.locationCity ? 'input-error' : ''}`}
              />
              <FieldError msg={errors.locationCity?.message} />
            </div>

            <div className="form-group">
              <label className="label">State <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  {...register('locationState')}
                  className={`input appearance-none pr-8 ${errors.locationState ? 'input-error' : ''}`}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <FieldError msg={errors.locationState?.message} />
            </div>

            <div className="form-group">
              <label className="label">Pincode</label>
              <input
                {...register('locationPincode')}
                placeholder="6-digit pincode"
                maxLength={6}
                className={`input ${errors.locationPincode ? 'input-error' : ''}`}
              />
              <FieldError msg={errors.locationPincode?.message} />
            </div>
          </div>

          {/* Pickup Available Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/40 border border-gray-700/40">
            <div>
              <p className="font-semibold text-gray-200">Pickup Available</p>
              <p className="text-xs text-gray-500 mt-0.5">Receiver can pick up item from your location</p>
            </div>
            <Controller
              name="pickupAvailable"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none ${
                    field.value ? 'bg-primary-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      field.value ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            />
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div
          className="glass-card"
          variants={inputVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.36 }}
        >
          <SectionHeading icon={Tag} title="Tags" />
          <div className="form-group">
            <label className="label">Tags (comma-separated)</label>
            <input
              {...register('tags')}
              placeholder="e.g. school, textbooks, 2023, hindi-medium"
              className="input"
            />
            <p className="text-xs text-gray-600 mt-1">Tags help receivers find your donation more easily</p>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div
          className="flex gap-4 pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
        >
          <Link to="/donor/donations" className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending || isSubmitting}
            className="btn-primary flex-1 justify-center"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Plus size={16} /> List Donation
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

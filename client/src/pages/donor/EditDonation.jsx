import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, X, Plus, Image, MapPin, Tag,
  Package, Calendar, ChevronDown, AlertCircle, Loader2, Save,
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
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  quantityValue: z.coerce.number().min(1, 'Quantity must be at least 1'),
  quantityUnit: z.string().min(1, 'Please enter a unit'),
  condition: z.string().min(1, 'Please select a condition'),
  locationCity: z.string().min(2, 'City is required'),
  locationState: z.string().min(1, 'Please select a state'),
  locationPincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')),
  pickupAvailable: z.boolean().default(false),
  expiryDate: z.string().optional(),
  tags: z.string().optional(),
});

const FieldError = ({ msg }) =>
  msg ? <p className="error-message"><AlertCircle size={12} /> {msg}</p> : null;

const SectionHeading = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-2 rounded-lg bg-primary-600/15 text-primary-400">
      <Icon size={16} />
    </div>
    <h2 className="text-base font-bold text-gray-200">{title}</h2>
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const EditSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className="skeleton h-10 w-64" />
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card space-y-4">
        <div className="skeleton h-6 w-40" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-10 rounded-xl" />
        </div>
        <div className="skeleton h-24 rounded-xl" />
      </div>
    ))}
  </div>
);

// ─── ExistingImage ────────────────────────────────────────────────────────────
const ExistingImageItem = ({ src, index, onRemove }) => (
  <div className="relative group aspect-square rounded-xl overflow-hidden border border-gray-700/60">
    <img src={src} alt={`Existing ${index + 1}`} className="w-full h-full object-cover" />
    {index === 0 && (
      <div className="absolute top-1 left-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-md font-semibold">
        Primary
      </div>
    )}
    <div className="absolute top-1 right-1 bg-gray-800/80 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-md">
      Existing
    </div>
    <button
      type="button"
      onClick={() => onRemove(src)}
      className="absolute bottom-1 right-1 bg-red-600/90 text-white rounded-full p-1
                 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
    >
      <X size={12} />
    </button>
  </div>
);

const NewImageItem = ({ src, index, onRemove }) => (
  <div className="relative group aspect-square rounded-xl overflow-hidden border border-primary-500/40">
    <img src={src} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
    <div className="absolute top-1 right-1 bg-primary-600/90 text-white text-[10px] px-1.5 py-0.5 rounded-md">
      New
    </div>
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="absolute bottom-1 right-1 bg-red-600/90 text-white rounded-full p-1
                 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
    >
      <X size={12} />
    </button>
  </div>
);

// ─── EditDonation ─────────────────────────────────────────────────────────────
export default function EditDonation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [existingImages, setExistingImages] = useState([]); // URLs (strings)
  const [newImages, setNewImages] = useState([]); // { file, preview }[]

  const { data, isLoading, isError, error: fetchError } = useQuery({
    queryKey: ['donation', id],
    queryFn: () => donationService.getById(id),
    enabled: !!id,
  });

  const donation = data?.data?.donation;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      pickupAvailable: false,
      quantityValue: 1,
      quantityUnit: 'piece',
    },
  });

  // Populate form once donation is loaded
  useEffect(() => {
    if (donation) {
      reset({
        title: donation.title ?? '',
        category: donation.category ?? '',
        subcategory: donation.subcategory ?? '',
        description: donation.description ?? '',
        quantityValue: donation.quantity?.value ?? 1,
        quantityUnit: donation.quantity?.unit ?? 'piece',
        condition: donation.condition ?? '',
        locationCity: donation.location?.city ?? '',
        locationState: donation.location?.state ?? '',
        locationPincode: donation.location?.pincode ?? '',
        pickupAvailable: donation.pickupAvailable ?? false,
        expiryDate: donation.expiryDate ? donation.expiryDate.split('T')[0] : '',
        tags: (donation.tags ?? []).join(', '),
      });
      setExistingImages(donation.images ?? []);
    }
  }, [donation, reset]);

  const mutation = useMutation({
    mutationFn: (formData) => donationService.update(id, formData),
    onSuccess: () => {
      toast.success('Donation updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['donation', id] });
      queryClient.invalidateQueries({ queryKey: ['myDonations'] });
      navigate(`/donor/donations/${id}`);
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const totalImageCount = existingImages.length + newImages.length;

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 5 - totalImageCount;
    if (remaining <= 0) { toast.error('Maximum 5 images allowed'); return; }
    const allowed = files.slice(0, remaining);
    setNewImages((prev) => [
      ...prev,
      ...allowed.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    e.target.value = '';
  };

  const removeExistingImage = (url) =>
    setExistingImages((prev) => prev.filter((u) => u !== url));

  const removeNewImage = (index) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (values) => {
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('category', values.category);
    if (values.subcategory) formData.append('subcategory', values.subcategory);
    formData.append('description', values.description);
    formData.append('quantity[value]', values.quantityValue);
    formData.append('quantity[unit]', values.quantityUnit);
    formData.append('condition', values.condition);
    formData.append('location[city]', values.locationCity);
    formData.append('location[state]', values.locationState);
    if (values.locationPincode) formData.append('location[pincode]', values.locationPincode);
    formData.append('pickupAvailable', values.pickupAvailable);
    if (values.expiryDate) formData.append('expiryDate', values.expiryDate);

    if (values.tags) {
      values.tags.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => formData.append('tags[]', t));
    }

    // Existing images to keep
    existingImages.forEach((url) => formData.append('existingImages[]', url));

    // New image files
    newImages.forEach(({ file }) => formData.append('images', file));

    mutation.mutate(formData);
  };

  if (isLoading) return <EditSkeleton />;

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="glass-card text-center space-y-4 py-16">
          <AlertCircle size={48} className="text-red-400 mx-auto" />
          <p className="text-red-400 font-semibold">{getApiError(fetchError)}</p>
          <Link to="/donor/donations" className="btn-secondary">
            <ArrowLeft size={16} /> Back to Donations
          </Link>
        </div>
      </div>
    );
  }

  const formInputVariants = {
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
        <Link to={`/donor/donations/${id}`} className="btn-ghost py-2 px-3">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-black">
            Edit <span className="gradient-text">Donation</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 truncate max-w-xs">{donation?.title}</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          className="glass-card space-y-4"
          variants={formInputVariants}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
        >
          <SectionHeading icon={Package} title="Basic Information" />

          <div className="form-group">
            <label className="label">Title <span className="text-red-400">*</span></label>
            <input {...register('title')} className={`input ${errors.title ? 'input-error' : ''}`} />
            <FieldError msg={errors.title?.message} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Category <span className="text-red-400">*</span></label>
              <div className="relative">
                <select {...register('category')} className={`input appearance-none pr-8 ${errors.category ? 'input-error' : ''}`}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <FieldError msg={errors.category?.message} />
            </div>

            <div className="form-group">
              <label className="label">Subcategory</label>
              <input {...register('subcategory')} placeholder="Optional" className="input" />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Description <span className="text-red-400">*</span></label>
            <textarea
              {...register('description')}
              rows={4}
              className={`input resize-none ${errors.description ? 'input-error' : ''}`}
            />
            <FieldError msg={errors.description?.message} />
          </div>
        </motion.div>

        {/* Quantity & Condition */}
        <motion.div className="glass-card space-y-4" variants={formInputVariants} initial="hidden" animate="show" transition={{ delay: 0.18 }}>
          <SectionHeading icon={Package} title="Quantity & Condition" />
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Quantity <span className="text-red-400">*</span></label>
              <input {...register('quantityValue')} type="number" min="1" className={`input ${errors.quantityValue ? 'input-error' : ''}`} />
              <FieldError msg={errors.quantityValue?.message} />
            </div>
            <div className="form-group">
              <label className="label">Unit <span className="text-red-400">*</span></label>
              <input {...register('quantityUnit')} placeholder="piece, kg, box..." className={`input ${errors.quantityUnit ? 'input-error' : ''}`} />
              <FieldError msg={errors.quantityUnit?.message} />
            </div>
            <div className="form-group">
              <label className="label">Condition <span className="text-red-400">*</span></label>
              <div className="relative">
                <select {...register('condition')} className={`input appearance-none pr-8 ${errors.condition ? 'input-error' : ''}`}>
                  <option value="">Select condition</option>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <FieldError msg={errors.condition?.message} />
            </div>
          </div>

          <div className="form-group">
            <label className="label flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" /> Expiry / Best Before Date
            </label>
            <input {...register('expiryDate')} type="date" className="input max-w-xs" min={new Date().toISOString().split('T')[0]} />
          </div>
        </motion.div>

        {/* Images */}
        <motion.div className="glass-card space-y-4" variants={formInputVariants} initial="hidden" animate="show" transition={{ delay: 0.24 }}>
          <SectionHeading icon={Image} title={`Images (${totalImageCount}/5)`} />

          {/* Existing + New Preview */}
          {totalImageCount > 0 && (
            <div className="grid grid-cols-5 gap-3">
              {existingImages.map((url, i) => (
                <ExistingImageItem key={url} src={url} index={i} onRemove={removeExistingImage} />
              ))}
              {newImages.map((img, i) => (
                <NewImageItem key={i} src={img.preview} index={i} onRemove={removeNewImage} />
              ))}
              {totalImageCount < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600 hover:border-primary-500/60 hover:text-primary-400 transition-all"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          )}

          {totalImageCount === 0 && (
            <div
              className="border-2 border-dashed border-gray-700/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500/60 hover:bg-primary-500/5 transition-all group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="mx-auto text-gray-600 group-hover:text-primary-400 transition-colors mb-3" />
              <p className="text-gray-400 font-medium">Click to upload images</p>
              <p className="text-sm text-gray-600 mt-1">PNG, JPG, WebP · {totalImageCount}/5 selected</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={totalImageCount >= 5}
          />
        </motion.div>

        {/* Location */}
        <motion.div className="glass-card space-y-4" variants={formInputVariants} initial="hidden" animate="show" transition={{ delay: 0.30 }}>
          <SectionHeading icon={MapPin} title="Location" />
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">City <span className="text-red-400">*</span></label>
              <input {...register('locationCity')} placeholder="e.g. Mumbai" className={`input ${errors.locationCity ? 'input-error' : ''}`} />
              <FieldError msg={errors.locationCity?.message} />
            </div>
            <div className="form-group">
              <label className="label">State <span className="text-red-400">*</span></label>
              <div className="relative">
                <select {...register('locationState')} className={`input appearance-none pr-8 ${errors.locationState ? 'input-error' : ''}`}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <FieldError msg={errors.locationState?.message} />
            </div>
            <div className="form-group">
              <label className="label">Pincode</label>
              <input {...register('locationPincode')} placeholder="6-digit pincode" maxLength={6} className={`input ${errors.locationPincode ? 'input-error' : ''}`} />
              <FieldError msg={errors.locationPincode?.message} />
            </div>
          </div>

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
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${field.value ? 'bg-primary-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${field.value ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              )}
            />
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div className="glass-card" variants={formInputVariants} initial="hidden" animate="show" transition={{ delay: 0.36 }}>
          <SectionHeading icon={Tag} title="Tags" />
          <div className="form-group">
            <label className="label">Tags (comma-separated)</label>
            <input {...register('tags')} placeholder="e.g. school, textbooks, 2023" className="input" />
            <p className="text-xs text-gray-600 mt-1">Tags help receivers find your donation more easily</p>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div className="flex gap-4 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}>
          <Link to={`/donor/donations/${id}`} className="btn-secondary flex-1 justify-center">
            Cancel
          </Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
            {mutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

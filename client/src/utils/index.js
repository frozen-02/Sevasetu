import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
};

export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const truncate = (str, maxLength = 100) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    matched: 'primary',
    delivered: 'teal',
    cancelled: 'gray',
    draft: 'gray',
    expired: 'gray',
  };
  return colors[status] || 'gray';
};

export const getCategoryIcon = (category) => {
  const icons = {
    Education: '📚',
    Clothing: '👕',
    Electronics: '💻',
    Food: '🥗',
    Medical: '💊',
    Furniture: '🛋️',
    Books: '📖',
    Sports: '⚽',
    Others: '📦',
  };
  return icons[category] || '📦';
};

export const getCategoryColor = (category) => {
  const colors = {
    Education: 'text-blue-400 bg-blue-500/20',
    Clothing: 'text-pink-400 bg-pink-500/20',
    Electronics: 'text-cyan-400 bg-cyan-500/20',
    Food: 'text-green-400 bg-green-500/20',
    Medical: 'text-red-400 bg-red-500/20',
    Furniture: 'text-orange-400 bg-orange-500/20',
    Books: 'text-purple-400 bg-purple-500/20',
    Sports: 'text-yellow-400 bg-yellow-500/20',
    Others: 'text-gray-400 bg-gray-500/20',
  };
  return colors[category] || 'text-gray-400 bg-gray-500/20';
};

export const getConditionColor = (condition) => {
  const colors = {
    'New': 'text-green-400',
    'Like New': 'text-teal-400',
    'Good': 'text-blue-400',
    'Fair': 'text-yellow-400',
    'Poor': 'text-red-400',
  };
  return colors[condition] || 'text-gray-400';
};

export const getUrgencyColor = (level) => {
  const colors = {
    critical: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'gray',
  };
  return colors[level] || 'gray';
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

export const CATEGORIES = [
  'Education', 'Clothing', 'Electronics', 'Food',
  'Medical', 'Furniture', 'Books', 'Sports', 'Others',
];

export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];

export const buildFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item instanceof File) {
          formData.append(key, item);
        } else {
          formData.append(key, typeof item === 'object' ? JSON.stringify(item) : item);
        }
      });
    } else {
      formData.append(key, value);
    }
  });
  return formData;
};

export const getApiError = (error) => {
  return error?.response?.data?.message || error?.message || 'Something went wrong';
};

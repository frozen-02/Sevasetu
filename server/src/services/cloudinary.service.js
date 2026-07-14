import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/appError.js';

const isDev = process.env.NODE_ENV !== 'production';

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return (
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET &&
    CLOUDINARY_API_SECRET.length >= 20  // real secrets are 27 chars
  );
};

/**
 * Upload a buffer to Cloudinary.
 * In development without valid credentials, returns a placeholder image instead of crashing.
 */
export const uploadBufferToCloudinary = (buffer, folder, options = {}) => {
  // Dev-mode fallback — skip real upload when Cloudinary isn't configured
  if (!isCloudinaryConfigured()) {
    if (isDev) {
      console.warn('⚠️  Cloudinary not configured — using placeholder image for dev');
      return Promise.resolve({
        url: `https://placehold.co/600x400/1e1e2e/a78bfa?text=Image+${Date.now()}`,
        publicId: `dev_placeholder_${Date.now()}`,
        width: 600,
        height: 400,
        format: 'png',
        size: 0,
      });
    }
    throw new AppError('Image upload is not configured. Please contact support.', 503);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `sevasetu/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1200, crop: 'limit' },
        ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Upload multiple buffers
 */
export const uploadMultipleToCloudinary = async (files, folder) => {
  const uploads = files.map((file) => uploadBufferToCloudinary(file.buffer, folder));
  return Promise.all(uploads);
};

/**
 * Delete from Cloudinary by public ID
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured() || publicId?.startsWith('dev_placeholder')) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Cloudinary delete failed for ${publicId}: ${error.message}`);
  }
};

/**
 * Delete multiple images
 */
export const deleteMultipleFromCloudinary = async (publicIds) => {
  await Promise.allSettled(publicIds.map((id) => deleteFromCloudinary(id)));
};

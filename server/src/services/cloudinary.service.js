import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/appError.js';

/**
 * Upload a buffer to Cloudinary
 */
export const uploadBufferToCloudinary = (buffer, folder, options = {}) => {
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

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const splitFileName = (fileName) => {
  const match = fileName.match(/\.[^/.]+$/);
  const extension = match?.[0] || '';
  const base = fileName.replace(/\.[^/.]+$/, '');
  return { base, extension };
};

const makePublicId = (fileName) => {
  const { base, extension } = splitFileName(fileName);
  const timestamp = Date.now();
  // Keep extension in public_id for raw files
  return `${timestamp}_${base}${extension}`;
};

/**
 * Upload file to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} Upload result with URL and public_id
 */

export async function uploadToCloudinary(buffer, fileName) {
  return new Promise((resolve, reject) => {
    const publicId = makePublicId(fileName);
    const { extension } = splitFileName(fileName);

    console.log('Uploading to Cloudinary:', {
      fileName,
      extension,
      publicId,
      resourceType: 'raw'
    });
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // Use 'raw' for non-image files like PDFs, docs, etc.
        type: 'upload',
        access_mode: 'public',
        folder: 'pastebin',
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        // Don't specify format - let Cloudinary handle it based on the file extension
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload success:', {
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
            resource_type: result.resource_type
          });
          
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      invalidate: true
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

export default cloudinary;

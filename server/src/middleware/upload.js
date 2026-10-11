const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Dynamic Cloudinary storage supporting both optimized images and studio videos
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype && file.mimetype.startsWith('video/');
    if (isVideo) {
      return {
        folder: 'gk-autoherb/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov', 'm4v', 'avi'],
      };
    }

    return {
      folder: 'gk-autoherb',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max to support HD video clips
});

module.exports = upload;

import multer from 'multer';

// Configure multer for memory storage
const inMemoryStorage = multer.memoryStorage();

const acceptAnyFile = (req, file, cb) => {
  // Accept all file types
  // You can add restrictions here if needed
  cb(null, true);
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB limit (adjust as needed)

// Multer configuration
export const upload = multer({
  storage: inMemoryStorage,
  fileFilter: acceptAnyFile,
  limits: {
    fileSize: MAX_FILE_BYTES,
  }
});

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

/**
 * Validate upload request
 */
export const validateUpload = (req, res, next) => {
  const { text, expiryDate } = req.body;
  const file = req.file;

   const sendBadRequest = (message) => {
    return res.status(400).json({
      success: false,
      message
    });
  };

  // Must have either text or file
  if (!text && !file) {
    return sendBadRequest('Either text or file is required');
  }

  // Cannot have both text and file
  if (text && file) {
    return sendBadRequest('Cannot upload both text and file in a single request');
  }

  // Validate text length if provided
  if (text && text.length > 500000) { // 500KB text limit
    return sendBadRequest('Text content too large (max 500KB)');
  }

  // Validate expiry date if provided
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    
    if (isNaN(expiry.getTime())) {
      return sendBadRequest('Invalid expiry date format');
    }

    if (expiry <= now) {
      return sendBadRequest('Expiry date must be in the future');
    }
  }

  next();
};

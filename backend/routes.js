import https from 'https';
import http from 'http';
import express from 'express';
import { nanoid } from 'nanoid';
import { db } from './database.js';
import { upload, validateUpload } from './middleware.js';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary.js';
import cloudinary from './cloudinary.js';

const router = express.Router();

const extractForwardedIp = (req) => {
  const header = req.headers['x-forwarded-for'];
  if (Array.isArray(header)) return header[0];
  if (typeof header === 'string') return header.split(',')[0];
  return null;
};

const normalizeIp = (value) => {
  let ip = (value || '').trim();

  // Remove IPv4-mapped IPv6 prefix
  if (ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length);

  // Normalize IPv6 loopback
  if (ip === '::1') ip = '127.0.0.1';

  return ip;
};

const getClientIp = (req) => {
  const forwarded = extractForwardedIp(req);
  return normalizeIp(forwarded || req.ip || '');
};

const buildViewerKey = (req) => {
  const ip = getClientIp(req);
  const ua = (req.headers['user-agent'] || '').trim();
  return `${ip}|${ua}`;
};

const resolveCloudinaryUrlFromPublicId = async (publicId) => {
  const result = await cloudinary.api.resource(publicId, {
    resource_type: 'raw'
  });
  return result.secure_url || result.url;
};

const buildPreferredDownloadUrl = (paste) => {
  if (!paste.cloudinaryPublicId) return null;
  const ext = (paste.fileName || '').split('.').pop();
  const format = ext && ext !== paste.fileName ? ext : undefined;

  // If your Cloudinary delivery is private/ACL protected, signed URL is required.
  // This generates a short-lived signed URL that forces download.
  return cloudinary.utils.private_download_url(
    paste.cloudinaryPublicId,
    format,
    {
      resource_type: 'raw',
      type: 'upload',
      attachment: true
    }
  );
};

const streamUrlToResponse = ({ url, paste, res, redirectCount = 0, allowFallback = true }) => {
  const protocol = url.startsWith('https:') ? https : http;

  const request = protocol.get(
    url,
    {
      headers: {
        Accept: paste.fileType || 'application/octet-stream'
      }
    },
    (upstream) => {
      const status = upstream.statusCode || 0;
      const location = upstream.headers.location;

      // Follow redirects (Cloudinary can respond with 302/307)
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        if (redirectCount >= 5) {
          res.status(500).json({
            success: false,
            message: 'Too many redirects while fetching file'
          });
          upstream.resume();
          return;
        }

        const nextUrl = new URL(location, url).toString();
        upstream.resume();
        streamUrlToResponse({ url: nextUrl, paste, res, redirectCount: redirectCount + 1, allowFallback });
        return;
      }

      if (status !== 200) {
        // If delivery is private, Cloudinary can return 401/403.
        // In that case, try a signed URL based on public id.
        if (allowFallback && (status === 401 || status === 403) && paste.cloudinaryPublicId) {
          try {
            const signedUrl = cloudinary.utils.private_download_url(
              paste.cloudinaryPublicId,
              undefined,
              {
                resource_type: 'raw',
                attachment: true
              }
            );
            upstream.resume();
            streamUrlToResponse({ url: signedUrl, paste, res, redirectCount: 0, allowFallback: false });
            return;
          } catch (e) {
            console.error('Failed generating signed Cloudinary URL:', e);
          }
        }

        // If the stored URL is stale/wrong, Cloudinary can respond 404.
        // In that case, resolve the correct URL from publicId via Cloudinary Admin API.
        if (allowFallback && status === 404 && paste.cloudinaryPublicId) {
          upstream.resume();
          resolveCloudinaryUrlFromPublicId(paste.cloudinaryPublicId)
            .then((resolvedUrl) => {
              if (!resolvedUrl) {
                res.status(500).json({
                  success: false,
                  message: 'Cloudinary resource resolved but URL was missing'
                });
                return;
              }
              streamUrlToResponse({ url: resolvedUrl, paste, res, redirectCount: 0, allowFallback: false });
            })
            .catch((err) => {
              console.error('Failed resolving Cloudinary resource URL:', err);
              if (!res.headersSent) {
                res.status(500).json({
                  success: false,
                  message: `Failed to fetch file from Cloudinary (status ${status})`
                });
              }
            });
          return;
        }

        res.status(500).json({
          success: false,
          message: `Failed to fetch file from Cloudinary (status ${status})`
        });
        upstream.resume();
        return;
      }

      res.setHeader('Content-Type', paste.fileType || upstream.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${paste.fileName || 'download'}"`);
      if (upstream.headers['content-length']) {
        res.setHeader('Content-Length', upstream.headers['content-length']);
      }

      upstream.pipe(res);
    }
  );

  request.on('error', (err) => {
    console.error('Download proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to download file'
      });
    }
  });
};

/**
 * GET /api/download/:id
 * Download file by ID (proxy to Cloudinary)
 */
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    const viewerKey = buildViewerKey(req);

    // Find paste
    const paste = db.findById(id, viewerKey, 3000, true);

    if (!paste) {
      return res.status(404).json({
        success: false,
        message: 'Paste not found or has expired'
      });
    }

    // Check password if protected
    if (paste.password && paste.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Password required'
      });
    }

    // Only allow file downloads
    if (paste.type !== 'file') {
      return res.status(400).json({
        success: false,
        message: 'Only files can be downloaded'
      });
    }

    // Direct Cloudinary delivery for this asset returns 401 (ACL deny),
    // so prefer signed URL based on public id.
    let preferredUrl = null;
    try {
      preferredUrl = buildPreferredDownloadUrl(paste);
    } catch (e) {
      console.error('Failed generating signed URL:', e);
    }

    return streamUrlToResponse({ url: preferredUrl || paste.content, paste, res });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/upload
 * Upload text or file and get shareable link
 */
router.post('/upload', upload.single('file'), validateUpload, async (req, res, next) => {
  try {
    const { text, expiryDate, password, maxViews, isOneTime } = req.body;
    const file = req.file;

    // Generate unique ID (11 characters, URL-safe)
    const id = nanoid(11);

    // Calculate expiry time
    const defaultExpiryMinutes = parseInt(process.env.DEFAULT_EXPIRY_MINUTES) || 10;
    const expiresAt = expiryDate 
      ? new Date(expiryDate)
      : new Date(Date.now() + defaultExpiryMinutes * 60 * 1000);

    let pasteData = {
      id,
      expiresAt,
      password: password || null,
      maxViews: maxViews ? (parseInt(maxViews) + 1) : null,
      isOneTime: isOneTime === 'true' || isOneTime === true
    };

    // Handle text upload
    if (text) {
      pasteData.type = 'text';
      pasteData.content = text;
    }
    // Handle file upload
    else if (file) {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file.buffer, file.originalname);

      pasteData.type = 'file';
      pasteData.content = uploadResult.url;
      pasteData.fileName = file.originalname;
      pasteData.fileSize = file.size;
      pasteData.fileType = file.mimetype;
      pasteData.cloudinaryPublicId = uploadResult.publicId;
    }

    // Save to database
    const paste = db.create(pasteData);

    // Generate shareable URL
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paste/${id}`;

    res.status(201).json({
      success: true,
      data: {
        id: paste.id,
        url: shareUrl,
        type: paste.type,
        expiresAt: paste.expiresAt,
        createdAt: paste.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/paste/:id
 * Retrieve paste by ID
 */
router.get('/paste/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    const viewerKey = buildViewerKey(req);

    // Find paste
    const paste = db.findById(id, viewerKey);

    if (!paste) {
      return res.status(404).json({
        success: false,
        message: 'Paste not found or has expired'
      });
    }

    // Check password if protected
    if (paste.password && paste.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Password required',
        requiresPassword: true
      });
    }

    // Increment view count on successful link open for both text and file.
    // Max views should limit how many times the share link can be opened.
    db.incrementViewCount(id, viewerKey);

    // Return paste data (excluding sensitive fields)
    res.json({
      success: true,
      data: {
        id: paste.id,
        type: paste.type,
        content: paste.content,
        fileName: paste.fileName,
        fileSize: paste.fileSize,
        fileType: paste.fileType,
        cloudinaryPublicId: paste.cloudinaryPublicId,
        expiresAt: paste.expiresAt,
        createdAt: paste.createdAt,
        viewCount: paste.viewCount,
        isOneTime: paste.isOneTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/paste/:id
 * Manually delete a paste
 */
router.delete('/paste/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    // Find paste
    const paste = db.findById(id);

    if (!paste) {
      return res.status(404).json({
        success: false,
        message: 'Paste not found'
      });
    }

    // Check password if protected
    if (paste.password && paste.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Delete from Cloudinary if it's a file
    if (paste.type === 'file' && paste.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(paste.cloudinaryPublicId);
      } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
      }
    }

    // Delete from database
    db.delete(id);

    res.json({
      success: true,
      message: 'Paste deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/stats
 * Get database statistics (for debugging)
 */
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json({
    success: true,
    data: stats
  });
});

export default router;

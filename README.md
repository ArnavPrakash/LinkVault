# LinkVault - Secure File & Text Sharing Application

A modern, secure LinkVault-like application built with React, Node.js, and Express that allows users to share text and files through encrypted, auto-expiring links.

## 🎯 Features

### Core Features
- **Text & File Upload**: Upload either plain text or any file type (max 10MB)
- **Unique Shareable Links**: Generate secure, hard-to-guess URLs using nanoid
- **Auto-Expiration**: Default 10-minute expiry with custom date/time options
- **Access Control**: Content only accessible via exact link (no public listing)
- **Graceful Expiry Handling**: Expired links handled with proper error messages
- **Password Protection**: Secure pastes with optional password
- **One-Time View**: Links that self-destruct after first view
- **View Count Limits**: Set maximum number of views before deletion
- **Real-time Stats**: View count and expiry countdown
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Cloudinary Integration**: Reliable cloud storage for uploaded files

## 📋 Database Schema

### Paste Model

```
{
  id: String,              // Unique identifier (nanoid, 11 chars)
  type: String,            // 'text' or 'file'
  content: String,         // Text content OR file URL (Cloudinary)
  fileName: String|null,   // Original filename (files only)
  fileSize: Number|null,   // File size in bytes (files only)
  fileType: String|null,   // MIME type (files only)
  cloudinaryPublicId: String|null, // Cloudinary ID for deletion
  expiresAt: Date,         // Expiration timestamp
  createdAt: Date,         // Creation timestamp
  viewCount: Number,       // Number of times accessed
  maxViews: Number|null,   // Max allowed views (optional)
  password: String|null,   // Password protection (optional)
  isOneTime: Boolean,      // One-time view flag
  isDeleted: Boolean       // Soft delete flag
}
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Cloudinary account (free tier)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Start the backend server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

5. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### Production Build

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

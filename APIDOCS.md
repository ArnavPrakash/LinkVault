## 📡 API Documentation

### Base URL
```
http://localhost:5001/api
```

### Endpoints

#### 1. Upload Paste
```http
POST /api/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `text` (string, optional): Text content to upload
- `file` (file, optional): File to upload (max 10MB)
- `expiryDate` (datetime, optional): Custom expiry date
- `password` (string, optional): Password protection
- `maxViews` (number, optional): Maximum view count
- `isOneTime` (boolean, optional): One-time view flag

**Note**: Either `text` OR `file` is required, not both.

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "url": "http://localhost:5173/paste/abc123xyz",
    "type": "text",
    "expiresAt": "2026-02-13T09:30:00.000Z",
    "createdAt": "2026-02-13T09:20:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Either text or file is required"
}
```

#### 2. Retrieve Paste
```http
GET /api/paste/:id?password=optional_password
```

**Query Parameters:**
- `password` (string, optional): Password if paste is protected

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "type": "text",
    "content": "Hello World!",
    "fileName": null,
    "fileSize": null,
    "fileType": null,
    "expiresAt": "2026-02-13T09:30:00.000Z",
    "createdAt": "2026-02-13T09:20:00.000Z",
    "viewCount": 5,
    "isOneTime": false
  }
}
```

**Error Responses:**

404 - Not Found:
```json
{
  "success": false,
  "message": "Paste not found or has expired"
}
```

401 - Password Required:
```json
{
  "success": false,
  "message": "Password required",
  "requiresPassword": true
}
```

#### 3. Delete Paste
```http
DELETE /api/paste/:id?password=optional_password
```

**Query Parameters:**
- `password` (string, optional): Password if paste is protected

**Success Response (200):**
```json
{
  "success": true,
  "message": "Paste deleted successfully"
}
```

#### 4. Get Statistics (Debug)
```http
GET /api/stats
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "active": 45,
    "deleted": 30,
    "expired": 25
  }
}
```

#### 5. Health Check
```http
GET /health
```

**Success Response (200):**
```json
{
  "status": "OK",
  "message": "LinkVault API is running",
  "timestamp": "2026-02-13T09:20:00.000Z"
}
```
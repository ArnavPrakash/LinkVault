/**
 * In-memory database for paste storage
 * In production, replace with MongoDB, PostgreSQL, or any persistent database
 */

class PasteDatabase {
  constructor() {
    this.pastes = new Map(); // Map<id, paste>
  }

  _isExpired(paste) {
    return new Date() > new Date(paste.expiresAt);
  }

  _markDeleted(paste, reason) {
    paste.isDeleted = true;
    paste.deletedReason = reason;
  }

  _canViewerAccessDeletedPaste(paste, viewerKey, oneTimeGraceMs, allowDeletedForViewerKey) {
    // If deleted due to maxViews, allow previously-approved viewer to continue (e.g., download)
    if (
      allowDeletedForViewerKey &&
      paste.deletedReason === 'maxViews' &&
      viewerKey &&
      paste.allowedViewerKeys?.has(viewerKey)
    ) {
      return true;
    }

    // Grace window for one-time pastes: allow the same viewer to complete initial load
    // if the paste was just consumed. Prevents immediate "Paste not found" due to
    // duplicate requests from the same browser.
    if (
      paste.isOneTime &&
      viewerKey &&
      paste.deletedByViewerKey === viewerKey &&
      typeof paste.deletedAtMs === 'number' &&
      Date.now() - paste.deletedAtMs < oneTimeGraceMs
    ) {
      return true;
    }

    return false;
  }

  /**
   * Create a new paste
   * @param {Object} pasteData - The paste data
   * @returns {Object} The created paste
   */
  create(pasteData) {
    const now = new Date();
    const paste = {
      id: pasteData.id,
      type: pasteData.type, // 'text' or 'file'
      content: pasteData.content, // text content or file URL
      fileName: pasteData.fileName || null,
      fileSize: pasteData.fileSize || null,
      fileType: pasteData.fileType || null,
      cloudinaryPublicId: pasteData.cloudinaryPublicId || null,
      expiresAt: pasteData.expiresAt,
      createdAt: now,
      viewCount: 0,
      maxViews: pasteData.maxViews || null,
      password: pasteData.password || null,
      isOneTime: pasteData.isOneTime || false,
      isDeleted: false,
      deletedReason: null,
      deletedAtMs: null,
      deletedByViewerKey: null,
      allowedViewerKeys: new Set(),
      recentViewers: new Map() // Map<viewerKey, lastCountedAtMs>
    };

    this.pastes.set(paste.id, paste);
    return paste;
  }

  /**
   * Find paste by ID
   * @param {string} id - The paste ID
   * @param {string|null} viewerKey - Optional viewer fingerprint
   * @param {number} oneTimeGraceMs - Allow same viewer to fetch briefly after one-time deletion
   * @param {boolean} allowDeletedForViewerKey - Allow access for viewerKey even if deleted due to maxViews
   * @returns {Object|null} The paste or null
   */
  findById(id, viewerKey = null, oneTimeGraceMs = 3000, allowDeletedForViewerKey = false) {
    const paste = this.pastes.get(id);
    
    if (!paste) return null;

    // Check if expired (expiry should override any grace access)
    if (this._isExpired(paste)) {
      this._markDeleted(paste, 'expired');
      return null;
    }

    if (paste.isDeleted) {
      return this._canViewerAccessDeletedPaste(paste, viewerKey, oneTimeGraceMs, allowDeletedForViewerKey)
        ? paste
        : null;
    }

    return paste;
  }

  /**
   * Increment view count
   * @param {string} id - The paste ID
   * @param {string|null} viewerKey - Optional viewer fingerprint for dedupe
   * @param {number} dedupeWindowMs - Window in ms within which duplicate views are ignored
   * @returns {boolean} true if view was incremented
   */
  incrementViewCount(id, viewerKey = null, dedupeWindowMs = 3000) {
    const paste = this.pastes.get(id);
    if (!paste) return false;

    const nowMs = Date.now();

    if (viewerKey) {
      const lastCountedAt = paste.recentViewers?.get(viewerKey);
      if (typeof lastCountedAt === 'number' && nowMs - lastCountedAt < dedupeWindowMs) {
        return false;
      }
      paste.recentViewers?.set(viewerKey, nowMs);
    }

    paste.viewCount += 1;

    if (viewerKey) {
      paste.allowedViewerKeys?.add(viewerKey);
    }

    // Enforce max views after counting this view
    if (paste.maxViews && paste.viewCount >= paste.maxViews) {
      this._markDeleted(paste, 'maxViews');
    }

    // If one-time view, mark as deleted
    if (paste.isOneTime && paste.viewCount >= 1) {
      this._markDeleted(paste, 'oneTime');
      paste.deletedAtMs = nowMs;
      paste.deletedByViewerKey = viewerKey || null;
    }

    return true;
  }

  /**
   * Delete paste by ID
   * @param {string} id - The paste ID
   * @returns {boolean} True if deleted, false otherwise
   */
  delete(id) {
    const paste = this.pastes.get(id);
    if (paste) {
      paste.isDeleted = true;
      return true;
    }
    return false;
  }

  /**
   * Clean up expired pastes
   * @returns {number} Number of pastes cleaned
   */
  cleanExpired() {
    let count = 0;
    const now = new Date();

    for (const [id, paste] of this.pastes.entries()) {
      if (!paste.isDeleted && new Date(paste.expiresAt) < now) {
        paste.isDeleted = true;
        count++;
      }
    }

    return count;
  }

  /**
   * Get all paste IDs (for debugging)
   * @returns {Array} Array of paste IDs
   */
  getAllIds() {
    return Array.from(this.pastes.keys());
  }

  /**
   * Get database stats
   * @returns {Object} Database statistics
   */
  getStats() {
    const total = this.pastes.size;
    let active = 0;
    let deleted = 0;
    let expired = 0;

    const now = new Date();
    for (const paste of this.pastes.values()) {
      if (paste.isDeleted) {
        deleted++;
      } else if (new Date(paste.expiresAt) < now) {
        expired++;
      } else {
        active++;
      }
    }

    return { total, active, deleted, expired };
  }
}

// Export singleton instance
export const db = new PasteDatabase();

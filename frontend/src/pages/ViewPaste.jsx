import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Download, Copy, Lock, Eye, Clock, 
  AlertTriangle, Home, Trash2, CheckCircle 
} from 'lucide-react';
import { getPaste, deletePaste } from '../utils/api';
import { 
  copyToClipboard, 
  downloadFile, 
  formatFileSize, 
  formatCountdown,
  formatRelativeTime 
} from '../utils/helpers';

function ViewPaste() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [paste, setPaste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    loadPaste();
  }, [id]);

  useEffect(() => {
    if (paste?.expiresAt) {
      const updateCountdown = () => {
        setCountdown(formatCountdown(paste.expiresAt));
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000);
      return () => clearInterval(interval);
    }
  }, [paste]);

  const loadPaste = async (pwd = '') => {
    try {
      setLoading(true);
      setError('');
      const response = await getPaste(id, pwd);
      
      if (response.success) {
        setPaste(response.data);
        setRequiresPassword(false);
      }
    } catch (err) {
      if (err.response?.data?.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load paste');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      loadPaste(password);
    }
  };

  const handleCopy = async () => {
    if (paste?.content && paste.type === 'text') {
      const success = await copyToClipboard(paste.content);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };


  const handleDownload = async () => {
    if (paste?.type === 'file') {
      try {
        // Create download URL using backend proxy
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const downloadUrl = `${baseUrl}/download/${id}${password ? `?password=${encodeURIComponent(password)}` : ''}`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = paste.fileName || 'download';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback: open Cloudinary URL in new tab
        window.open(paste.content, '_blank');
      }
    }
  };

//   const handleDownload = () => {
//   if (paste?.type === 'file') {
//     // Create a temporary link with download attribute
//     const link = document.createElement('a');
//     link.href = paste.content;
//     link.download = paste.fileName || 'download';
//     link.target = '_blank';
//     link.rel = 'noopener noreferrer';
    
//     // Append to body, click, and remove
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   }
// };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this paste?')) return;
    
    try {
      setDeleting(true);
      await deletePaste(id, password || null);
      setDeleted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete paste');
    } finally {
      setDeleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  // Deleted state
  if (deleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">Deleted</h2>
            <p className="text-sm text-slate-600 mt-2">This link is no longer available.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 mt-5"
            >
              <Home className="w-4 h-4" />
              Create a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Password required state
  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Password required</h2>
                <p className="text-sm text-slate-600 mt-1">Enter the password to view this content.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                autoFocus
              />

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" className="w-full glass-button py-2.5 font-semibold">
                Unlock
              </button>

              <Link to="/" className="block text-center text-sm text-slate-600 hover:text-slate-900">
                Back to home
              </Link>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">Not found</h2>
            <p className="text-sm text-slate-600 mt-2">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 mt-5"
            >
              <Home className="w-4 h-4" />
              Create a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success - show paste
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                {paste.type === 'text' ? <FileText className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  {paste.type === 'text' ? 'Text' : paste.fileName}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {paste.type === 'file' && `${formatFileSize(paste.fileSize)} • `}
                  Created {formatRelativeTime(paste.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Views</p>
              <p className="text-sm font-medium text-slate-900 mt-1 inline-flex items-center gap-1">
                <Eye className="w-4 h-4 text-slate-600" />
                {paste.viewCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Expires in</p>
              <p className="text-sm font-medium text-slate-900 mt-1 inline-flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-600" />
                {countdown}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Type</p>
              <p className="text-sm font-medium text-slate-900 mt-1 capitalize">{paste.type}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">ID</p>
              <p className="text-sm font-mono text-slate-900 mt-1">{paste.id}</p>
            </div>
          </div>

          {paste.isOneTime && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900 inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <strong>One-time view:</strong> This content is removed after you close the page.
              </p>
            </div>
          )}
        </div>

        <div className="glass-card p-6 mt-6">
          {paste.type === 'text' ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Content</h2>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words text-slate-900">
                  {paste.content}
                </pre>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">File</h2>
                <button
                  onClick={handleDownload}
                  className="glass-button px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3">
                  <Download className="w-5 h-5 text-slate-700" />
                </div>
                <p className="text-sm font-medium text-slate-900">{paste.fileName}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {formatFileSize(paste.fileSize)} • {paste.fileType}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewPaste;

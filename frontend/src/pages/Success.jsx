import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Copy, Home, Clock, ExternalLink } from 'lucide-react';
import { copyToClipboard, formatCountdown } from '../utils/helpers';

function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState('');

  const data = location.state?.data;

  useEffect(() => {
    if (!data) {
      navigate('/');
    }
  }, [data, navigate]);

  useEffect(() => {
    if (data?.expiresAt) {
      const updateCountdown = () => {
        setCountdown(formatCountdown(data.expiresAt));
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [data]);

  const handleCopy = async () => {
    if (data?.url) {
      const success = await copyToClipboard(data.url);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  if (!data) return null;

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Link created</h1>
              <p className="text-slate-600 mt-1">Copy the URL below and share it with the recipient.</p>
            </div>
          </div>

          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Home className="w-4 h-4" />
            New link
          </Link>
        </div>

        <div className="glass-card p-6">
          <label className="block text-xs font-medium text-slate-600 mb-2">Shareable URL</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={data.url}
              readOnly
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <button
              onClick={handleCopy}
              className="glass-button px-4 py-2.5 font-semibold inline-flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Type</p>
              <p className="text-sm font-medium text-slate-900 capitalize mt-1">{data.type}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Expires in</p>
              <p className="text-sm font-medium text-slate-900 mt-1 inline-flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-600" />
                {countdown}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Created</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {new Date(data.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">ID</p>
              <p className="text-sm font-mono text-slate-900 mt-1">{data.id}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            to="/"
            className="sm:hidden inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Home className="w-4 h-4" />
            Create another
          </Link>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <ExternalLink className="w-4 h-4" />
            Open link
          </a>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>Reminder:</strong> Save this URL. After {countdown}, it will no longer be accessible.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Success;

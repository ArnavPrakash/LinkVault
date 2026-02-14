import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Link2, Clock, Shield, Zap, Eye, EyeOff } from 'lucide-react';
import { uploadPaste } from '../utils/api';
import { formatFileSize } from '../utils/helpers';

function Home() {
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState('text'); // 'text' or 'file'
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [password, setPassword] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [isOneTime, setIsOneTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();

      if (uploadType === 'text') {
        if (!text.trim()) {
          setError('Please enter some text');
          setLoading(false);
          return;
        }
        formData.append('text', text);
      } else {
        if (!file) {
          setError('Please select a file');
          setLoading(false);
          return;
        }
        formData.append('file', file);
      }

      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (password) formData.append('password', password);
      if (maxViews) formData.append('maxViews', maxViews);
      if (isOneTime) formData.append('isOneTime', 'true');

      const response = await uploadPaste(formData);

      if (response.success) {
        // Navigate to success page with data
        navigate('/success', { state: { data: response.data } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">LinkVault</h1>
              <p className="text-slate-600 mt-1">
                Share text or files using expiring links with optional access controls.
              </p>
            </div>
          </div>

          <div className="hidden md:block text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">Limits</p>
            <p className="text-sm text-slate-700 mt-1">Files up to 10MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Create a link</h2>
                  <p className="text-sm text-slate-600">Choose the content type and upload.</p>
                </div>

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setUploadType('text')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      uploadType === 'text'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline -mt-0.5 mr-2" />
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadType('file')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      uploadType === 'file'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-4 h-4 inline -mt-0.5 mr-2" />
                    File
                  </button>
                </div>
              </div>

              {uploadType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Text</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste or type your text…"
                    className="w-full h-72 bg-white border border-slate-200 rounded-xl p-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none font-mono text-sm"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">File</label>
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={loading}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center gap-2 py-10 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-slate-700" />
                      </div>
                      {file ? (
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-600 mt-1">{formatFileSize(file.size)}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-slate-700">Click to choose a file</p>
                          <p className="text-xs text-slate-500 mt-1">Max 10MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between pt-2">
                <p className="text-xs text-slate-500">
                  By creating a link, you can optionally add expiry, password, and view limits.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button px-5 py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Uploading
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Create link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Access controls</h3>
              <Shield className="w-4 h-4 text-slate-700" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Expires at</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">If empty, default expiry applies.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Max link opens</label>
                <input
                  type="number"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  disabled={loading}
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOneTime}
                    onChange={(e) => setIsOneTime(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                    disabled={loading}
                  />
                  <span className="text-sm text-slate-700">One-time view</span>
                </label>
                <p className="text-xs text-slate-500 mt-2">
                  When enabled, the content is removed after the first successful view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

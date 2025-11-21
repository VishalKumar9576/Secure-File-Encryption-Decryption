import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, Download, Trash2, Share2, Key, ArrowLeft,
  Eye, EyeOff, Search, Filter, Loader
} from 'lucide-react';
import { fileService } from '../services/fileService';
import { shareService } from '../services/shareService';
import { EncryptedFile } from '../lib/supabase';
import { CryptoUtils } from '../utils/crypto';

export default function Files() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<EncryptedFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<EncryptedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<EncryptedFile | null>(null);
  const [decryptKey, setDecryptKey] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [shareModal, setShareModal] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    password: '',
    expiryHours: 24,
    oneTimeView: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadFiles();
  }, [user, navigate]);

  useEffect(() => {
    filterFiles();
  }, [files, searchTerm, showDeleted]);

  const loadFiles = async () => {
    if (!user) return;
    try {
      const allFiles = await fileService.getFiles(user.id, true);
      setFiles(allFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    let filtered = files;

    if (!showDeleted) {
      filtered = filtered.filter(f => !f.is_deleted);
    }

    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFiles(filtered);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDecrypt = async () => {
    if (!selectedFile || !user || !decryptKey) {
      setDecryptError('Please enter a decryption key');
      return;
    }

    setDecrypting(true);
    setDecryptError('');

    try {
      const key = await CryptoUtils.importKey(decryptKey);
      const decrypted = await fileService.decryptFile(selectedFile, key, user.id);

      const mimeType = selectedFile.file_type || 'application/octet-stream';
      const fileName = selectedFile.file_name;

      CryptoUtils.createDownloadLink(decrypted, fileName, mimeType);

      setSelectedFile(null);
      setDecryptKey('');
    } catch (error) {
      setDecryptError(
        error instanceof Error ? error.message : 'Decryption failed'
      );
    } finally {
      setDecrypting(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!user) return;
    if (window.confirm('Delete this file?')) {
      try {
        await fileService.deleteFile(fileId, user.id);
        await loadFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleRestore = async (fileId: string) => {
    if (!user) return;
    try {
      await fileService.restoreFile(fileId, user.id);
      await loadFiles();
    } catch (error) {
      console.error('Error restoring file:', error);
    }
  };

  const handleCreateShare = async (fileId: string) => {
    if (!user) return;

    try {
      const share = await shareService.createShareLink({
        fileId,
        userId: user.id,
        password: shareConfig.password || undefined,
        expiryHours: shareConfig.expiryHours,
        oneTimeView: shareConfig.oneTimeView,
      });

      const shareUrl = shareService.generateShareUrl(share.token);

      navigator.clipboard.writeText(shareUrl);
      alert(`Share link copied to clipboard!\n\n${shareUrl}`);

      setShareModal(false);
      setShareConfig({
        password: '',
        expiryHours: 24,
        oneTimeView: false,
      });
    } catch (error) {
      console.error('Error creating share:', error);
      alert('Failed to create share link');
    }
  };

  const handleRegenerateKey = async (fileId: string) => {
    if (!user) return;
    if (!window.confirm('Generate a new encryption key for this file? This will re-encrypt it.')) {
      return;
    }

    try {
      const oldKey = await CryptoUtils.generateKey();
      await fileService.regenerateFileKey(fileId, oldKey, user.id);
      alert('Key regenerated successfully!');
      await loadFiles();
    } catch (error) {
      console.error('Error regenerating key:', error);
      alert('Failed to regenerate key');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Files</h1>
          <p className="text-gray-600 dark:text-gray-400">View, decrypt, and manage your encrypted files</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showDeleted
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>{showDeleted ? 'Show All' : 'Show Deleted'}</span>
            </button>
            <Link
              to="/upload"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Upload New
            </Link>
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {files.length === 0 ? 'No files yet' : 'No matching files'}
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Upload Your First File
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {file.thumbnail_data && (
                        <img
                          src={file.thumbnail_data}
                          alt={file.file_name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      {!file.thumbnail_data && (
                        <FileText className="w-12 h-12 text-blue-600" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white break-words">
                          {file.file_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                    {file.is_deleted && (
                      <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Deleted on {formatDate(file.deleted_at || '')}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFile(file)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Decrypt</span>
                    </button>

                    {!file.is_deleted && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedFile(file);
                            setShareModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>

                        <button
                          onClick={() => handleRegenerateKey(file.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Key className="w-4 h-4" />
                          <span>Rotate Key</span>
                        </button>

                        <button
                          onClick={() => handleDelete(file.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}

                    {file.is_deleted && (
                      <button
                        onClick={() => handleRestore(file.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Key className="w-4 h-4" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFile && !shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Decrypt File
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedFile.file_name}
            </p>

            {decryptError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">{decryptError}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Encryption Key
              </label>
              <textarea
                value={decryptKey}
                onChange={(e) => setDecryptKey(e.target.value)}
                placeholder="Paste your encryption key here"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                This key was generated when you uploaded the file. Keep it safe!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setDecryptKey('');
                  setDecryptError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDecrypt}
                disabled={decrypting || !decryptKey}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {decrypting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Decrypting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFile && shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Share File
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedFile.file_name}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password (Optional)
                </label>
                <input
                  type="password"
                  value={shareConfig.password}
                  onChange={(e) =>
                    setShareConfig({ ...shareConfig, password: e.target.value })
                  }
                  placeholder="Leave empty for no password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expiry Time
                </label>
                <select
                  value={shareConfig.expiryHours}
                  onChange={(e) =>
                    setShareConfig({
                      ...shareConfig,
                      expiryHours: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value={1}>1 Hour</option>
                  <option value={24}>1 Day</option>
                  <option value={168}>1 Week</option>
                  <option value={720}>1 Month</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareConfig.oneTimeView}
                  onChange={(e) =>
                    setShareConfig({
                      ...shareConfig,
                      oneTimeView: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  One-time view only
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShareModal(false);
                  setSelectedFile(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateShare(selectedFile.id)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Create Share Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

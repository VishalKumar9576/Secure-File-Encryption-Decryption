import { useState, useRef, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Upload as UploadIcon, X, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { fileService } from '../services/fileService';
import { CryptoUtils } from '../utils/crypto';

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string>('');
  const [showKeySaved, setShowKeySaved] = useState(false);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);
    setErrors([]);
    setSuccess(false);
    setEncryptionKey('');
    setShowKeySaved(false);

    const newErrors: string[] = [];
    let lastKey: string = '';

    for (const file of files) {
      try {
        setProgress(prev => ({ ...prev, [file.name]: 0 }));

        const key = await CryptoUtils.generateKey();
        lastKey = await CryptoUtils.exportKey(key);

        setProgress(prev => ({ ...prev, [file.name]: 50 }));

        await fileService.uploadEncryptedFile(file, key, user.id);

        setProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        newErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }

    setUploading(false);

    if (newErrors.length === 0) {
      setSuccess(true);
      setEncryptionKey(lastKey);
      setFiles([]);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Files</h1>
          <p className="text-gray-600 dark:text-gray-400">Encrypt and securely store your files</p>
        </div>

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-bold mb-2">Files uploaded successfully!</p>
              </div>
            </div>

            {encryptionKey && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase">
                  IMPORTANT: Save Your Encryption Key
                </p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={encryptionKey}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono border border-gray-300 dark:border-gray-600 rounded"
                    rows={4}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(encryptionKey);
                      setShowKeySaved(true);
                      setTimeout(() => setShowKeySaved(false), 2000);
                    }}
                    className="absolute top-2 right-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    {showKeySaved ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  You will need this key to decrypt your files later. Store it in a safe place!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/files')}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Go to My Files
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEncryptionKey('');
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Upload More
              </button>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Upload errors:</p>
            </div>
            <ul className="ml-8 list-disc space-y-1">
              {errors.map((error, i) => (
                <li key={i} className="text-sm text-red-600 dark:text-red-400">{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <UploadIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Drop files here or click to upload
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Supports: PDF, TXT, PNG, JPG, DOCX, ZIP, and more
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              disabled={uploading}
            >
              Select Files
            </button>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Selected Files ({files.length})
              </h4>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                        {uploading && progress[file.name] !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progress[file.name]}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Encrypting and Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5" />
                    <span>Encrypt and Upload</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

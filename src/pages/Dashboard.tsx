import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload, FileText, Shield, Share2, Trash2, Moon, Sun,
  LogOut, Settings, Activity, User, Menu, X
} from 'lucide-react';
import { fileService } from '../services/fileService';
import { EncryptedFile } from '../lib/supabase';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [files, setFiles] = useState<EncryptedFile[]>([]);
  const [stats, setStats] = useState({ totalFiles: 0, deletedFiles: 0, totalSize: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [filesData, statsData] = await Promise.all([
        fileService.getFiles(user.id, false),
        fileService.getStats(user.id)
      ]);

      setFiles(filesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SecureVault</h1>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {profile?.full_name || user?.email}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="text-gray-700 dark:text-gray-300">Toggle Theme</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your encrypted files and data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalFiles}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Total Files</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatFileSize(stats.totalSize)}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Storage Used</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.deletedFiles}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Deleted Files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            to="/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 shadow-sm transition-colors group"
          >
            <Upload className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold mb-1">Upload Files</h3>
            <p className="text-sm text-blue-100">Encrypt and upload new files</p>
          </Link>

          <Link
            to="/files"
            className="bg-white dark:bg-gray-800 hover:shadow-md rounded-xl p-6 shadow-sm transition-all group border border-gray-200 dark:border-gray-700"
          >
            <FileText className="w-8 h-8 mb-3 text-blue-600 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">My Files</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">View and manage files</p>
          </Link>

          <Link
            to="/notes"
            className="bg-white dark:bg-gray-800 hover:shadow-md rounded-xl p-6 shadow-sm transition-all group border border-gray-200 dark:border-gray-700"
          >
            <FileText className="w-8 h-8 mb-3 text-green-600 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Secure Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Encrypted notes vault</p>
          </Link>

          <Link
            to="/shares"
            className="bg-white dark:bg-gray-800 hover:shadow-md rounded-xl p-6 shadow-sm transition-all group border border-gray-200 dark:border-gray-700"
          >
            <Share2 className="w-8 h-8 mb-3 text-purple-600 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Share Links</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage shared files</p>
          </Link>
        </div>

        {profile?.role === 'admin' && (
          <div className="mb-8">
            <Link
              to="/admin"
              className="block bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl p-6 shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <Settings className="w-10 h-10" />
                <div>
                  <h3 className="text-xl font-semibold mb-1">Admin Panel</h3>
                  <p className="text-sm text-orange-100">Manage users, view analytics, and system health</p>
                </div>
              </div>
            </Link>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Files</h3>
          {files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No files uploaded yet</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Your First File</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {files.slice(0, 5).map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{file.file_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/files/${file.id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

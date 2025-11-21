import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Users, HardDrive, AlertCircle, TrendingUp, Activity,
  Download, Loader, Eye, EyeOff, Shield
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminService } from '../services/adminService';
import { activityLogService } from '../services/activityLog';
import { Profile, ActivityLog } from '../lib/supabase';

export default function Admin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [suspicious, setSuspicious] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs'>('overview');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadAdminData();
  }, [profile, navigate]);

  const loadAdminData = async () => {
    try {
      const [statsData, usersData, logsData, healthData, suspiciousData] = await Promise.all([
        adminService.getUserStats(),
        adminService.getAllUsers(),
        activityLogService.getAllLogs(500),
        adminService.getSystemHealth(),
        adminService.getSuspiciousActivity(),
      ]);

      setStats(statsData);
      setUsers(usersData);
      setLogs(logsData);
      setHealth(healthData);
      setSuspicious(suspiciousData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleExportLogs = async () => {
    try {
      await activityLogService.exportLogsToCSV(logs);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const statusColor = health?.status === 'healthy'
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : health?.status === 'warning'
      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  const statusTextColor = health?.status === 'healthy'
    ? 'text-green-600 dark:text-green-400'
    : health?.status === 'warning'
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Platform statistics and management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <Users className="w-10 h-10 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.totalUsers || 0}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Total Users</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-10 h-10 text-green-600" />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.totalFiles || 0}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Total Files</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <HardDrive className="w-10 h-10 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatBytes(stats?.totalSize || 0)}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Storage Used</p>
          </div>

          <div className={`rounded-xl p-6 shadow-sm border ${statusColor}`}>
            <div className="flex items-center justify-between">
              <Shield className={`w-10 h-10 ${statusTextColor}`} />
              <span className={`text-xl font-bold ${statusTextColor}`}>
                {health?.status?.toUpperCase()}
              </span>
            </div>
            <p className={`text-sm mt-2 ${statusTextColor}`}>System Status</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            System Health
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
              <span className="font-semibold text-gray-900 dark:text-white">{health?.successRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${health?.successRate}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Total Requests: {health?.totalRequests}</span>
              <span>Failed: {health?.failedRequests}</span>
            </div>
          </div>
        </div>

        {suspicious.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Suspicious Activity Detected
                </h3>
                <div className="space-y-2">
                  {suspicious.map((item, idx) => (
                    <p key={idx} className="text-sm text-red-700 dark:text-red-300">
                      {item.identifier}: {item.failedAttempts} failed login attempts
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Daily Activity
          </h2>
          {stats?.dailyActivity && stats.dailyActivity.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyActivity}>
                <CartesianGrid stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            File Types Distribution
          </h2>
          {stats?.fileTypeStats && Object.keys(stats.fileTypeStats).length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(stats.fileTypeStats).map(([type, count]) => ({
                name: type || 'Unknown',
                count,
              }))}>
                <CartesianGrid stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Activity Logs
            </h2>
            <button
              onClick={handleExportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Action
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 20).map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.user_id ? log.user_id.slice(0, 8) : 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { supabase, Profile } from '../lib/supabase';
import { activityLogService } from './activityLog';

class AdminService {
  async getAllUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getUserStats() {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, created_at');

    const { data: files } = await supabase
      .from('encrypted_files')
      .select('id, user_id, file_type, file_size, created_at');

    const { data: logs } = await supabase
      .from('activity_logs')
      .select('action, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalUsers = profiles?.length || 0;
    const totalFiles = files?.length || 0;
    const totalSize = files?.reduce((sum, f) => sum + f.file_size, 0) || 0;

    const fileTypeStats = files?.reduce((acc, f) => {
      acc[f.file_type] = (acc[f.file_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const dailyActivity = this.aggregateDailyData(logs || [], 30);
    const newUserGrowth = this.aggregateDailyData(profiles || [], 30);

    const encryptDecryptStats = logs?.reduce((acc, log) => {
      if (log.action === 'file_encrypt' || log.action === 'file_decrypt') {
        acc[log.action] = (acc[log.action] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalUsers,
      totalFiles,
      totalSize,
      fileTypeStats,
      dailyActivity,
      newUserGrowth,
      encryptDecryptStats,
    };
  }

  private aggregateDailyData(
    items: Array<{ created_at: string }>,
    days: number
  ): Array<{ date: string; count: number }> {
    const dailyCount: Record<string, number> = {};
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    items.forEach(item => {
      const date = new Date(item.created_at);
      if (date >= startDate) {
        const dateStr = date.toISOString().split('T')[0];
        dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;
      }
    });

    return Object.entries(dailyCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) throw error;
  }

  async getSuspiciousActivity() {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('action', 'failed_login')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const loginAttempts = data?.reduce((acc, log) => {
      const key = log.user_id || log.request_details?.email || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(loginAttempts)
      .filter(([_, count]) => count >= 3)
      .map(([identifier, count]) => ({
        identifier,
        failedAttempts: count,
      }));
  }

  async getSystemHealth() {
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();

    const { data: recentLogs } = await supabase
      .from('activity_logs')
      .select('status')
      .gte('created_at', hourAgo);

    const totalRequests = recentLogs?.length || 0;
    const failedRequests = recentLogs?.filter(log => log.status === 'failed').length || 0;
    const successRate = totalRequests > 0
      ? ((totalRequests - failedRequests) / totalRequests) * 100
      : 100;

    const { data: files } = await supabase
      .from('encrypted_files')
      .select('file_size');

    const totalStorage = files?.reduce((sum, f) => sum + f.file_size, 0) || 0;

    return {
      successRate: successRate.toFixed(2),
      totalRequests,
      failedRequests,
      totalStorage,
      status: successRate > 95 ? 'healthy' : successRate > 80 ? 'warning' : 'critical',
    };
  }
}

export const adminService = new AdminService();

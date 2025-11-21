import { supabase, ActivityLog } from '../lib/supabase';
import { CryptoUtils } from '../utils/crypto';

interface LogParams {
  userId?: string;
  action: string;
  status: string;
  endpoint?: string;
  requestDetails?: Record<string, unknown>;
  errorMessage?: string;
}

class ActivityLogService {
  async log(params: LogParams): Promise<void> {
    const deviceInfo = CryptoUtils.getDeviceInfo();

    const logEntry = {
      user_id: params.userId || null,
      action: params.action,
      status: params.status,
      ip_address: null,
      user_agent: navigator.userAgent,
      device_info: deviceInfo,
      endpoint: params.endpoint || null,
      request_details: params.requestDetails || {},
      error_message: params.errorMessage || null,
    };

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Activity log error:', error);
    }
  }

  async getUserLogs(userId: string, limit: number = 100): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getAllLogs(limit: number = 1000): Promise<ActivityLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async exportLogsToCSV(logs: ActivityLog[]): Promise<void> {
    const headers = [
      'ID',
      'User ID',
      'Action',
      'Status',
      'IP Address',
      'User Agent',
      'Device Info',
      'Endpoint',
      'Error Message',
      'Created At',
    ];

    const rows = logs.map(log => [
      log.id,
      log.user_id || '',
      log.action,
      log.status,
      log.ip_address || '',
      log.user_agent || '',
      JSON.stringify(log.device_info),
      log.endpoint || '',
      log.error_message || '',
      log.created_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async getActionStats(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('action');

    if (error) throw error;

    const stats: Record<string, number> = {};
    data?.forEach(log => {
      stats[log.action] = (stats[log.action] || 0) + 1;
    });

    return stats;
  }

  async getDailyActivity(days: number = 30): Promise<Array<{ date: string; count: number }>> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const dailyCount: Record<string, number> = {};
    data?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      dailyCount[date] = (dailyCount[date] || 0) + 1;
    });

    return Object.entries(dailyCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const activityLogService = new ActivityLogService();

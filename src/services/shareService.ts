import { supabase, ShareLink } from '../lib/supabase';
import { CryptoUtils } from '../utils/crypto';
import { activityLogService } from './activityLog';

interface CreateShareParams {
  fileId: string;
  userId: string;
  password?: string;
  expiryHours?: number;
  oneTimeView?: boolean;
  maxViews?: number;
}

class ShareService {
  async createShareLink(params: CreateShareParams): Promise<ShareLink> {
    try {
      const token = CryptoUtils.generateRandomToken(32);
      const expiresAt = params.expiryHours
        ? new Date(Date.now() + params.expiryHours * 60 * 60 * 1000).toISOString()
        : null;

      const passwordHash = params.password
        ? await CryptoUtils.hashPassword(params.password)
        : null;

      const shareData = {
        file_id: params.fileId,
        user_id: params.userId,
        token,
        password_hash: passwordHash,
        expires_at: expiresAt,
        one_time_view: params.oneTimeView || false,
        max_views: params.maxViews || null,
      };

      const { data, error } = await supabase
        .from('share_links')
        .insert(shareData)
        .select()
        .single();

      if (error) throw error;

      await activityLogService.log({
        userId: params.userId,
        action: 'share_create',
        status: 'success',
        requestDetails: {
          fileId: params.fileId,
          oneTimeView: params.oneTimeView,
          expiryHours: params.expiryHours,
        },
      });

      return data;
    } catch (error) {
      await activityLogService.log({
        userId: params.userId,
        action: 'share_create',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getShareByToken(token: string): Promise<ShareLink | null> {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async validateShareAccess(
    shareLink: ShareLink,
    password?: string
  ): Promise<boolean> {
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return false;
    }

    if (shareLink.max_views && shareLink.view_count >= shareLink.max_views) {
      return false;
    }

    if (shareLink.password_hash && password) {
      const hashedPassword = await CryptoUtils.hashPassword(password);
      if (hashedPassword !== shareLink.password_hash) {
        return false;
      }
    } else if (shareLink.password_hash && !password) {
      return false;
    }

    return true;
  }

  async incrementViewCount(shareId: string, userId?: string): Promise<void> {
    const { data: share } = await supabase
      .from('share_links')
      .select('*')
      .eq('id', shareId)
      .single();

    if (!share) return;

    const newViewCount = share.view_count + 1;

    await supabase
      .from('share_links')
      .update({ view_count: newViewCount })
      .eq('id', shareId);

    if (share.one_time_view || (share.max_views && newViewCount >= share.max_views)) {
      await supabase
        .from('share_links')
        .update({ is_active: false })
        .eq('id', shareId);
    }

    await activityLogService.log({
      userId: userId || null,
      action: 'share_access',
      status: 'success',
      requestDetails: {
        shareId,
        fileId: share.file_id,
      },
    });
  }

  async getUserShares(userId: string): Promise<ShareLink[]> {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async revokeShare(shareId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('share_links')
      .update({ is_active: false })
      .eq('id', shareId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteShare(shareId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('id', shareId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  generateShareUrl(token: string): string {
    return `${window.location.origin}/share/${token}`;
  }
}

export const shareService = new ShareService();

import { supabase, EncryptedFile } from '../lib/supabase';
import { CryptoUtils, EncryptionResult } from '../utils/crypto';
import { activityLogService } from './activityLog';

class FileService {
  async uploadEncryptedFile(
    file: File,
    key: CryptoKey,
    userId: string
  ): Promise<EncryptedFile> {
    try {
      const encryptionResult = await CryptoUtils.encryptFile(file, key);
      const thumbnail = await CryptoUtils.generateThumbnail(file);

      const keyString = await CryptoUtils.exportKey(key);
      const shares = CryptoUtils.splitSecretShamir(keyString);

      const fileData = {
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        encrypted_data: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        auth_tag: encryptionResult.authTag,
        storage_path: `files/${userId}/${Date.now()}_${file.name}`,
        thumbnail_data: thumbnail,
      };

      const { data: uploadedFile, error } = await supabase
        .from('encrypted_files')
        .insert(fileData)
        .select()
        .single();

      if (error) throw error;

      for (const share of shares) {
        await supabase.from('key_shares').insert({
          user_id: userId,
          file_id: uploadedFile.id,
          share_type: share.shareType,
          encrypted_share: share.encryptedShare,
        });
      }

      await activityLogService.log({
        userId,
        action: 'file_upload',
        status: 'success',
        requestDetails: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      });

      return uploadedFile;
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'file_upload',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getFiles(userId: string, includeDeleted: boolean = false): Promise<EncryptedFile[]> {
    let query = supabase
      .from('encrypted_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getFileById(fileId: string): Promise<EncryptedFile | null> {
    const { data, error } = await supabase
      .from('encrypted_files')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async decryptFile(
    file: EncryptedFile,
    key: CryptoKey,
    userId: string
  ): Promise<ArrayBuffer> {
    try {
      const decrypted = await CryptoUtils.decryptData(
        file.encrypted_data,
        file.iv,
        file.auth_tag,
        key
      );

      await supabase
        .from('encrypted_files')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', file.id);

      await activityLogService.log({
        userId,
        action: 'file_decrypt',
        status: 'success',
        requestDetails: {
          fileId: file.id,
          fileName: file.file_name,
        },
      });

      return decrypted;
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'file_decrypt',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        requestDetails: {
          fileId: file.id,
        },
      });
      throw error;
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('encrypted_files')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .eq('user_id', userId);

      if (error) throw error;

      await activityLogService.log({
        userId,
        action: 'file_delete',
        status: 'success',
        requestDetails: { fileId },
      });
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'file_delete',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async restoreFile(fileId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('encrypted_files')
        .update({
          is_deleted: false,
          deleted_at: null,
        })
        .eq('id', fileId)
        .eq('user_id', userId);

      if (error) throw error;

      await activityLogService.log({
        userId,
        action: 'file_restore',
        status: 'success',
        requestDetails: { fileId },
      });
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'file_restore',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async permanentlyDeleteFile(fileId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('encrypted_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getKeyShares(fileId: string, userId: string) {
    const { data, error } = await supabase
      .from('key_shares')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  async regenerateFileKey(
    fileId: string,
    oldKey: CryptoKey,
    userId: string
  ): Promise<void> {
    try {
      const file = await this.getFileById(fileId);
      if (!file) throw new Error('File not found');

      const decrypted = await this.decryptFile(file, oldKey, userId);

      const newKey = await CryptoUtils.generateKey();
      const newEncryption = await CryptoUtils.encryptData(decrypted, newKey);

      const keyString = await CryptoUtils.exportKey(newKey);
      const shares = CryptoUtils.splitSecretShamir(keyString);

      const { error: updateError } = await supabase
        .from('encrypted_files')
        .update({
          encrypted_data: newEncryption.encryptedData,
          iv: newEncryption.iv,
          auth_tag: newEncryption.authTag,
          key_rotation_date: new Date().toISOString(),
          version: file.version + 1,
        })
        .eq('id', fileId);

      if (updateError) throw updateError;

      await supabase
        .from('key_shares')
        .delete()
        .eq('file_id', fileId);

      for (const share of shares) {
        await supabase.from('key_shares').insert({
          user_id: userId,
          file_id: fileId,
          share_type: share.shareType,
          encrypted_share: share.encryptedShare,
        });
      }

      await activityLogService.log({
        userId,
        action: 'key_regen',
        status: 'success',
        requestDetails: { fileId },
      });
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'key_regen',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async createFileVersion(
    fileId: string,
    encryptionResult: EncryptionResult,
    version: number,
    storagePath: string
  ): Promise<void> {
    const { error } = await supabase
      .from('file_versions')
      .insert({
        file_id: fileId,
        version,
        encrypted_data: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        auth_tag: encryptionResult.authTag,
        storage_path: storagePath,
      });

    if (error) throw error;
  }

  async getFileVersions(fileId: string) {
    const { data, error } = await supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', fileId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getStats(userId: string) {
    const files = await this.getFiles(userId, false);
    const deletedFiles = await this.getFiles(userId, true);

    return {
      totalFiles: files.length,
      deletedFiles: deletedFiles.filter(f => f.is_deleted).length,
      totalSize: files.reduce((sum, f) => sum + f.file_size, 0),
      fileTypes: files.reduce((acc, f) => {
        acc[f.file_type] = (acc[f.file_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const fileService = new FileService();

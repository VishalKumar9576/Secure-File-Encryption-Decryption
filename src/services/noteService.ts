import { supabase, SecureNote } from '../lib/supabase';
import { CryptoUtils } from '../utils/crypto';
import { activityLogService } from './activityLog';

class NoteService {
  async createNote(
    title: string,
    content: string,
    key: CryptoKey,
    userId: string
  ): Promise<SecureNote> {
    try {
      const encryptionResult = await CryptoUtils.encryptData(content, key);

      const noteData = {
        user_id: userId,
        title,
        encrypted_content: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        auth_tag: encryptionResult.authTag,
      };

      const { data, error } = await supabase
        .from('secure_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;

      await activityLogService.log({
        userId,
        action: 'note_create',
        status: 'success',
        requestDetails: { title },
      });

      return data;
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'note_create',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getNotes(userId: string): Promise<SecureNote[]> {
    const { data, error } = await supabase
      .from('secure_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getNoteById(noteId: string): Promise<SecureNote | null> {
    const { data, error } = await supabase
      .from('secure_notes')
      .select('*')
      .eq('id', noteId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async decryptNote(note: SecureNote, key: CryptoKey, userId: string): Promise<string> {
    try {
      const decrypted = await CryptoUtils.decryptToString(
        note.encrypted_content,
        note.iv,
        note.auth_tag,
        key
      );

      await activityLogService.log({
        userId,
        action: 'note_decrypt',
        status: 'success',
        requestDetails: { noteId: note.id },
      });

      return decrypted;
    } catch (error) {
      await activityLogService.log({
        userId,
        action: 'note_decrypt',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async updateNote(
    noteId: string,
    title: string,
    content: string,
    key: CryptoKey,
    userId: string
  ): Promise<void> {
    const encryptionResult = await CryptoUtils.encryptData(content, key);

    const { error } = await supabase
      .from('secure_notes')
      .update({
        title,
        encrypted_content: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        auth_tag: encryptionResult.authTag,
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('secure_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

export const noteService = new NoteService();

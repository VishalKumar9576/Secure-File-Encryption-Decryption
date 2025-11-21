import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  last_login: string | null;
  login_attempts: number;
  locked_until: string | null;
  device_info: Record<string, unknown>;
  theme: string;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type EncryptedFile = {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  storage_path: string;
  thumbnail_data: string | null;
  version: number;
  is_deleted: boolean;
  deleted_at: string | null;
  key_rotation_date: string;
  last_accessed: string | null;
  created_at: string;
  updated_at: string;
};

export type SecureNote = {
  id: string;
  user_id: string;
  title: string;
  encrypted_content: string;
  iv: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
};

export type ShareLink = {
  id: string;
  file_id: string;
  user_id: string;
  token: string;
  password_hash: string | null;
  expires_at: string | null;
  one_time_view: boolean;
  view_count: number;
  max_views: number | null;
  is_active: boolean;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown>;
  endpoint: string | null;
  request_details: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};

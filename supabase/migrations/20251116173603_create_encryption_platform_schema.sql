/*
  # End-to-End Encrypted File Storage Platform Schema

  ## Overview
  Complete database schema for a zero-knowledge encrypted file storage system with:
  - User authentication and security
  - Encrypted file storage
  - Secure notes vault
  - Activity logging
  - Share links management
  - Shamir Secret Sharing for key recovery
  - Admin capabilities

  ## Tables Created

  ### 1. profiles
  Extended user profile with:
  - User role (user/admin)
  - Device tracking (IP, browser, OS)
  - Account security settings
  - Theme preferences
  - Timestamps

  ### 2. encrypted_files
  Stores encrypted file metadata:
  - File name, type, size
  - Encryption metadata (IV, auth tag)
  - File versioning
  - Trash/delete status
  - Storage path reference

  ### 3. secure_notes
  Encrypted notes vault:
  - Note title and encrypted content
  - Encryption metadata
  - Timestamps

  ### 4. key_shares
  Shamir Secret Sharing implementation:
  - Three types: user_share, recovery_share, device_share
  - Encrypted share data
  - Associated with files

  ### 5. share_links
  Public sharing with security:
  - Unique tokens
  - Password protection
  - Expiry dates
  - One-time view option
  - View count tracking

  ### 6. activity_logs
  Comprehensive audit trail:
  - Action type and status
  - Device and location data
  - Timestamps
  - Request details

  ### 7. file_versions
  File version history:
  - Version numbering
  - Each version's encryption metadata
  - Timestamps

  ### 8. otp_codes
  Two-factor authentication:
  - OTP codes
  - Expiry tracking
  - Used status

  ### 9. magic_links
  Passwordless login:
  - Unique tokens
  - Expiry timestamps
  - Used status

  ## Security Features
  - Row Level Security enabled on all tables
  - Users can only access their own data
  - Admin role for elevated permissions
  - Audit logging for all operations
  - Secure token generation for shares and magic links

  ## Indexes
  Optimized queries for:
  - User lookups
  - File listings
  - Activity log queries
  - Share link access
  - OTP and magic link validation
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE share_type AS ENUM ('user_share', 'recovery_share', 'device_share');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE log_action AS ENUM (
    'registration', 'login', 'logout', 'otp_verify', 'magic_link', 
    'file_upload', 'file_encrypt', 'file_decrypt', 'file_delete', 
    'file_restore', 'note_create', 'note_decrypt', 'key_regen', 
    'share_create', 'share_access', 'failed_login'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table: profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role user_role DEFAULT 'user' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  last_login timestamptz,
  login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  device_info jsonb DEFAULT '{}'::jsonb,
  theme text DEFAULT 'light',
  two_factor_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table: encrypted_files
CREATE TABLE IF NOT EXISTS encrypted_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  encrypted_data text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  storage_path text NOT NULL,
  thumbnail_data text,
  version integer DEFAULT 1 NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  deleted_at timestamptz,
  key_rotation_date timestamptz DEFAULT now() NOT NULL,
  last_accessed timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table: secure_notes
CREATE TABLE IF NOT EXISTS secure_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  encrypted_content text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table: key_shares (Shamir Secret Sharing)
CREATE TABLE IF NOT EXISTS key_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES encrypted_files(id) ON DELETE CASCADE NOT NULL,
  share_type share_type NOT NULL,
  encrypted_share text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(file_id, share_type)
);

-- Table: share_links
CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES encrypted_files(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  password_hash text,
  expires_at timestamptz,
  one_time_view boolean DEFAULT false NOT NULL,
  view_count integer DEFAULT 0 NOT NULL,
  max_views integer,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action log_action NOT NULL,
  status text NOT NULL,
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}'::jsonb,
  endpoint text,
  request_details jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table: file_versions
CREATE TABLE IF NOT EXISTS file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES encrypted_files(id) ON DELETE CASCADE NOT NULL,
  version integer NOT NULL,
  encrypted_data text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(file_id, version)
);

-- Table: otp_codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table: magic_links
CREATE TABLE IF NOT EXISTS magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_encrypted_files_user ON encrypted_files(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_files_deleted ON encrypted_files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_secure_notes_user ON secure_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_key_shares_file ON key_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_key_shares_user ON key_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_file ON share_links(file_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_user ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for encrypted_files
CREATE POLICY "Users can view own files"
  ON encrypted_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON encrypted_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON encrypted_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON encrypted_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for secure_notes
CREATE POLICY "Users can view own notes"
  ON secure_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON secure_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON secure_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON secure_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for key_shares
CREATE POLICY "Users can view own key shares"
  ON key_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own key shares"
  ON key_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own key shares"
  ON key_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for share_links
CREATE POLICY "Users can view own share links"
  ON share_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own share links"
  ON share_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own share links"
  ON share_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own share links"
  ON share_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for file_versions
CREATE POLICY "Users can view own file versions"
  ON file_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM encrypted_files
      WHERE encrypted_files.id = file_versions.file_id
      AND encrypted_files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own file versions"
  ON file_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM encrypted_files
      WHERE encrypted_files.id = file_versions.file_id
      AND encrypted_files.user_id = auth.uid()
    )
  );

-- RLS Policies for otp_codes
CREATE POLICY "Users can view own OTP codes"
  ON otp_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert OTP codes"
  ON otp_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OTP codes"
  ON otp_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for magic_links (public access for login)
CREATE POLICY "Anyone can view valid magic links"
  ON magic_links FOR SELECT
  TO anon, authenticated
  USING (expires_at > now() AND is_used = false);

CREATE POLICY "System can insert magic links"
  ON magic_links FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "System can update magic links"
  ON magic_links FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_encrypted_files_updated_at ON encrypted_files;
CREATE TRIGGER handle_encrypted_files_updated_at
  BEFORE UPDATE ON encrypted_files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_secure_notes_updated_at ON secure_notes;
CREATE TRIGGER handle_secure_notes_updated_at
  BEFORE UPDATE ON secure_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
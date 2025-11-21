import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { activityLogService } from '../services/activityLog';
import { CryptoUtils } from '../utils/crypto';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendOTP: (userId: string) => Promise<void>;
  verifyOTP: (userId: string, code: string) => Promise<boolean>;
  sendMagicLink: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);

      if (data) {
        await supabase
          .from('profiles')
          .update({
            last_login: new Date().toISOString(),
            device_info: CryptoUtils.getDeviceInfo()
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await activityLogService.log({
          userId: data.user.id,
          action: 'registration',
          status: 'success',
          requestDetails: { email },
        });
      }
    } catch (error) {
      await activityLogService.log({
        action: 'registration',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        requestDetails: { email },
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profile && profile.locked_until) {
        const lockTime = new Date(profile.locked_until);
        if (lockTime > new Date()) {
          throw new Error('Account is temporarily locked due to multiple failed login attempts');
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (profile) {
          const attempts = (profile.login_attempts || 0) + 1;
          const updates: { login_attempts: number; locked_until?: string } = {
            login_attempts: attempts
          };

          if (attempts >= 5) {
            updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          }

          await supabase
            .from('profiles')
            .update(updates)
            .eq('email', email);
        }

        await activityLogService.log({
          action: 'failed_login',
          status: 'failed',
          errorMessage: error.message,
          requestDetails: { email },
        });
        throw error;
      }

      if (data.user && profile) {
        await supabase
          .from('profiles')
          .update({
            login_attempts: 0,
            locked_until: null,
            last_login: new Date().toISOString()
          })
          .eq('id', data.user.id);

        await activityLogService.log({
          userId: data.user.id,
          action: 'login',
          status: 'success',
          requestDetails: { email },
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await activityLogService.log({
          userId: user.id,
          action: 'logout',
          status: 'success',
        });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setProfile(null);
    } catch (error) {
      throw error;
    }
  };

  const sendOTP = async (userId: string) => {
    const code = CryptoUtils.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('otp_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt,
      });

    if (error) throw error;
  };

  const verifyOTP = async (userId: string, code: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      await activityLogService.log({
        userId,
        action: 'otp_verify',
        status: 'failed',
        errorMessage: 'Invalid or expired OTP',
      });
      return false;
    }

    await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', data.id);

    await activityLogService.log({
      userId,
      action: 'otp_verify',
      status: 'success',
    });

    return true;
  };

  const sendMagicLink = async (email: string) => {
    const token = CryptoUtils.generateRandomToken(64);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('magic_links')
      .insert({
        email,
        token,
        expires_at: expiresAt,
      });

    if (error) throw error;
  };

  const verifyMagicLink = async (token: string) => {
    const { data, error } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      throw new Error('Invalid or expired magic link');
    }

    const { data: userData } = await supabase.auth.admin.getUserByEmail(data.email);

    if (!userData.user) {
      throw new Error('User not found');
    }

    await supabase
      .from('magic_links')
      .update({ is_used: true })
      .eq('id', data.id);

    await activityLogService.log({
      userId: userData.user.id,
      action: 'magic_link',
      status: 'success',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        sendOTP,
        verifyOTP,
        sendMagicLink,
        verifyMagicLink,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserRole, type UserRole } from '@/services/user-roles';
import { formatErrorForUser } from '@/lib/error-handler';

// Re-export UserRole for backward compatibility
export type { UserRole };

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent authentication deadlock
          setTimeout(async () => {
            try {
              // Fetch profile and role securely
              const [profileResult, userRole] = await Promise.all([
                supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .single(),
                getCurrentUserRole()
              ]);

              if (profileResult.error) {
                console.error('Error fetching profile:', profileResult.error);
                setProfile(null);
              } else {
                // Use secure role from user_roles table
                setProfile({
                  ...profileResult.data,
                  role: userRole
                } as UserProfile);
              }
            } catch (error) {
              console.error('Error during profile fetch:', formatErrorForUser(error, 'profile fetch'));
              setProfile(null);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile with error handling
        Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single(),
          getCurrentUserRole()
        ]).then(([profileResult, userRole]) => {
          if (profileResult.error) {
            console.error('Error fetching profile:', profileResult.error);
            setProfile(null);
          } else {
            // Use secure role from user_roles table
            setProfile({
              ...profileResult.data,
              role: userRole
            } as UserProfile);
          }
          setIsLoading(false);
        }).catch(error => {
          console.error('Error during initial profile fetch:', formatErrorForUser(error, 'initial profile fetch'));
          setProfile(null);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

const login = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[SB] Auth error:', error.message);
      return { error };
    }
    return { error: null };
  } catch (e: any) {
    console.error('[SB] signIn network error:', e);
    return { error: { message: 'Cannot reach Supabase. Check env vars, Auth config, or network.' } as any };
  }
};

  const signup = async (email: string, password: string, name: string, role: UserRole = 'agent') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role,
        }
      }
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile,
      session,
      login, 
      signup,
      logout, 
      isLoading, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
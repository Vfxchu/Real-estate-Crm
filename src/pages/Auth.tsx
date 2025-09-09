import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';


export const Auth: React.FC = () => {
  const { login, signup, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Force light theme on the login page
  useEffect(() => {
    const root = document.documentElement;
    const previous = new Set(root.classList);
    root.classList.remove('dark', 'dark-blue');
    root.classList.add('light');
    return () => {
      root.classList.remove('light');
      // Restore previous theme classes
      root.classList.remove('dark', 'dark-blue');
      previous.forEach((c) => root.classList.add(c));
    };
  }, []);

  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await login(loginData.email, loginData.password);
    
    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signup(signupData.email, signupData.password, signupData.name);
    
    if (error) {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created!',
        description: 'Please check your email to verify your account.',
      });
      // Switch to login view after successful signup
      setIsSignUp(false);
      setSignupData({ email: '', password: '', name: '', confirmPassword: '' });
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setResetLoading(true);
    const redirectTo = `${window.location.origin}/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo,
    });

    if (error) {
      toast({
        title: 'Reset failed',
        description: error.message || 'Unable to send reset email.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Check your email',
        description: 'We sent a link to reset your password.',
      });
      setForgotOpen(false);
      setForgotEmail('');
    }
    setResetLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#161D2D] flex flex-col items-center justify-center p-4 light">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/lovable-uploads/92146f7d-7396-400a-8bf4-92d1603d8ea5.png"
            alt="DKV International Logo"
            className="w-28 md:w-32 lg:w-36 h-auto"
          />
          <div className="mt-3 font-heading text-white font-semibold tracking-wide text-xl md:text-2xl">
            DKV INTERNATIONAL REAL ESTATE CRM
          </div>
        </div>
        
          <Card>
            <CardHeader>
              <CardTitle>{isSignUp ? 'Create Account' : 'Welcome'}</CardTitle>
              <CardDescription>
                {isSignUp ? 'Sign up for a new account' : 'Sign in to your account'}
              </CardDescription>
            </CardHeader>
          <CardContent>
            {isSignUp ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Enter your password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Button 
                type="button" 
                variant="link" 
                className="px-0"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </div>

            {!isSignUp && (
              <div className="mt-2 text-right">
                <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="link" className="px-0">Forgot password?</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset your password</DialogTitle>
                      <DialogDescription>
                        Enter your email and we'll send you a reset link.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={resetLoading}>
                        {resetLoading ? 'Sending...' : 'Send reset link'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
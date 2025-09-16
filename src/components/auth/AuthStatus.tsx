import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const AuthStatus: React.FC = () => {
  const { user, profile, isLoading, isAuthenticated, session } = useAuth();
  const [connectionStatus, setConnectionStatus] = React.useState<'checking' | 'connected' | 'error'>('checking');
  const [supabaseUrl] = React.useState(() => {
    // Get the actual URL being used
    return (supabase as any).supabaseUrl || 'Unknown';
  });

  React.useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error && error.message.includes('503')) {
          setConnectionStatus('error');
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Connection test failed:', err);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  const getStatusIcon = (status: boolean | 'unknown') => {
    if (status === 'unknown') return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return status ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Authentication Status
          </CardTitle>
          <CardDescription>
            Current authentication state and connection diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getConnectionStatusIcon()}
              <span className="font-medium">Supabase Connection</span>
            </div>
            <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'}>
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error (503)' : 'Checking'}
            </Badge>
          </div>

          {connectionStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Supabase Project Issue:</strong> The Supabase project appears to be paused or unreachable (HTTP 503). 
                Please check your Supabase dashboard and ensure the project is active.
              </AlertDescription>
            </Alert>
          )}

          {/* Authentication Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(isAuthenticated)}
              <span className="font-medium">Authentication</span>
            </div>
            <Badge variant={isAuthenticated ? 'default' : 'secondary'}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Badge>
          </div>

          {/* User Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(!!user)}
              <span className="font-medium">User Session</span>
            </div>
            <Badge variant={user ? 'default' : 'secondary'}>
              {user ? 'Active' : 'None'}
            </Badge>
          </div>

          {/* Profile Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(!!profile)}
              <span className="font-medium">User Profile</span>
            </div>
            <Badge variant={profile ? 'default' : 'secondary'}>
              {profile ? 'Loaded' : 'Missing'}
            </Badge>
          </div>

          {/* Loading Status */}
          {isLoading && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 animate-spin" />
                <span className="font-medium">Loading</span>
              </div>
              <Badge variant="secondary">In Progress</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supabase URL:</span>
            <span className="font-mono text-xs">{supabaseUrl}</span>
          </div>
          {user && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-xs">{user.email}</span>
              </div>
            </>
          )}
          {profile && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline" className="text-xs">{profile.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {profile.status}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>URL:</span>
            <span className="font-mono text-xs">{window.location.origin}</span>
          </div>
          <div className="flex justify-between">
            <span>Environment:</span>
            <span>{import.meta.env.MODE}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
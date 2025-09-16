import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  UserPlus, 
  Calendar, 
  BarChart3, 
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Shield,
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const QuickStart: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Create New Lead',
      description: 'Add a new lead to the system',
      icon: UserPlus,
      path: '/my-leads',
      color: 'bg-blue-500',
    },
    {
      title: 'Add Property',
      description: 'List a new property',
      icon: Building2,
      path: '/properties',
      color: 'bg-green-500',
    },
    {
      title: 'Schedule Event',
      description: 'Book a meeting or viewing',
      icon: Calendar,
      path: '/calendar',
      color: 'bg-purple-500',
    },
    {
      title: 'View Analytics',
      description: 'Check performance metrics',
      icon: BarChart3,
      path: '/analytics',
      color: 'bg-orange-500',
      adminOnly: true,
    },
  ];

  const systemFeatures = [
    {
      title: 'Authentication System',
      description: 'Secure login/signup with role-based access',
      icon: Shield,
      status: 'active',
    },
    {
      title: 'Database Integration',
      description: 'Full Supabase integration with RLS security',
      icon: Database,
      status: 'active',
    },
    {
      title: 'Lead Management',
      description: 'Complete lead tracking and conversion',
      icon: Users,
      status: 'active',
    },
    {
      title: 'Property Management',
      description: 'Property listings with image uploads',
      icon: Building2,
      status: 'active',
    },
    {
      title: 'Calendar & Events',
      description: 'Meeting scheduling and reminders',
      icon: Calendar,
      status: 'active',
    },
    {
      title: 'Communication Hub',
      description: 'WhatsApp integration and messaging',
      icon: MessageSquare,
      status: 'active',
    },
  ];

  const availableActions = quickActions.filter(action => 
    !action.adminOnly || (action.adminOnly && profile?.role === 'admin')
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome to DKV Real Estate CRM
            </h2>
            <p className="text-muted-foreground">
              Your comprehensive real estate management solution is ready to use.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                System Ready
              </Badge>
              <Badge variant="outline">
                Role: {profile?.role}
              </Badge>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/test')}
            variant="outline"
            className="hidden md:flex"
          >
            Run System Test
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableActions.map((action) => (
            <Card 
              key={action.path} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
                <h4 className="font-medium mb-1">{action.title}</h4>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System Features */}
      <div>
        <h3 className="text-lg font-semibold mb-4">System Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <Badge 
                        variant="secondary" 
                        className="bg-green-100 text-green-800 text-xs"
                      >
                        {feature.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm font-medium">Authentication</div>
              <div className="text-xs text-muted-foreground">Working</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm font-medium">Database</div>
              <div className="text-xs text-muted-foreground">Connected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm font-medium">Security</div>
              <div className="text-xs text-muted-foreground">RLS Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm font-medium">API</div>
              <div className="text-xs text-muted-foreground">Operational</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
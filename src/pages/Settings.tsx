import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Shield,
  Palette,
  Clock,
  Mail,
  MessageSquare,
  Building,
  Save,
} from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState({
    // Profile settings
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    
    // Notification settings
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true,
    leadAssignment: true,
    followUpReminders: true,
    
    // Business settings (admin only)
    businessName: 'Real Estate CRM',
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York',
    },
    leadAssignmentRule: 'round-robin',
    autoResponder: true,
    
    // Communication settings
    whatsappIntegration: false,
    emailSignature: 'Best regards,\n[Your Name]\n[Company]',
  });

  const handleSave = (section: string) => {
    toast({
      title: 'Settings saved',
      description: `${section} settings have been updated successfully.`,
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev] as any,
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          {isAdmin && <TabsTrigger value="business">Business</TabsTrigger>}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateSetting('name', e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={user?.role}
                    disabled
                    className="mt-2 capitalize"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={() => handleSave('Profile')} className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Desktop Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show browser notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.desktopNotifications}
                    onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lead Assignment</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when leads are assigned to you
                    </p>
                  </div>
                  <Switch
                    checked={settings.leadAssignment}
                    onCheckedChange={(checked) => updateSetting('leadAssignment', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Follow-up Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Remind me about scheduled follow-ups
                    </p>
                  </div>
                  <Switch
                    checked={settings.followUpReminders}
                    onCheckedChange={(checked) => updateSetting('followUpReminders', checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('Notification')} className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose your preferred theme
                </p>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="dark-blue">Dark Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    theme === 'light' ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                  onClick={() => setTheme('light')}
                >
                  <div className="w-full h-12 bg-white border rounded mb-2"></div>
                  <p className="text-sm font-medium">Light</p>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    theme === 'dark' ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="w-full h-12 bg-gray-900 border rounded mb-2"></div>
                  <p className="text-sm font-medium">Dark</p>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    theme === 'dark-blue' ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                  onClick={() => setTheme('dark-blue')}
                >
                  <div className="w-full h-12 bg-blue-900 border rounded mb-2"></div>
                  <p className="text-sm font-medium">Dark Blue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Settings (Admin Only) */}
        {isAdmin && (
          <TabsContent value="business" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Business Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => updateSetting('businessName', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Business Hours</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label htmlFor="startTime" className="text-sm">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={settings.businessHours.start}
                        onChange={(e) => updateNestedSetting('businessHours', 'start', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime" className="text-sm">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={settings.businessHours.end}
                        onChange={(e) => updateNestedSetting('businessHours', 'end', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                      <Select
                        value={settings.businessHours.timezone}
                        onValueChange={(value) => updateNestedSetting('businessHours', 'timezone', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Lead Assignment Rule</Label>
                  <Select
                    value={settings.leadAssignmentRule}
                    onValueChange={(value) => updateSetting('leadAssignmentRule', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                      <SelectItem value="manual">Manual Assignment</SelectItem>
                      <SelectItem value="geographic">Geographic Based</SelectItem>
                      <SelectItem value="workload">Workload Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Responder</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically respond to new leads
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoResponder}
                    onCheckedChange={(checked) => updateSetting('autoResponder', checked)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSave('Business')} className="btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
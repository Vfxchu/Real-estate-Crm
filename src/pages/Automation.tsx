import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Workflow,
  Play,
  Pause,
  Plus,
  Edit,
  Trash2,
  Mail,
  MessageSquare,
  Clock,
  Target,
  Users,
  Filter,
  Zap,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'new_lead' | 'status_change' | 'time_based' | 'inactivity';
  action: 'send_email' | 'send_whatsapp' | 'assign_agent' | 'update_status';
  isActive: boolean;
  conditions: string[];
  createdAt: string;
  lastTriggered?: string;
  timesTriggered: number;
}

// Mock automation rules - in production, store in Supabase
const mockRules: AutomationRule[] = [];

const emailTemplates = [
  { id: '1', name: 'Welcome Email', subject: 'Welcome to Our Real Estate Services' },
  { id: '2', name: 'Follow-up Email', subject: 'Following up on your property interest' },
  { id: '3', name: 'Viewing Confirmation', subject: 'Property viewing confirmation' },
];

export const Automation = () => {
  const [rules, setRules] = useState<AutomationRule[]>(mockRules);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const { toast } = useToast();

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && rule.isActive) ||
                         (statusFilter === 'inactive' && !rule.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const getTriggerIcon = (trigger: AutomationRule['trigger']) => {
    switch (trigger) {
      case 'new_lead': return <Target className="w-4 h-4" />;
      case 'status_change': return <Workflow className="w-4 h-4" />;
      case 'time_based': return <Clock className="w-4 h-4" />;
      case 'inactivity': return <Users className="w-4 h-4" />;
      default: return <Workflow className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: AutomationRule['action']) => {
    switch (action) {
      case 'send_email': return <Mail className="w-4 h-4" />;
      case 'send_whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'assign_agent': return <Users className="w-4 h-4" />;
      case 'update_status': return <Settings className="w-4 h-4" />;
      default: return <Workflow className="w-4 h-4" />;
    }
  };

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
    toast({
      title: 'Rule updated',
      description: 'Automation rule status has been updated',
    });
  };

  const handleCreateRule = () => {
    toast({
      title: 'Rule created',
      description: 'New automation rule has been created successfully',
    });
    setShowCreateRule(false);
  };

  const activeRules = rules.filter(r => r.isActive).length;
  const totalTriggers = rules.reduce((sum, r) => sum + r.timesTriggered, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Automation Hub</h1>
          <p className="text-muted-foreground">
            Automate your workflows and improve efficiency
          </p>
        </div>
        <Dialog open={showCreateRule} onOpenChange={setShowCreateRule}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input placeholder="Enter rule name" className="mt-2" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Describe what this rule does" className="mt-2" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trigger</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_lead">New Lead Created</SelectItem>
                      <SelectItem value="status_change">Status Changed</SelectItem>
                      <SelectItem value="time_based">Time-based</SelectItem>
                      <SelectItem value="inactivity">Inactivity Period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Action</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_email">Send Email</SelectItem>
                      <SelectItem value="send_whatsapp">Send WhatsApp</SelectItem>
                      <SelectItem value="assign_agent">Assign Agent</SelectItem>
                      <SelectItem value="update_status">Update Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Conditions</Label>
                <Textarea placeholder="Define the conditions for this rule" className="mt-2" rows={3} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateRule} className="btn-primary">Create Rule</Button>
                <Button variant="outline" onClick={() => setShowCreateRule(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Workflow className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Play className="w-8 h-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{activeRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-warning" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Triggers</p>
                <p className="text-2xl font-bold">{totalTriggers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-info" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        {/* Automation Rules */}
        <TabsContent value="rules" className="space-y-6">
          {/* Filters */}
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search automation rules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rules</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Rules List */}
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <Card key={rule.id} className="card-elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{rule.name}</h3>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">{rule.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(rule.trigger)}
                          <div>
                            <p className="text-sm font-medium">Trigger</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {rule.trigger.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getActionIcon(rule.action)}
                          <div>
                            <p className="text-sm font-medium">Action</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {rule.action.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Triggered</p>
                          <p className="text-sm text-muted-foreground">
                            {rule.timesTriggered} times
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Conditions:</p>
                        <div className="flex flex-wrap gap-2">
                          {rule.conditions.map((condition, index) => (
                            <Badge key={index} variant="outline">{condition}</Badge>
                          ))}
                        </div>
                      </div>

                      {rule.lastTriggered && (
                        <p className="text-sm text-muted-foreground">
                          Last triggered: {rule.lastTriggered}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Templates</CardTitle>
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">Preview</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution History */}
        <TabsContent value="history" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Recent Automation Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-success text-success-foreground">Success</Badge>
                    <div>
                      <p className="font-medium">Welcome Email for New Leads</p>
                      <p className="text-sm text-muted-foreground">Sent email to John Smith</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">2 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-success text-success-foreground">Success</Badge>
                    <div>
                      <p className="font-medium">Follow-up Reminder</p>
                      <p className="text-sm text-muted-foreground">Sent WhatsApp to Maria Garcia</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">4 hours ago</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                    <div>
                      <p className="font-medium">Auto-assign High Priority Leads</p>
                      <p className="text-sm text-muted-foreground">Waiting for agent availability</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">6 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
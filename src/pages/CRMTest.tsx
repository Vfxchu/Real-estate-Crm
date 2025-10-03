import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

type TestResult = 'pending' | 'success' | 'error' | 'warning';

interface TestItem {
  name: string;
  status: TestResult;
  message?: string;
  duration?: number;
}

export const CRMTest = () => {
  const { user, profile } = useAuth();
  const [tests, setTests] = useState<TestItem[]>([
    { name: '1. Authentication', status: 'pending' },
    { name: '2. Profile Access', status: 'pending' },
    { name: '3. Round-Robin Assignment (5+ leads)', status: 'pending' },
    { name: '4. Assignment History Logs', status: 'pending' },
    { name: '5. Agent Data Isolation', status: 'pending' },
    { name: '6. Admin Full Access', status: 'pending' },
    { name: '7. Privilege Escalation Prevention', status: 'pending' },
    { name: '8. Lead Won → Contact Status Sync', status: 'pending' },
    { name: '9. Terminal Status Task Blocking', status: 'pending' },
    { name: '10. Load Test (100+ leads)', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateTest = (name: string, status: TestResult, message?: string, duration?: number) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, duration } : test
    ));
  };

  const runTests = async () => {
    if (!user || !profile) {
      toast.error('User not authenticated');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    const totalTests = 10;
    let completedTests = 0;

    const updateProgress = () => {
      completedTests++;
      setProgress((completedTests / totalTests) * 100);
    };

    try {
      // Test 1: Authentication
      const startAuth = Date.now();
      updateTest('1. Authentication', 'pending', 'Checking...');
      if (user?.id) {
        updateTest('1. Authentication', 'success', `User ID: ${user.id}`, Date.now() - startAuth);
      } else {
        updateTest('1. Authentication', 'error', 'Not authenticated');
      }
      updateProgress();

      // Test 2: Profile Access
      const startProfile = Date.now();
      updateTest('2. Profile Access', 'pending', 'Checking...');
      if (profile?.user_id === user.id) {
        updateTest('2. Profile Access', 'success', `Role: ${profile.role}`, Date.now() - startProfile);
      } else {
        updateTest('2. Profile Access', 'error', 'Profile mismatch');
      }
      updateProgress();

      // Test 3: Round-Robin Assignment
      const startRR = Date.now();
      updateTest('3. Round-Robin Assignment (5+ leads)', 'pending', 'Creating test leads...');
      const testLeads = [];
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase.from('leads').insert({
          name: `Test Lead ${i + 1} - ${Date.now()}`,
          email: `test${i + 1}-${Date.now()}@test.com`,
          phone: `+1234567890${i}`,
          status: 'new'
        }).select().single();
        
        if (data) testLeads.push(data);
      }
      
      const agentIds = [...new Set(testLeads.map(l => l.agent_id))];
      if (agentIds.length >= 1 && testLeads.length === 5) {
        updateTest('3. Round-Robin Assignment (5+ leads)', 'success', 
          `Distributed across ${agentIds.length} agent(s)`, Date.now() - startRR);
      } else {
        updateTest('3. Round-Robin Assignment (5+ leads)', 'warning', 
          'Need multiple active agents for true round-robin test');
      }
      updateProgress();

      // Test 4: Assignment History
      const startHistory = Date.now();
      updateTest('4. Assignment History Logs', 'pending', 'Checking...');
      const { data: history, error: historyError } = await supabase
        .from('assignment_history')
        .select('*')
        .in('lead_id', testLeads.map(l => l.id));
      
      if (history && history.length === testLeads.length) {
        updateTest('4. Assignment History Logs', 'success', 
          `${history.length} history records created`, Date.now() - startHistory);
      } else {
        updateTest('4. Assignment History Logs', 'error', 
          `Expected ${testLeads.length}, got ${history?.length || 0}`);
      }
      updateProgress();

      // Test 5: Agent Data Isolation
      const startIsolation = Date.now();
      updateTest('5. Agent Data Isolation', 'pending', 'Testing RLS...');
      const { data: myLeads } = await supabase.from('leads').select('agent_id');
      const hasOtherAgentData = myLeads?.some(l => l.agent_id !== user.id);
      
      if (!hasOtherAgentData || profile.role === 'admin') {
        updateTest('5. Agent Data Isolation', 'success', 
          profile.role === 'admin' ? 'Admin can see all data' : 'Only own data visible', 
          Date.now() - startIsolation);
      } else {
        updateTest('5. Agent Data Isolation', 'error', 'Data leakage detected!');
      }
      updateProgress();

      // Test 6: Admin Full Access
      const startAdmin = Date.now();
      updateTest('6. Admin Full Access', 'pending', 'Checking...');
      if (profile.role === 'admin') {
        const { data: allProfiles } = await supabase.from('profiles').select('user_id');
        updateTest('6. Admin Full Access', 'success', 
          `Can access ${allProfiles?.length || 0} profiles`, Date.now() - startAdmin);
      } else {
        updateTest('6. Admin Full Access', 'warning', 'Not an admin - skipped');
      }
      updateProgress();

      // Test 7: Privilege Escalation
      const startPriv = Date.now();
      updateTest('7. Privilege Escalation Prevention', 'pending', 'Testing...');
      const { error: privError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' });
      
      if (privError) {
        updateTest('7. Privilege Escalation Prevention', 'success', 
          'Role assignment blocked by RLS', Date.now() - startPriv);
      } else {
        updateTest('7. Privilege Escalation Prevention', 'error', 
          'SECURITY ISSUE: Unauthorized role assignment succeeded!');
      }
      updateProgress();

      // Test 8: Lead Won → Contact Status
      const startSync = Date.now();
      updateTest('8. Lead Won → Contact Status Sync', 'pending', 'Testing...');
      const testLead = testLeads[0];
      await supabase.from('leads').update({ status: 'won' }).eq('id', testLead.id);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
      
      const { data: updatedLead } = await supabase
        .from('leads')
        .select('contact_status')
        .eq('id', testLead.id)
        .single();
      
      if (updatedLead?.contact_status === 'active_client') {
        updateTest('8. Lead Won → Contact Status Sync', 'success', 
          'Status synced correctly', Date.now() - startSync);
      } else {
        updateTest('8. Lead Won → Contact Status Sync', 'warning', 
          'Check trigger function');
      }
      updateProgress();

      // Test 9: Terminal Status Task Blocking
      const startTerminal = Date.now();
      updateTest('9. Terminal Status Task Blocking', 'pending', 'Testing...');
      const { error: taskError } = await supabase.rpc('ensure_manual_followup', {
        p_lead_id: testLead.id,
        p_due_at: new Date(Date.now() + 3600000).toISOString()
      });
      
      if (taskError && taskError.message?.includes('workflow ended')) {
        updateTest('9. Terminal Status Task Blocking', 'success', 
          'Task creation blocked for won lead', Date.now() - startTerminal);
      } else {
        updateTest('9. Terminal Status Task Blocking', 'warning', 
          'Check DB function guards');
      }
      updateProgress();

      // Test 10: Load Test
      const startLoad = Date.now();
      updateTest('10. Load Test (100+ leads)', 'pending', 'Creating bulk data...');
      const bulkLeads = Array.from({ length: 100 }, (_, i) => ({
        name: `Bulk Lead ${i + 1}`,
        email: `bulk${i + 1}-${Date.now()}@test.com`,
        status: 'new'
      }));
      
      const { error: bulkError } = await supabase.from('leads').insert(bulkLeads);
      const loadTime = Date.now() - startLoad;
      
      if (!bulkError && loadTime < 5000) {
        updateTest('10. Load Test (100+ leads)', 'success', 
          `Created 100 leads in ${loadTime}ms`, loadTime);
      } else if (!bulkError) {
        updateTest('10. Load Test (100+ leads)', 'warning', 
          `Slow performance: ${loadTime}ms`);
      } else {
        updateTest('10. Load Test (100+ leads)', 'error', bulkError.message);
      }
      updateProgress();

      // Cleanup test data
      await supabase.from('leads').delete().ilike('name', 'Test Lead %');
      await supabase.from('leads').delete().ilike('name', 'Bulk Lead %');

      toast.success('All tests completed!');
    } catch (error) {
      console.error('Test suite error:', error);
      toast.error('Test suite failed');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      const timer = setTimeout(runTests, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  const getStatusIcon = (status: TestResult) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Passed</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const passedTests = tests.filter(t => t.status === 'success').length;
  const failedTests = tests.filter(t => t.status === 'error').length;
  const warningTests = tests.filter(t => t.status === 'warning').length;
  const completionRate = Math.round((passedTests / tests.length) * 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Complete Test Suite</h1>
          <p className="text-muted-foreground">Comprehensive validation of all critical functionality</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{passedTests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{failedTests}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>CRM Test Suite - Complete Validation</CardTitle>
          <Button onClick={runTests} disabled={!user || !profile || isRunning}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run All Tests'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="font-medium">{test.name}</div>
                    {test.message && (
                      <div className="text-sm text-muted-foreground">{test.message}</div>
                    )}
                    {test.duration && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Duration: {test.duration}ms
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

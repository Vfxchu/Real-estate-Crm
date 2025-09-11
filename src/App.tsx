import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Auth } from "@/pages/Auth";
import AuthReset from "@/pages/AuthReset";
import { Dashboard } from "@/pages/Dashboard";
import { LeadsManager } from "@/pages/LeadsManager";
import { MyLeads } from "@/pages/MyLeads";
import { AgentManager } from "@/pages/AgentManager";
import { TeamManagement } from "@/pages/TeamManagement";
import { Communication } from "@/pages/Communication";
import { Calendar } from "@/pages/Calendar";
import { Analytics } from "@/pages/Analytics";
import { Automation } from "@/pages/Automation";
import { Properties } from "@/pages/Properties";
import Contacts from "@/pages/Contacts";
import { Notifications } from "@/pages/Notifications";
import { Settings } from "@/pages/Settings";
import { ShareProperty } from "@/pages/ShareProperty";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const AppRoutes = () => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
      return (
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset" element={<AuthReset />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      );
    }

    return (
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/leads" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout><LeadsManager /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-leads" element={
          <ProtectedRoute allowedRoles={['agent']}>
            <MainLayout><MyLeads /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout><TeamManagement /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout><AgentManager /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/communication" element={
          <ProtectedRoute>
            <MainLayout><Communication /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <MainLayout><Calendar /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout><Analytics /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/automation" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout><Automation /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/properties" element={
          <ProtectedRoute>
            <MainLayout><Properties /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/contacts" element={
          <ProtectedRoute>
            <MainLayout><Contacts /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <MainLayout><Notifications /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <MainLayout><Settings /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/share/property/:propertyId" element={<ShareProperty />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/auth/reset" element={<AuthReset />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

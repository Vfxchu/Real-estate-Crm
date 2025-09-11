import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:block transition-all duration-300 fixed h-full z-40",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}>
        <Sidebar isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        "lg:ml-64", // Desktop margin for sidebar
        isSidebarCollapsed && "lg:ml-16" // Collapsed sidebar margin
      )}>
        <Header 
          onToggleSidebar={toggleSidebar} 
          onToggleMobileSidebar={toggleMobileSidebar}
        />
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
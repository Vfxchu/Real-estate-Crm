import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationSystem } from '@/components/calendar/NotificationSystem';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { AIAssistantButton } from '@/components/ai/AIAssistantButton';
import { AIAssistantChat } from '@/components/ai/AIAssistantChat';
import { useAIAssistant } from '@/hooks/useAIAssistant';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const isMobile = useIsMobile();
  const { events, updateEvent } = useCalendarEvents();
  
  const {
    messages,
    isLoading,
    sendMessage,
    executeAction,
  } = useAIAssistant();

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
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Notification System - Global */}
      <NotificationSystem events={events} onEventUpdate={updateEvent} />
      
      {/* AI Assistant */}
      <AIAssistantButton 
        onClick={() => setIsAIChatOpen(true)}
        hasNewSuggestions={false}
      />
      <AIAssistantChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        onExecuteAction={executeAction}
      />
    </div>
  );
};
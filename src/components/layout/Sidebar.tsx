import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MessageSquare,
  Settings,
  Bell,
  Calendar,
  Target,
  BarChart3,
  Home,
  FileText,
  Workflow,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin', 'agent'],
  },
  {
    title: 'Agent Panel',
    href: '/agent',
    icon: UserCheck,
    roles: ['agent'],
  },
  {
    title: 'Contacts',
    href: '/contacts',
    icon: Users,
    roles: ['admin', 'agent'],
  },
   {
    title: 'Properties',
    href: '/properties',
    icon: Home,
    roles: ['admin', 'agent'],
  },
  {
    title: 'Leads Manager',
    href: '/leads',
    icon: Target,
    roles: ['admin'],
  },
  {
    title: 'My Leads',
    href: '/my-leads',
    icon: FileText,
    roles: ['agent'],
  },
  {
    title: 'Agent Manager',
    href: '/agents',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    title: 'Team Management',
    href: '/team',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    title: 'Communication',
    href: '/communication',
    icon: MessageSquare,
    roles: ['admin', 'agent'],
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    roles: ['admin', 'agent'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: 'Automation',
    href: '/automation',
    icon: Workflow,
    roles: ['admin'],
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['admin', 'agent'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'agent'],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const { user, profile } = useAuth();
  const location = useLocation();

  const filteredNavigation = navigation.filter(item => 
    profile?.role && item.roles.includes(profile.role as UserRole)
  );

  return (
    <div className={cn(
      "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-screen overflow-hidden",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="py-3 px-4 border-b border-sidebar-border flex-shrink-0">
        {!isCollapsed && (
          <div className="flex flex-col items-center animate-fade-in">
            <img src="/dkv-logo-white.png" alt="DKV Logo" className="w-24 h-24 object-contain" />
            <div className="text-center -mt-3">
              <h1 className="font-bold text-sm text-sidebar-foreground tracking-wide">DKV REALESTATE</h1>
              <p className="text-xs text-sidebar-foreground/60 font-medium">CRM</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <img src="/dkv-logo-white.png" alt="DKV Logo" className="w-8 h-8 object-contain" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <item.icon className={cn(
                  "flex-shrink-0 transition-colors",
                  isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60",
                  isCollapsed ? "w-5 h-5" : "w-4 h-4"
                )} />
                {!isCollapsed && (
                  <span className="animate-fade-in">{item.title}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      {!isCollapsed && profile && (
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
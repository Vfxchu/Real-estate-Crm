import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Menu,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  Moon,
  Sun,
  Palette,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onToggleMobileSidebar }) => {
  const { user, profile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    logout();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'dark-blue':
        return <Palette className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-background border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMobileSidebar}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="hidden lg:flex"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search - Hidden on small screens */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search leads, properties..."
            className="pl-10 w-64 lg:w-80"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              {getThemeIcon()}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="w-4 h-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark-blue')}>
              <Palette className="w-4 h-4 mr-2" />
              Dark Blue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative p-2">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <Badge className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center p-0 text-xs">
                3
              </Badge>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-2 p-2">
              <div className="p-2 hover:bg-muted rounded-md cursor-pointer">
                <p className="text-sm font-medium">New lead assigned</p>
                <p className="text-xs text-muted-foreground">John Smith - High priority</p>
              </div>
              <div className="p-2 hover:bg-muted rounded-md cursor-pointer">
                <p className="text-sm font-medium">Follow-up reminder</p>
                <p className="text-xs text-muted-foreground">Contact Sarah Jones today</p>
              </div>
              <div className="p-2 hover:bg-muted rounded-md cursor-pointer">
                <p className="text-sm font-medium">Property inquiry</p>
                <p className="text-xs text-muted-foreground">New inquiry for 123 Main St</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 p-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {profile?.name.split(' ').map(n => n[0]).join('') || 'U'}
                </span>
              </div>
              <span className="hidden lg:block text-sm">{profile?.name || user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{profile?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
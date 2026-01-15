'use client';

/**
 * User Menu Component
 * Wyświetla nazwę użytkownika i przycisk wylogowania
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  desktopCollapsed?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({ desktopCollapsed = false }) => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-2 w-full',
            desktopCollapsed ? 'md:justify-center' : 'justify-start'
          )}
        >
          <User className="h-4 w-4 flex-shrink-0" />
          <span className={cn(
            'transition-all duration-300 whitespace-nowrap overflow-hidden',
            desktopCollapsed ? 'md:w-0 md:opacity-0' : ''
          )}>
            {user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;

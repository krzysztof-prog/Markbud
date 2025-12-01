'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  alertsCount?: number;
  children?: React.ReactNode;
}

export function Header({ title, alertsCount = 0, children }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: dashboardApi.getAlerts,
    enabled: isDropdownOpen,
  });

  // Zamknij dropdown po kliknięciu poza nim lub naciśnięciu ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 md:px-6 pl-16 md:pl-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900 truncate">{title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {children}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Powiadomienia */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative flex-shrink-0"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-label={isDropdownOpen ? 'Zamknij powiadomienia' : 'Otwórz powiadomienia'}
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
          >
            <Bell className="h-5 w-5" />
            {alertsCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {alertsCount > 9 ? '9+' : alertsCount}
              </Badge>
            )}
          </Button>

          {/* Dropdown z alertami */}
          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto"
              role="menu"
              aria-label="Powiadomienia"
            >
              <div className="p-4 border-b">
                <h3 className="font-semibold text-sm" id="notifications-title">Powiadomienia</h3>
              </div>

              <div className="divide-y">
                {alerts && alerts.length > 0 ? (
                  alerts.map((alert: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            alert.priority === 'critical'
                              ? 'text-red-500'
                              : alert.priority === 'high'
                              ? 'text-orange-500'
                              : 'text-yellow-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">{alert.message}</p>
                            <Badge
                              variant={
                                alert.priority === 'critical'
                                  ? 'destructive'
                                  : alert.priority === 'high'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="flex-shrink-0"
                            >
                              {alert.priority}
                            </Badge>
                          </div>
                          {alert.details && (
                            <p className="text-xs text-slate-600 mt-1">
                              {alert.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Brak powiadomień
                  </div>
                )}
              </div>

              {alerts && alerts.length > 0 && (
                <div className="p-3 border-t bg-slate-50">
                  <Link
                    href="/"
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium block text-center"
                  >
                    Zobacz wszystkie na Dashboard
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alerty */}
        {alertsCount > 0 && (
          <div className="hidden sm:flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-1.5 text-sm text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden md:inline">{alertsCount} alert(ów)</span>
            <span className="md:hidden">{alertsCount}</span>
          </div>
        )}
      </div>
    </header>
  );
}

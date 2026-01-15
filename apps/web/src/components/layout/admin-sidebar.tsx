'use client';

/**
 * Admin Sidebar
 * Dedykowany sidebar dla panelu administracyjnego
 * Zawiera tylko menu admina: Użytkownicy, Ustawienia, Dokumenty autorów
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/features/auth';

interface AdminNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavigation: AdminNavItem[] = [
  {
    name: 'Użytkownicy',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Ustawienia',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Panel Administracyjny</h1>
        {user && (
          <p className="text-sm text-gray-400 mt-1">
            {user.name || user.email}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to main app */}
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Wróć do aplikacji</span>
        </Link>
      </div>
    </aside>
  );
}

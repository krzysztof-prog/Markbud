'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  Settings,
  Archive,
  FolderInput,
  ChevronDown,
  ChevronRight,
  Warehouse,
  Box,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type NavigationItem = {
  name: string;
  href: string;
  icon: any;
  subItems?: { name: string; href: string; icon: any }[];
};

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Magazyn',
    href: '/magazyn',
    icon: Package,
    subItems: [
      { name: 'Magazyn Akrobud', href: '/magazyn/akrobud', icon: Warehouse },
      { name: 'Profile na dostawy', href: '/magazyn/profile-na-dostawy', icon: Package },
      { name: 'Magazyn PVC', href: '/magazyn/pvc', icon: Box },
      { name: 'Magazyn Okuć', href: '/magazyn/okuc', icon: Lock },
    ]
  },
  { name: 'Dostawy', href: '/dostawy', icon: Truck },
  { name: 'Zestawienie miesięczne', href: '/zestawienia', icon: FileText },
  { name: 'Zestawienie zleceń', href: '/zestawienia/zlecenia', icon: FileText },
  { name: 'Importy', href: '/importy', icon: FolderInput },
  { name: 'Archiwum', href: '/archiwum', icon: Archive },
  { name: 'Ustawienia', href: '/ustawienia', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['/magazyn']);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800">
        <span className="text-xl font-bold text-blue-400">AKROBUD</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // Dla "/zestawienia" tylko dokładne dopasowanie, aby nie podświetlać przy podstronach
          const isActive = item.href === '/zestawienia'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const isExpanded = expandedItems.includes(item.href);
          const hasSubItems = 'subItems' in item && item.subItems;

          return (
            <div key={item.name}>
              {/* Główny element */}
              {hasSubItems ? (
                <button
                  onClick={() => toggleExpanded(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )}

              {/* Podstrony */}
              {hasSubItems && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems!.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isSubActive
                            ? 'bg-blue-500 text-white font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        <subItem.icon className="h-4 w-4" />
                        {subItem.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-500">AKROBUD v1.0.0</p>
      </div>
    </div>
  );
}

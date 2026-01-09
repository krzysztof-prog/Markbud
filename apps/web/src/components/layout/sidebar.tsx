'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  FileText,
  Settings,
  Archive,
  FolderInput,
  ChevronDown,
  ChevronRight,
  Warehouse,
  Box,
  Menu,
  X,
  ChevronLeft,
  GlassWater,
  ClipboardList,
  Wrench,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  subItems?: { name: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[];
};

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Panel Kierownika', href: '/kierownik', icon: ClipboardList },
  {
    name: 'Zestawienia',
    href: '/zestawienia',
    icon: BarChart3,
    subItems: [
      { name: 'Zestawienie zleceń', href: '/zestawienia/zlecenia', icon: FileText },
      { name: 'Raport miesięczny', href: '/zestawienia/miesieczne', icon: Calendar },
    ]
  },
  {
    name: 'AKROBUD',
    href: '/magazyn/akrobud',
    icon: Warehouse,
    subItems: [
      { name: 'Kalendarz dostaw', href: '/dostawy', icon: Calendar },
      { name: 'Profile na dostawy', href: '/magazyn/akrobud/profile-na-dostawy', icon: Box },
    ]
  },
  { name: 'Magazyn PVC', href: '/magazyn/pvc', icon: Box },
  { name: 'Okucia', href: '/magazyn/okuc', icon: Wrench },
  { name: 'Dostawy Schuco', href: '/magazyn/dostawy-schuco', icon: Truck },
  {
    name: 'Szyby',
    href: '/szyby',
    icon: GlassWater,
    subItems: [
      { name: 'Zamówienia szyb', href: '/zamowienia-szyb', icon: FileText },
      { name: 'Dostawy szyb', href: '/dostawy-szyb', icon: Truck },
      { name: 'Dostarczone', href: '/szyby/kategorie', icon: Layers },
      { name: 'Statystyki', href: '/szyby/statystyki', icon: BarChart3 },
    ]
  },
  { name: 'Importy', href: '/importy', icon: FolderInput },
  { name: 'Archiwum', href: '/archiwum', icon: Archive },
  { name: 'Ustawienia', href: '/ustawienia', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navRef = useRef<HTMLElement>(null);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  const closeMobile = () => setMobileOpen(false);

  // Keyboard navigation dla sidebar (Arrow Up/Down, Home, End)
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    const focusableItems = navRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    if (!focusableItems || focusableItems.length === 0) return;

    const itemsArray = Array.from(focusableItems);
    const currentIndex = focusedIndex >= 0 ? focusedIndex : 0;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % itemsArray.length;
        setFocusedIndex(nextIndex);
        itemsArray[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : itemsArray.length - 1;
        setFocusedIndex(prevIndex);
        itemsArray[prevIndex]?.focus();
        break;
      }
      case 'Home': {
        event.preventDefault();
        setFocusedIndex(0);
        itemsArray[0]?.focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = itemsArray.length - 1;
        setFocusedIndex(lastIndex);
        itemsArray[lastIndex]?.focus();
        break;
      }
    }
  }, [focusedIndex]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop collapsed sidebar toggle button */}
      {desktopCollapsed && (
        <button
          onClick={() => setDesktopCollapsed(false)}
          className="hidden md:fixed md:top-4 md:left-4 md:z-50 md:flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
          aria-label="Expand sidebar"
          title="Rozwiń pasek boczny"
        >
          <ChevronLeft className="h-6 w-6 rotate-180" />
        </button>
      )}

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-900 text-white p-2 rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'flex h-full flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out z-40',
          'md:translate-x-0 md:relative md:static',
          'fixed inset-y-0 left-0',
          'md:w-64 md:translate-x-0',
          desktopCollapsed ? 'md:w-20' : 'md:w-64',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <span className={cn(
            'text-xl font-bold text-blue-400 transition-all duration-300',
            desktopCollapsed ? 'md:hidden' : 'block'
          )}>AKROBUD</span>
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn(
              'h-5 w-5 transition-transform duration-300',
              desktopCollapsed ? 'rotate-180' : ''
            )} />
          </button>
        </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        className="flex-1 space-y-1 px-3 py-4"
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Menu główne"
      >
        {navigation.map((item) => {
          // Dla "/zestawienia" tylko dokładne dopasowanie, aby nie podświetlać przy podstronach
          const isActive = item.href === '/zestawienia'
            ? pathname === item.href
            : pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);

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
                    desktopCollapsed ? 'md:justify-center md:px-2' : '',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                  title={desktopCollapsed ? item.name : undefined}
                  aria-label={isExpanded ? `Zwiń ${item.name}` : `Rozwiń ${item.name}`}
                  aria-expanded={isExpanded}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className={cn(
                    'flex-1 text-left transition-all duration-300 whitespace-nowrap overflow-hidden',
                    desktopCollapsed ? 'md:w-0 md:opacity-0' : ''
                  )}>{item.name}</span>
                  {isExpanded && !desktopCollapsed ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : !desktopCollapsed ? (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  ) : null}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    desktopCollapsed ? 'md:justify-center md:px-2' : '',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                  title={desktopCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className={cn(
                    'transition-all duration-300 whitespace-nowrap overflow-hidden',
                    desktopCollapsed ? 'md:w-0 md:opacity-0' : ''
                  )}>{item.name}</span>
                </Link>
              )}

              {/* Podstrony */}
              {hasSubItems && isExpanded && !desktopCollapsed && (
                <div className="ml-4 mt-1 space-y-1 md:block">
                  {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- hasSubItems check guarantees subItems exists */}
                  {item.subItems!.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={closeMobile}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isSubActive
                            ? 'bg-blue-500 text-white font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
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
    </>
  );
}

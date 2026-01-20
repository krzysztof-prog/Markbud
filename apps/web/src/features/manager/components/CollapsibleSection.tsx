'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  /** Tytuł sekcji */
  title: string;
  /** Ikona sekcji (komponent Lucide) */
  icon: LucideIcon;
  /** Kolor ikony (Tailwind class np. "text-blue-600") */
  iconColor?: string;
  /** Kolor tytułu (Tailwind class np. "text-red-700") */
  titleColor?: string;
  /** Badge count - liczba elementów */
  count: number;
  /** Badge label suffix (np. "dostaw", "zleceń") */
  countLabel?: string;
  /** Badge variant lub custom class */
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Custom badge className */
  badgeClassName?: string;
  /** Czy domyślnie rozwinięte */
  defaultOpen?: boolean;
  /** Treść sekcji (lista) */
  children: React.ReactNode;
  /** Komunikat gdy lista jest pusta */
  emptyMessage?: string;
  /** Czy lista jest pusta */
  isEmpty?: boolean;
}

/**
 * Zwijalna sekcja dla panelu kierownika
 * Używa Radix Collapsible + Shadcn Card
 * Domyślnie rozwinięta, z animacją zwijania/rozwijania
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-gray-600',
  titleColor,
  count,
  countLabel = 'zleceń',
  badgeVariant = 'outline',
  badgeClassName,
  defaultOpen = true,
  children,
  emptyMessage = 'Brak zleceń',
  isEmpty = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Określ label na podstawie liczby (polskie odmiany)
  const getCountLabel = () => {
    if (count === 1) {
      // Singular form
      if (countLabel === 'dostaw') return 'dostawa';
      if (countLabel === 'zleceń') return 'zlecenie';
      if (countLabel === 'okien') return 'okno';
      return countLabel;
    }
    if (count >= 2 && count <= 4) {
      // 2-4 form
      if (countLabel === 'dostaw') return 'dostawy';
      if (countLabel === 'zleceń') return 'zlecenia';
      if (countLabel === 'okien') return 'okna';
      return countLabel;
    }
    // 5+ form (or default)
    return countLabel;
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
              aria-label={isOpen ? `Zwiń sekcję ${title}` : `Rozwiń sekcję ${title}`}
            >
              {/* Ikona rozwijania/zwijania */}
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
              )}

              {/* Ikona sekcji */}
              <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />

              {/* Tytuł */}
              <CardTitle className={titleColor}>{title}</CardTitle>

              {/* Badge z liczbą */}
              <Badge variant={badgeVariant} className={badgeClassName}>
                {count} {getCountLabel()}
              </Badge>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isEmpty ? (
              <p className="text-gray-500 text-center py-4">{emptyMessage}</p>
            ) : (
              children
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CollapsibleSection;

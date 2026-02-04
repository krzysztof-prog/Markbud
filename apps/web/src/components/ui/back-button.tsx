/**
 * BackButton - Reusable navigation button
 *
 * Consistent styling for "go back" actions across the app
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  /** URL to navigate to */
  href: string;
  /** Button label (default: "Powrót") */
  label?: string;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  href,
  label = 'Powrót',
  variant = 'ghost',
  size = 'sm',
  className = '',
}) => {
  return (
    <Link href={href}>
      <Button variant={variant} size={size} className={className}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </Link>
  );
};

export default BackButton;

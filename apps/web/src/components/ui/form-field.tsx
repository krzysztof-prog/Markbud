'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  /** Unikalne ID pola - używane do powiązania label z input */
  id: string;
  /** Etykieta pola */
  label: string;
  /** Czy pole jest wymagane */
  required?: boolean;
  /** Komunikat błędu walidacji */
  error?: string;
  /** Tekst pomocniczy pod polem */
  hint?: string;
  /** Zawartość - input, select, textarea itp. */
  children: React.ReactNode;
  /** Dodatkowe klasy CSS dla wrappera */
  className?: string;
}

/**
 * Wrapper dla pól formularza z obsługą:
 * - Label z oznaczeniem wymaganych pól (*)
 * - Komunikaty błędów walidacji
 * - Tekst pomocniczy (hint)
 * - Powiązania ARIA (aria-describedby, aria-invalid)
 *
 * @example
 * <FormField id="email" label="Email" required error={errors.email}>
 *   <Input id="email" {...register('email')} />
 * </FormField>
 */
export function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Budujemy aria-describedby z dostępnych elementów
  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (hint) describedByParts.push(hintId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  // Klonujemy children i dodajemy ARIA atrybuty
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{
        'aria-invalid'?: boolean;
        'aria-describedby'?: string;
        'aria-required'?: boolean;
      }>, {
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        'aria-required': required,
      });
    }
    return child;
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label
        htmlFor={id}
        className={cn(
          'text-sm font-medium',
          error && 'text-red-600'
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
        )}
        {required && <span className="sr-only">(wymagane)</span>}
      </Label>

      {enhancedChildren}

      {/* Komunikat błędu */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}

      {/* Tekst pomocniczy */}
      {hint && !error && (
        <p
          id={hintId}
          className="text-sm text-slate-500"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default FormField;

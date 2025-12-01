import { useState, useCallback } from 'react';

export type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

export interface UseFormValidationReturn<T> {
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  validate: (field: keyof T, value: T[keyof T]) => boolean;
  validateAll: (values: T) => boolean;
  touch: (field: keyof T) => void;
  reset: () => void;
  setFieldError: (field: keyof T, message: string) => void;
  clearFieldError: (field: keyof T) => void;
  hasErrors: boolean;
}

/**
 * Custom hook for form validation with real-time feedback
 *
 * @example
 * ```tsx
 * const { errors, touched, validate, validateAll, touch } = useFormValidation({
 *   deliveryDate: [
 *     { validate: (value) => !!value, message: 'Data jest wymagana' },
 *     { validate: (value) => new Date(value) >= new Date(), message: 'Data nie może być w przeszłości' },
 *   ],
 * });
 * ```
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: ValidationSchema<T>
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = useCallback(
    (field: keyof T, value: T[keyof T]): boolean => {
      const rules = schema[field];
      if (!rules) return true;

      for (const rule of rules) {
        if (!rule.validate(value)) {
          setErrors((prev) => ({ ...prev, [field]: rule.message }));
          return false;
        }
      }

      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    },
    [schema]
  );

  const validateAll = useCallback(
    (values: T): boolean => {
      let isValid = true;
      const newErrors: Partial<Record<keyof T, string>> = {};

      Object.keys(schema).forEach((field) => {
        const rules = schema[field as keyof T];
        if (!rules) return;

        const value = values[field as keyof T];
        for (const rule of rules) {
          if (!rule.validate(value)) {
            newErrors[field as keyof T] = rule.message;
            isValid = false;
            break;
          }
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [schema]
  );

  const touch = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const setFieldError = useCallback((field: keyof T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    touched,
    validate,
    validateAll,
    touch,
    reset,
    setFieldError,
    clearFieldError,
    hasErrors,
  };
}

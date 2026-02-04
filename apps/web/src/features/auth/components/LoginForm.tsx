'use client';

/**
 * Login Form Component
 * Formularz logowania użytkownika
 *
 * Walidacja: React Hook Form + Zod
 * - Email: wymagany, poprawny format
 * - Hasło: wymagane
 * - Błędy pokazywane inline pod polami (onBlur)
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Zod schema dla walidacji
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email jest wymagany')
    .email('Wprowadź prawidłowy adres email'),
  password: z
    .string()
    .min(1, 'Hasło jest wymagane'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // Walidacja po wyjściu z pola
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await login({ email: data.email, password: data.password });
      toast({
        title: 'Sukces',
        description: 'Zalogowano pomyślnie',
      });
    } catch (error) {
      toast({
        title: 'Błąd logowania',
        description: error instanceof Error ? error.message : 'Nieprawidłowy email lub hasło',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Logowanie</CardTitle>
        <CardDescription>Wprowadź swoje dane aby się zalogować</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="email"
            label="Email"
            required
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.pl"
              {...register('email')}
              disabled={isLoading}
              autoComplete="email"
            />
          </FormField>

          <FormField
            id="password"
            label="Hasło"
            required
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </FormField>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading ? 'Logowanie...' : 'Zaloguj się'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;

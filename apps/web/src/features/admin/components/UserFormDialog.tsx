/**
 * User Form Dialog - Tworzenie i edycja użytkowników
 */

'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createUser, updateUser, type User, type CreateUserInput, type UpdateUserInput } from '../api/usersApi';

const userSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(3, 'Hasło musi mieć minimum 3 znaki').optional().or(z.literal('')),
  name: z.string().min(1, 'Imię jest wymagane'),
  role: z.enum(['owner', 'admin', 'kierownik', 'ksiegowa', 'user']),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Właściciel',
  admin: 'Administrator',
  kierownik: 'Kierownik',
  ksiegowa: 'Księgowa',
  user: 'Użytkownik',
};

export const UserFormDialog: React.FC<UserFormDialogProps> = ({ open, onOpenChange, user }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'user',
    },
  });

  const selectedRole = watch('role');

  // Resetuj formularz gdy dialog się otwiera/zamyka
  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          email: user.email,
          password: '', // Nie ustawiamy hasła przy edycji
          name: user.name,
          role: user.role,
        });
      } else {
        reset({
          email: '',
          password: '',
          name: '',
          role: 'user',
        });
      }
    }
  }, [open, user, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserInput) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Sukces',
        description: 'Użytkownik został utworzony',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się utworzyć użytkownika',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserInput) => updateUser(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Sukces',
        description: 'Użytkownik został zaktualizowany',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zaktualizować użytkownika',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    if (isEdit) {
      // Przy edycji - usuń hasło jeśli jest puste
      const updateData: UpdateUserInput = {
        email: data.email,
        name: data.name,
        role: data.role,
      };
      if (data.password && data.password.length > 0) {
        updateData.password = data.password;
      }
      updateMutation.mutate(updateData);
    } else {
      // Przy tworzeniu - hasło jest wymagane
      if (!data.password || data.password.length < 3) {
        toast({
          title: 'Błąd',
          description: 'Hasło jest wymagane przy tworzeniu użytkownika',
          variant: 'destructive',
        });
        return;
      }
      const createData: CreateUserInput = {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
      };
      createMutation.mutate(createData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edytuj użytkownika' : 'Dodaj użytkownika'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoFocus {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Imię i nazwisko</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Hasło {isEdit && <span className="text-gray-500 text-sm">(pozostaw puste aby nie zmieniać)</span>}
            </Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola</Label>
            <Select value={selectedRole} onValueChange={(value) => setValue('role', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;

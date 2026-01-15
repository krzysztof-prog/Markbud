'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  useSpecialWorkTypes,
  useCreateSpecialWorkType,
  useUpdateSpecialWorkType,
} from '../hooks/useTimesheets';
import type {
  SpecialWorkType,
  CreateSpecialWorkTypeInput,
  UpdateSpecialWorkTypeInput,
} from '../types';

/**
 * Zarządzanie typami nietypówek - CRUD
 * Nietypówki: drzwi, HS, PSK, szprosy, trapez, łuki
 */
export const SpecialWorkTypesManagement: React.FC = () => {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<SpecialWorkType | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Queries & Mutations
  const { data: specialTypes, isLoading } = useSpecialWorkTypes(showInactive ? undefined : true);
  const createType = useCreateSpecialWorkType();
  const updateType = useUpdateSpecialWorkType();

  const resetForm = useCallback(() => {
    setName('');
    setShortName('');
    setSortOrder(0);
    setIsActive(true);
    setEditingType(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((type: SpecialWorkType) => {
    setName(type.name);
    setShortName(type.shortName ?? '');
    setSortOrder(type.sortOrder);
    setIsActive(type.isActive);
    setEditingType(type);
    setIsFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast({
        title: 'Błąd walidacji',
        description: 'Nazwa typu nietypówki jest wymagana',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingType) {
        const data: UpdateSpecialWorkTypeInput = {
          name: name.trim(),
          shortName: shortName.trim() || null,
          sortOrder,
          isActive,
        };
        await updateType.mutateAsync({ id: editingType.id, data });
        toast({
          title: 'Sukces',
          description: 'Typ nietypówki został zaktualizowany',
        });
      } else {
        const data: CreateSpecialWorkTypeInput = {
          name: name.trim(),
          shortName: shortName.trim() || null,
          sortOrder,
          isActive,
        };
        await createType.mutateAsync(data);
        toast({
          title: 'Sukces',
          description: 'Typ nietypówki został dodany',
        });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [name, shortName, sortOrder, isActive, editingType, createType, updateType, toast, resetForm]);

  const isPending = createType.isPending || updateType.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateForm} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Dodaj nietypówkę
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? 'Ukryj nieaktywne' : 'Pokaż wszystkie'}
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {specialTypes?.length ?? 0} typów
        </span>
      </div>

      {/* Podpowiedź */}
      <div className="text-sm text-muted-foreground bg-purple-50 p-3 rounded-md border border-purple-100">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="h-4 w-4 text-purple-600" />
          <strong className="text-purple-700">Nietypówki</strong>
        </div>
        <p>
          Specjalne prace wymagające dodatkowego czasu: drzwi, HS, PSK, szprosy, trapez, łuki.
        </p>
        <p className="mt-1">
          Godziny nietypówek są rejestrowane do przyszłej analizy wydajności.
        </p>
      </div>

      {/* Lista typów */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !specialTypes || specialTypes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Brak typów nietypówek. Kliknij "Dodaj nietypówkę" aby utworzyć pierwszy.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Skrót</TableHead>
              <TableHead className="text-center">Kolejność</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specialTypes.map((type) => (
              <TableRow key={type.id} className={!type.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell>{type.shortName ?? '-'}</TableCell>
                <TableCell className="text-center">{type.sortOrder}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={type.isActive ? 'default' : 'secondary'}>
                    {type.isActive ? 'Aktywne' : 'Nieaktywne'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(type)}
                    title="Edytuj"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog formularza */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edytuj typ nietypówki' : 'Dodaj typ nietypówki'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Drzwi, HS, PSK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Skrót (opcjonalnie)</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="np. Drzwi, HS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Kolejność sortowania</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Mniejsza liczba = wyżej na liście
              </p>
            </div>
            {editingType && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Aktywne</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Zapisywanie...' : editingType ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpecialWorkTypesManagement;

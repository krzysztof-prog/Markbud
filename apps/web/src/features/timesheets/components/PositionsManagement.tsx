'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Pencil } from 'lucide-react';
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
  usePositions,
  useCreatePosition,
  useUpdatePosition,
} from '../hooks/useTimesheets';
import type { Position, CreatePositionInput, UpdatePositionInput } from '../types';

/**
 * Zarządzanie stanowiskami - CRUD
 */
export const PositionsManagement: React.FC = () => {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Queries & Mutations
  const { data: positions, isLoading } = usePositions(showInactive ? undefined : true);
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();

  const resetForm = useCallback(() => {
    setName('');
    setSortOrder(0);
    setIsActive(true);
    setEditingPosition(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((position: Position) => {
    setName(position.name);
    setSortOrder(position.sortOrder);
    setIsActive(position.isActive);
    setEditingPosition(position);
    setIsFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast({
        title: 'Błąd walidacji',
        description: 'Nazwa stanowiska jest wymagana',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingPosition) {
        const data: UpdatePositionInput = {
          name: name.trim(),
          sortOrder,
          isActive,
        };
        await updatePosition.mutateAsync({ id: editingPosition.id, data });
        toast({
          title: 'Sukces',
          description: 'Stanowisko zostało zaktualizowane',
        });
      } else {
        const data: CreatePositionInput = {
          name: name.trim(),
          sortOrder,
          isActive,
        };
        await createPosition.mutateAsync(data);
        toast({
          title: 'Sukces',
          description: 'Stanowisko zostało dodane',
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
  }, [name, sortOrder, isActive, editingPosition, createPosition, updatePosition, toast, resetForm]);

  const isPending = createPosition.isPending || updatePosition.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateForm} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Dodaj stanowisko
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
          {positions?.length ?? 0} stanowisk
        </span>
      </div>

      {/* Lista stanowisk */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !positions || positions.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Brak stanowisk. Kliknij "Dodaj stanowisko" aby utworzyć pierwsze.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead className="text-center">Kolejność</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id} className={!position.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{position.name}</TableCell>
                <TableCell className="text-center">{position.sortOrder}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={position.isActive ? 'default' : 'secondary'}>
                    {position.isActive ? 'Aktywne' : 'Nieaktywne'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(position)}
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
              {editingPosition ? 'Edytuj stanowisko' : 'Dodaj stanowisko'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa stanowiska *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Montaż"
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
            {editingPosition && (
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
              {isPending ? 'Zapisywanie...' : editingPosition ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PositionsManagement;

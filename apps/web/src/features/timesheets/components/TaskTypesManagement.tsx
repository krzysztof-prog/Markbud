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
  useTaskTypes,
  useCreateTaskType,
  useUpdateTaskType,
} from '../hooks/useTimesheets';
import type {
  NonProductiveTaskType,
  CreateNonProductiveTaskTypeInput,
  UpdateNonProductiveTaskTypeInput,
} from '../types';

/**
 * Zarządzanie typami zadań nieprodukcyjnych - CRUD
 */
export const TaskTypesManagement: React.FC = () => {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<NonProductiveTaskType | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Queries & Mutations
  const { data: taskTypes, isLoading } = useTaskTypes(showInactive ? undefined : true);
  const createTaskType = useCreateTaskType();
  const updateTaskType = useUpdateTaskType();

  const resetForm = useCallback(() => {
    setName('');
    setSortOrder(0);
    setIsActive(true);
    setEditingTaskType(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((taskType: NonProductiveTaskType) => {
    setName(taskType.name);
    setSortOrder(taskType.sortOrder);
    setIsActive(taskType.isActive);
    setEditingTaskType(taskType);
    setIsFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast({
        title: 'Błąd walidacji',
        description: 'Nazwa typu zadania jest wymagana',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTaskType) {
        const data: UpdateNonProductiveTaskTypeInput = {
          name: name.trim(),
          sortOrder,
          isActive,
        };
        await updateTaskType.mutateAsync({ id: editingTaskType.id, data });
        toast({
          title: 'Sukces',
          description: 'Typ zadania został zaktualizowany',
        });
      } else {
        const data: CreateNonProductiveTaskTypeInput = {
          name: name.trim(),
          sortOrder,
          isActive,
        };
        await createTaskType.mutateAsync(data);
        toast({
          title: 'Sukces',
          description: 'Typ zadania został dodany',
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
  }, [name, sortOrder, isActive, editingTaskType, createTaskType, updateTaskType, toast, resetForm]);

  const isPending = createTaskType.isPending || updateTaskType.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateForm} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Dodaj typ zadania
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
          {taskTypes?.length ?? 0} typów
        </span>
      </div>

      {/* Podpowiedź */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
        <p>
          <strong>Typy nieprodukcji</strong> - np. szkolenie, przestój, inne prace nieprodukcyjne.
        </p>
        <p className="mt-1">
          Nieobecności (urlop, choroba) ustawia się bezpośrednio w panelu pracownika.
        </p>
      </div>

      {/* Lista typów zadań */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !taskTypes || taskTypes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Brak typów zadań. Kliknij "Dodaj typ zadania" aby utworzyć pierwszy.
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
            {taskTypes.map((taskType) => (
              <TableRow key={taskType.id} className={!taskType.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{taskType.name}</TableCell>
                <TableCell className="text-center">{taskType.sortOrder}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={taskType.isActive ? 'default' : 'secondary'}>
                    {taskType.isActive ? 'Aktywne' : 'Nieaktywne'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(taskType)}
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
              {editingTaskType ? 'Edytuj typ zadania' : 'Dodaj typ zadania'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Szkolenie"
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
            {editingTaskType && (
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
              {isPending ? 'Zapisywanie...' : editingTaskType ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskTypesManagement;

'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  useWorkers,
  useCreateWorker,
  useUpdateWorker,
  useDeactivateWorker,
  usePositions,
} from '../hooks/useTimesheets';
import type { Worker, CreateWorkerInput, UpdateWorkerInput } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Zarządzanie pracownikami - CRUD
 */
export const WorkersManagement: React.FC = () => {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerToDeactivate, setWorkerToDeactivate] = useState<Worker | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [defaultPosition, setDefaultPosition] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  // Queries & Mutations
  const { data: workers, isLoading } = useWorkers(showInactive ? undefined : true);
  const { data: positions } = usePositions(true);
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const deactivateWorker = useDeactivateWorker();

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setDefaultPosition('');
    setSortOrder(0);
    setEditingWorker(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((worker: Worker) => {
    setFirstName(worker.firstName);
    setLastName(worker.lastName);
    setDefaultPosition(worker.defaultPosition);
    setSortOrder(worker.sortOrder);
    setEditingWorker(worker);
    setIsFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim() || !defaultPosition) {
      toast({
        title: 'Błąd walidacji',
        description: 'Wypełnij wszystkie wymagane pola',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingWorker) {
        const data: UpdateWorkerInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          defaultPosition,
          sortOrder,
        };
        await updateWorker.mutateAsync({ id: editingWorker.id, data });
        toast({
          title: 'Sukces',
          description: 'Pracownik został zaktualizowany',
        });
      } else {
        const data: CreateWorkerInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          defaultPosition,
          sortOrder,
        };
        await createWorker.mutateAsync(data);
        toast({
          title: 'Sukces',
          description: 'Pracownik został dodany',
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
  }, [firstName, lastName, defaultPosition, sortOrder, editingWorker, createWorker, updateWorker, toast, resetForm]);

  const handleDeactivate = useCallback(async () => {
    if (!workerToDeactivate) return;

    try {
      await deactivateWorker.mutateAsync(workerToDeactivate.id);
      toast({
        title: 'Sukces',
        description: 'Pracownik został dezaktywowany',
      });
      setWorkerToDeactivate(null);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [workerToDeactivate, deactivateWorker, toast]);

  const handleReactivate = useCallback(async (worker: Worker) => {
    try {
      await updateWorker.mutateAsync({
        id: worker.id,
        data: { isActive: true },
      });
      toast({
        title: 'Sukces',
        description: 'Pracownik został aktywowany',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [updateWorker, toast]);

  const isPending = createWorker.isPending || updateWorker.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={openCreateForm} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Dodaj pracownika
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? 'Ukryj nieaktywnych' : 'Pokaż wszystkich'}
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {workers?.length ?? 0} pracowników
        </span>
      </div>

      {/* Lista pracowników */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !workers || workers.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Brak pracowników. Kliknij "Dodaj pracownika" aby utworzyć pierwszego.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Stanowisko domyślne</TableHead>
              <TableHead className="text-center">Kolejność</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((worker) => (
              <TableRow key={worker.id} className={!worker.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">
                  {worker.firstName} {worker.lastName}
                </TableCell>
                <TableCell>{worker.defaultPosition}</TableCell>
                <TableCell className="text-center">{worker.sortOrder}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={worker.isActive ? 'default' : 'secondary'}>
                    {worker.isActive ? 'Aktywny' : 'Nieaktywny'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditForm(worker)}
                      title="Edytuj"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {worker.isActive ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setWorkerToDeactivate(worker)}
                        title="Dezaktywuj"
                      >
                        <UserX className="h-4 w-4 text-red-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReactivate(worker)}
                        title="Aktywuj"
                      >
                        <UserCheck className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                  </div>
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
              {editingWorker ? 'Edytuj pracownika' : 'Dodaj pracownika'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Kowalski"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPosition">Stanowisko domyślne *</Label>
              <Select value={defaultPosition} onValueChange={setDefaultPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz stanowisko" />
                </SelectTrigger>
                <SelectContent>
                  {positions?.map((pos) => (
                    <SelectItem key={pos.id} value={pos.name}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!positions || positions.length === 0) && (
                <p className="text-xs text-amber-600">
                  Najpierw dodaj stanowiska w zakładce "Stanowiska"
                </p>
              )}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Zapisywanie...' : editingWorker ? 'Zapisz zmiany' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia dezaktywacji */}
      <AlertDialog
        open={!!workerToDeactivate}
        onOpenChange={(open) => !open && setWorkerToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dezaktywować pracownika?</AlertDialogTitle>
            <AlertDialogDescription>
              Pracownik {workerToDeactivate?.firstName} {workerToDeactivate?.lastName}{' '}
              zostanie dezaktywowany. Nie będzie widoczny w godzinówkach, ale jego
              historyczne wpisy zostaną zachowane.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Dezaktywuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkersManagement;

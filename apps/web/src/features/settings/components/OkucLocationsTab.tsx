'use client';

/**
 * OkucLocationsTab - Zakladka Ustawien do zarzadzania lokalizacjami magazynowymi OKUC
 *
 * Funkcje:
 * - Lista lokalizacji z drag & drop do zmiany kolejnosci
 * - Dodawanie nowej lokalizacji
 * - Edycja nazwy (inline lub dialog)
 * - Usuwanie z potwierdzeniem (soft delete)
 * - Wyswietlanie liczby artykulow przypisanych do kazdej lokalizacji
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, GripVertical, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import {
  useOkucLocations,
  useOkucLocationMutations,
} from '@/features/okuc/hooks';
import type { OkucLocation } from '@/types/okuc';

// =============================================================================
// SORTABLE ITEM COMPONENT
// =============================================================================

interface SortableLocationItemProps {
  location: OkucLocation;
  onEdit: (location: OkucLocation) => void;
  onDelete: (location: OkucLocation) => void;
  isDeleting: boolean;
}

function SortableLocationItem({
  location,
  onEdit,
  onDelete,
  isDeleting,
}: SortableLocationItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
        title="Przeciagnij aby zmienic kolejnosc"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Location name */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-900">{location.name}</span>
      </div>

      {/* Articles count */}
      <div className="flex items-center gap-1 text-sm text-slate-500" title="Liczba artykulow">
        <Package className="h-4 w-4" />
        <span>{location.articlesCount ?? 0}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(location)}
          title="Edytuj nazwe"
        >
          <Pencil className="h-4 w-4 text-blue-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(location)}
          disabled={isDeleting}
          title="Usun lokalizacje"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OkucLocationsTab() {
  // Pobierz lokalizacje
  const { data: locations, isLoading, error } = useOkucLocations();

  // Stan dialogow
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OkucLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<OkucLocation | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [editLocationName, setEditLocationName] = useState('');

  // Mutacje
  const { createMutation, updateMutation, deleteMutation, reorderMutation } =
    useOkucLocationMutations({
      onCreateSuccess: () => {
        setIsAddDialogOpen(false);
        setNewLocationName('');
        toast({
          title: 'Lokalizacja dodana',
          description: 'Nowa lokalizacja magazynowa zostala dodana.',
          variant: 'success',
        });
      },
      onUpdateSuccess: () => {
        setEditingLocation(null);
        setEditLocationName('');
        toast({
          title: 'Lokalizacja zaktualizowana',
          description: 'Nazwa lokalizacji zostala zmieniona.',
          variant: 'success',
        });
      },
      onDeleteSuccess: () => {
        setDeletingLocation(null);
        toast({
          title: 'Lokalizacja usunieta',
          description: 'Lokalizacja magazynowa zostala usunieta.',
          variant: 'success',
        });
      },
      onDeleteError: (error) => {
        toast({
          title: 'Blad usuwania',
          description: error.message || 'Nie udalo sie usunac lokalizacji.',
          variant: 'destructive',
        });
      },
    });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handlery
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id && locations) {
        const oldIndex = locations.findIndex((l) => l.id === active.id);
        const newIndex = locations.findIndex((l) => l.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(locations, oldIndex, newIndex);
          const newIds = newOrder.map((l) => l.id);
          reorderMutation.mutate(newIds);
        }
      }
    },
    [locations, reorderMutation]
  );

  const handleAddLocation = () => {
    if (!newLocationName.trim()) return;
    createMutation.mutate({
      name: newLocationName.trim(),
      sortOrder: locations?.length ?? 0,
    });
  };

  const handleEditLocation = () => {
    if (!editingLocation || !editLocationName.trim()) return;
    updateMutation.mutate({
      id: editingLocation.id,
      data: { name: editLocationName.trim() },
    });
  };

  const handleDeleteLocation = () => {
    if (!deletingLocation) return;
    deleteMutation.mutate(deletingLocation.id);
  };

  const openEditDialog = (location: OkucLocation) => {
    setEditingLocation(location);
    setEditLocationName(location.name);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Magazyny OKUC</CardTitle>
          <CardDescription>Ladowanie...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Magazyny OKUC</CardTitle>
          <CardDescription>Blad ladowania</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <p>Nie udalo sie wczytac lokalizacji.</p>
            <p className="text-sm text-slate-500 mt-2">{(error as Error).message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Magazyny OKUC</CardTitle>
            <CardDescription>
              Zarzadzaj lokalizacjami magazynowymi dla okuc. Przeciagnij aby zmienic kolejnosc.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Dodaj lokalizacje
          </Button>
        </CardHeader>
        <CardContent>
          {locations && locations.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={locations.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {locations.map((location) => (
                    <SortableLocationItem
                      key={location.id}
                      location={location}
                      onEdit={openEditDialog}
                      onDelete={setDeletingLocation}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Brak lokalizacji magazynowych.</p>
              <p className="text-sm mt-1">Kliknij "Dodaj lokalizacje" aby utworzyc pierwsza.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog dodawania */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj lokalizacje magazynowa</DialogTitle>
            <DialogDescription>
              Wprowadz nazwe nowej lokalizacji (np. "Schuco", "Namiot", "Hala skrzydla").
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newLocationName">Nazwa lokalizacji</Label>
              <Input
                id="newLocationName"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="np. Schuco"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLocationName.trim()) {
                    handleAddLocation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewLocationName('');
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleAddLocation}
              disabled={!newLocationName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Dodawanie...' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog edycji */}
      <Dialog
        open={editingLocation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLocation(null);
            setEditLocationName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj lokalizacje</DialogTitle>
            <DialogDescription>
              Zmien nazwe lokalizacji magazynowej.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editLocationName">Nazwa lokalizacji</Label>
              <Input
                id="editLocationName"
                value={editLocationName}
                onChange={(e) => setEditLocationName(e.target.value)}
                placeholder="np. Schuco"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editLocationName.trim()) {
                    handleEditLocation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingLocation(null);
                setEditLocationName('');
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleEditLocation}
              disabled={!editLocationName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usuwania */}
      <AlertDialog
        open={deletingLocation !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLocation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunac lokalizacje?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunac lokalizacje "{deletingLocation?.name}"?
              {deletingLocation?.articlesCount && deletingLocation.articlesCount > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Uwaga: Do tej lokalizacji przypisanych jest {deletingLocation.articlesCount} artykulow.
                  Artykuly nie zostana usuniete, ale straca przypisanie do lokalizacji.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Usuwanie...' : 'Usun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Lista kolorów prywatnych z możliwością edycji nazwy
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Pencil, Trash2, Check, X, Loader2, Palette } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  usePrivateColors,
  useUpdatePrivateColor,
  useDeletePrivateColor,
} from '../hooks/usePrivateColors';
import type { PrivateColor } from '../api/privateColorsApi';

export function PrivateColorsList() {
  const { data: colors, isLoading, error } = usePrivateColors();
  const updateMutation = useUpdatePrivateColor();
  const deleteMutation = useDeletePrivateColor();
  const { toast } = useToast();

  // Stan edycji
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Stan usuwania
  const [deleteTarget, setDeleteTarget] = useState<PrivateColor | null>(null);

  const startEditing = useCallback((color: PrivateColor) => {
    setEditingId(color.id);
    setEditValue(color.name || color.code);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(
    async (color: PrivateColor) => {
      if (!editValue.trim()) {
        toast({
          title: 'Błąd',
          description: 'Nazwa nie może być pusta',
          variant: 'destructive',
        });
        return;
      }

      // Toast jest obsługiwany przez hook useUpdatePrivateColor
      await updateMutation.mutateAsync({
        id: color.id,
        data: { name: editValue.trim() },
      });
      setEditingId(null);
      setEditValue('');
    },
    [editValue, updateMutation, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    // Toast jest obsługiwany przez hook useDeletePrivateColor
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Ładowanie kolorów...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Błąd ładowania kolorów: {String(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!colors || colors.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Palette className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Brak kolorów prywatnych</p>
            <p className="text-sm text-gray-500 mt-2">
              Kolory pojawią się tutaj automatycznie po imporcie zleceń prywatnych
              z kolorami spoza palety Akrobud.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Kolory prywatne ({colors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Kod</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead className="w-32 text-center">Użycia</TableHead>
                <TableHead className="w-40 text-center">Utworzono</TableHead>
                <TableHead className="w-28 text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colors.map((color) => (
                <TableRow key={color.id}>
                  <TableCell className="font-mono font-semibold">
                    {color.code}
                  </TableCell>
                  <TableCell>
                    {editingId === color.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(color);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveEdit(color)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <span className={color.name === color.code ? 'text-gray-400 italic' : ''}>
                        {color.name || color.code}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        color.usageCount > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {color.usageCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-500">
                    {new Date(color.createdAt).toLocaleDateString('pl-PL')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(color)}
                        disabled={editingId !== null}
                        title="Edytuj nazwę"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(color)}
                        disabled={color.usageCount > 0 || editingId !== null}
                        title={
                          color.usageCount > 0
                            ? 'Nie można usunąć - kolor jest używany'
                            : 'Usuń kolor'
                        }
                      >
                        <Trash2
                          className={`h-4 w-4 ${
                            color.usageCount > 0 ? 'text-gray-300' : 'text-red-500'
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog potwierdzenia usunięcia */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć kolor {deleteTarget?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Kolor zostanie trwale usunięty z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Usuwanie...
                </>
              ) : (
                'Usuń'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

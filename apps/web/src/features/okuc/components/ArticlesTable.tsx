/**
 * Tabela artykułów OKUC
 *
 * Wyświetla listę artykułów z akcjami edycji i usuwania.
 * Sortowanie domyślnie po articleId (ascending).
 * Confirmation dialog dla usuwania (inline).
 * Inline edycja lokalizacji magazynowej.
 *
 * Kolumny:
 * - Numer artykułu
 * - Nazwa
 * - PVC/ALU
 * - Magazyn
 * - Akcje
 */

'use client';

import { useState, useMemo } from 'react';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Trash2 } from 'lucide-react';
import type { OkucArticle, OkucLocation } from '@/types/okuc';

interface ArticlesTableProps {
  articles: OkucArticle[];
  locations: OkucLocation[];
  isLoading?: boolean;
  onEdit: (articleId: number) => void;
  onDelete: (articleId: number) => void;
  onLocationChange: (articleId: number, locationId: number | null) => void;
  onOrderClassChange: (articleId: number, orderClass: 'typical' | 'atypical') => void;
  onSizeClassChange: (articleId: number, sizeClass: 'standard' | 'gabarat') => void;
  isDeletingId?: number; // ID artykułu który jest usuwany
  isUpdatingLocationId?: number; // ID artykułu którego lokalizacja jest aktualizowana
  isUpdatingOrderClassId?: number; // ID artykułu którego orderClass jest aktualizowany
  isUpdatingSizeClassId?: number; // ID artykułu którego sizeClass jest aktualizowany
}

type SortField = 'articleId' | 'name' | 'location';
type SortDirection = 'asc' | 'desc';

export function ArticlesTable({
  articles,
  locations,
  isLoading = false,
  onEdit,
  onDelete,
  onLocationChange,
  onOrderClassChange,
  onSizeClassChange,
  isDeletingId,
  isUpdatingLocationId,
  isUpdatingOrderClassId,
  isUpdatingSizeClassId,
}: ArticlesTableProps) {
  // State dla sortowania - domyślnie articleId ascending
  const [sortField, setSortField] = useState<SortField>('articleId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // State dla confirmation dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Obsługa sortowania
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction jeśli to samo pole
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nowe pole - sortuj ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sortowane artykuły
  const sortedArticles = useMemo(() => {
    if (!articles || articles.length === 0) return [];

    const sorted = [...articles].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'articleId':
          aValue = a.articleId.toLowerCase();
          bValue = b.articleId.toLowerCase();
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'location':
          // Lokalizacje bez przypisania na końcu
          aValue = a.location?.name?.toLowerCase() ?? 'zzz';
          bValue = b.location?.name?.toLowerCase() ?? 'zzz';
          break;
        default:
          aValue = a.articleId;
          bValue = b.articleId;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [articles, sortField, sortDirection]);

  // Obsługa confirmation delete
  const handleDeleteClick = (articleId: number) => {
    setDeleteConfirmId(articleId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId !== null) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // Obsługa zmiany lokalizacji
  const handleLocationChange = (articleId: number, value: string) => {
    const locationId = value === 'unassigned' ? null : parseInt(value, 10);
    onLocationChange(articleId, locationId);
  };

  // Znalezienie artykułu do usunięcia (dla dialog)
  const articleToDelete = useMemo(() => {
    if (deleteConfirmId === null) return null;
    return articles.find((a) => a.id === deleteConfirmId);
  }, [deleteConfirmId, articles]);

  // Empty state
  if (!isLoading && (!articles || articles.length === 0)) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400 mb-2">Brak artykułów spełniających kryteria</p>
        <p className="text-sm text-slate-500">
          Kliknij &quot;Dodaj artykuł&quot; aby utworzyć pierwszy.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Horizontal scroll na mobile */}
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* ArticleID - sortowalne, szerokość 100px */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50 w-[100px]"
                onClick={() => handleSort('articleId')}
              >
                <div className="flex items-center gap-1">
                  Nr artykułu
                  {sortField === 'articleId' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* Name - sortowalne, flex */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50 min-w-[200px]"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Nazwa
                  {sortField === 'name' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* PVC - szerokość 50px */}
              <TableHead className="text-center w-[50px]">PVC</TableHead>

              {/* ALU - szerokość 50px */}
              <TableHead className="text-center w-[50px]">ALU</TableHead>

              {/* Klasa zamówienia - szerokość 120px */}
              <TableHead className="w-[120px]">Klasa</TableHead>

              {/* Wielkość - szerokość 120px */}
              <TableHead className="w-[120px]">Wielkość</TableHead>

              {/* Location - sortowalne, szerokość 160px */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50 w-[160px]"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center gap-1">
                  Magazyn
                  {sortField === 'location' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* Actions - szerokość 80px */}
              <TableHead className="text-right w-[80px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedArticles.map((article) => {
              const isDeleting = isDeletingId === article.id;
              const isUpdatingLocation = isUpdatingLocationId === article.id;

              return (
                <TableRow key={article.id}>
                  {/* Article ID */}
                  <TableCell className="font-mono font-medium text-sm">{article.articleId}</TableCell>

                  {/* Name */}
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{article.name}</div>
                      {article.description && (
                        <div className="text-xs text-slate-500 truncate max-w-[300px]">
                          {article.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* PVC - Check/X (zielony Check, czerwony X) */}
                  <TableCell className="text-center">
                    {article.usedInPvc ? (
                      <Check className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-red-400 mx-auto" />
                    )}
                  </TableCell>

                  {/* ALU - Check/X (zielony Check, czerwony X) */}
                  <TableCell className="text-center">
                    {article.usedInAlu ? (
                      <Check className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-red-400 mx-auto" />
                    )}
                  </TableCell>

                  {/* Klasa zamówienia - Select inline */}
                  <TableCell>
                    <Select
                      value={article.orderClass}
                      onValueChange={(value) => onOrderClassChange(article.id, value as 'typical' | 'atypical')}
                      disabled={isUpdatingOrderClassId === article.id || isDeleting}
                    >
                      <SelectTrigger className="w-full h-8 text-sm" disabled={isUpdatingOrderClassId === article.id}>
                        <SelectValue>
                          {isUpdatingOrderClassId === article.id ? (
                            <span className="text-muted-foreground">Zapisywanie...</span>
                          ) : article.orderClass === 'typical' ? (
                            'Typowy'
                          ) : (
                            'Atypowy'
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typical">Typowy</SelectItem>
                        <SelectItem value="atypical">Atypowy</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Wielkość - Select inline */}
                  <TableCell>
                    <Select
                      value={article.sizeClass}
                      onValueChange={(value) => onSizeClassChange(article.id, value as 'standard' | 'gabarat')}
                      disabled={isUpdatingSizeClassId === article.id || isDeleting}
                    >
                      <SelectTrigger className="w-full h-8 text-sm" disabled={isUpdatingSizeClassId === article.id}>
                        <SelectValue>
                          {isUpdatingSizeClassId === article.id ? (
                            <span className="text-muted-foreground">Zapisywanie...</span>
                          ) : article.sizeClass === 'standard' ? (
                            'Standard'
                          ) : (
                            'Gabarat'
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="gabarat">Gabarat</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Location - Select inline */}
                  <TableCell>
                    <Select
                      value={article.locationId?.toString() ?? 'unassigned'}
                      onValueChange={(value) => handleLocationChange(article.id, value)}
                      disabled={isUpdatingLocation || isDeleting}
                    >
                      <SelectTrigger className="w-full h-8 text-sm" disabled={isUpdatingLocation}>
                        <SelectValue placeholder="Nie przypisano">
                          {isUpdatingLocation ? (
                            <span className="text-muted-foreground">Zapisywanie...</span>
                          ) : article.location?.name ? (
                            article.location.name
                          ) : (
                            <span className="text-muted-foreground">Nie przypisano</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-muted-foreground">Nie przypisano</span>
                        </SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id.toString()}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Actions - tylko Edit + Delete */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(article.id)}
                        disabled={isDeleting}
                        className="h-8 w-8 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edytuj</span>
                      </Button>

                      {/* Delete Button - disabled podczas isPending */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(article.id)}
                        disabled={isDeleting}
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      >
                        {isDeleting ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Usuń</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog - inline */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={handleCancelDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć artykuł{' '}
              <span className="font-semibold">
                {articleToDelete?.articleId} - {articleToDelete?.name}
              </span>
              ?
              <br />
              <br />
              Ta operacja jest <span className="font-semibold text-red-600">nieodwracalna</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} disabled={isDeletingId !== undefined}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletingId !== undefined}
            >
              {isDeletingId ? 'Usuwanie...' : 'Usuń artykuł'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ArticlesTable;

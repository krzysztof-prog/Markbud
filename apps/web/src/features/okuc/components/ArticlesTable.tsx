/**
 * Tabela artykułów OKUC
 *
 * Wyświetla listę artykułów z akcjami edycji i usuwania.
 * Sortowanie domyślnie po articleId (ascending).
 * Confirmation dialog dla usuwania (inline).
 * Inline edycja lokalizacji magazynowej.
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
import { Badge } from '@/components/ui/badge';
import { Check, X, Edit, Trash2 } from 'lucide-react';
import type { OkucArticle, OkucLocation } from '@/types/okuc';

interface ArticlesTableProps {
  articles: OkucArticle[];
  locations: OkucLocation[];
  isLoading?: boolean;
  onEdit: (articleId: number) => void;
  onDelete: (articleId: number) => void;
  onLocationChange: (articleId: number, locationId: number | null) => void;
  isDeletingId?: number; // ID artykułu który jest usuwany
  isUpdatingLocationId?: number; // ID artykułu którego lokalizacja jest aktualizowana
}

type SortField = 'articleId' | 'name' | 'orderClass' | 'sizeClass' | 'location';
type SortDirection = 'asc' | 'desc';

export function ArticlesTable({
  articles,
  locations,
  isLoading = false,
  onEdit,
  onDelete,
  onLocationChange,
  isDeletingId,
  isUpdatingLocationId,
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
        case 'orderClass':
          aValue = a.orderClass;
          bValue = b.orderClass;
          break;
        case 'sizeClass':
          aValue = a.sizeClass;
          bValue = b.sizeClass;
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
              {/* ArticleID - sortowalne */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50"
                onClick={() => handleSort('articleId')}
              >
                <div className="flex items-center gap-1">
                  Numer artykułu
                  {sortField === 'articleId' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* Name - sortowalne */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Nazwa
                  {sortField === 'name' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* PVC */}
              <TableHead className="text-center">PVC</TableHead>

              {/* ALU */}
              <TableHead className="text-center">ALU</TableHead>

              {/* Order Class - sortowalne */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50"
                onClick={() => handleSort('orderClass')}
              >
                <div className="flex items-center gap-1">
                  Typ zamówienia
                  {sortField === 'orderClass' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* Size Class - sortowalne */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50"
                onClick={() => handleSort('sizeClass')}
              >
                <div className="flex items-center gap-1">
                  Rozmiar
                  {sortField === 'sizeClass' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* Location - sortowalne */}
              <TableHead
                className="cursor-pointer select-none hover:bg-slate-50"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center gap-1">
                  Magazyn
                  {sortField === 'location' && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>

              {/* Actions */}
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedArticles.map((article) => {
              const isDeleting = isDeletingId === article.id;
              const isUpdatingLocation = isUpdatingLocationId === article.id;

              return (
                <TableRow key={article.id}>
                  {/* Article ID */}
                  <TableCell className="font-mono font-medium">{article.articleId}</TableCell>

                  {/* Name */}
                  <TableCell>
                    <div>
                      <div className="font-medium">{article.name}</div>
                      {article.description && (
                        <div className="text-sm text-slate-500 truncate max-w-xs">
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

                  {/* Order Class - Badge niebieski */}
                  <TableCell>
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                      {article.orderClass === 'typical' ? 'Typowy' : 'Atypowy'}
                    </Badge>
                  </TableCell>

                  {/* Size Class - Badge niebieski */}
                  <TableCell>
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                      {article.sizeClass === 'standard' ? 'Standard' : 'Gabarat'}
                    </Badge>
                  </TableCell>

                  {/* Location - Select inline */}
                  <TableCell>
                    <Select
                      value={article.locationId?.toString() ?? 'unassigned'}
                      onValueChange={(value) => handleLocationChange(article.id, value)}
                      disabled={isUpdatingLocation || isDeleting}
                    >
                      <SelectTrigger className="w-[180px]" disabled={isUpdatingLocation}>
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
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(article.id)}
                        disabled={isDeleting}
                        className="hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edytuj</span>
                      </Button>

                      {/* Delete Button - disabled podczas isPending */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(article.id)}
                        disabled={isDeleting}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        {isDeleting ? (
                          <span className="text-xs">Usuwanie...</span>
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

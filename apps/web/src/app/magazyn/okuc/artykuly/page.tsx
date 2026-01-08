/**
 * Strona zarządzania artykułami OKUC
 *
 * Moduł: DualStock (Okucia PVC + ALU)
 * Funkcje:
 * - Lista artykułów z client-side filtering
 * - Dodawanie nowych artykułów
 * - Edycja istniejących artykułów
 * - Usuwanie artykułów (soft delete)
 *
 * Filtry:
 * - Search (po name, articleId, description)
 * - PVC (tak/nie/wszystkie)
 * - ALU (tak/nie/wszystkie)
 * - OrderClass (typical/atypical/wszystkie)
 * - SizeClass (standard/gabarat/wszystkie)
 */

'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Package } from 'lucide-react';
import { ArticlesTable } from '@/features/okuc/components/ArticlesTable';
import { ArticleForm } from '@/features/okuc/components/ArticleForm';
import { DeleteArticleDialog } from '@/features/okuc/components/DeleteArticleDialog';
import {
  useOkucArticles,
  useCreateOkucArticle,
  useUpdateOkucArticle,
  useDeleteOkucArticle,
} from '@/features/okuc/hooks/useOkucArticles';
import type { OkucArticle, OrderClass, SizeClass } from '@/types/okuc';

export default function OkucArticlesPage() {
  // === DATA FETCHING ===
  const { data: articles = [], isLoading, error } = useOkucArticles();

  // === STATE ===
  const [selectedArticle, setSelectedArticle] = useState<OkucArticle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [_isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Filtry
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPvc, setFilterPvc] = useState<'all' | 'yes' | 'no'>('all');
  const [filterAlu, setFilterAlu] = useState<'all' | 'yes' | 'no'>('all');
  const [filterOrderClass, setFilterOrderClass] = useState<OrderClass | 'all'>('all');
  const [filterSizeClass, setFilterSizeClass] = useState<SizeClass | 'all'>('all');

  // === MUTATIONS ===
  const createMutation = useCreateOkucArticle({
    onSuccess: () => {
      setIsFormOpen(false);
      setSelectedArticle(null);
    },
  });

  const updateMutation = useUpdateOkucArticle({
    onSuccess: () => {
      setIsFormOpen(false);
      setSelectedArticle(null);
    },
  });

  const deleteMutation = useDeleteOkucArticle({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedArticle(null);
    },
  });

  // === CLIENT-SIDE FILTERING ===
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    // Search - po name, articleId, description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (article) =>
          article.name.toLowerCase().includes(query) ||
          article.articleId.toLowerCase().includes(query) ||
          article.description?.toLowerCase().includes(query)
      );
    }

    // PVC filter
    if (filterPvc === 'yes') {
      result = result.filter((a) => a.usedInPvc);
    } else if (filterPvc === 'no') {
      result = result.filter((a) => !a.usedInPvc);
    }

    // ALU filter
    if (filterAlu === 'yes') {
      result = result.filter((a) => a.usedInAlu);
    } else if (filterAlu === 'no') {
      result = result.filter((a) => !a.usedInAlu);
    }

    // OrderClass filter
    if (filterOrderClass !== 'all') {
      result = result.filter((a) => a.orderClass === filterOrderClass);
    }

    // SizeClass filter
    if (filterSizeClass !== 'all') {
      result = result.filter((a) => a.sizeClass === filterSizeClass);
    }

    return result;
  }, [articles, searchQuery, filterPvc, filterAlu, filterOrderClass, filterSizeClass]);

  // === EVENT HANDLERS ===
  const handleAddNew = () => {
    setSelectedArticle(null);
    setIsFormOpen(true);
  };

  const handleEdit = (articleId: number) => {
    const article = articles?.find((a) => a.id === articleId);
    if (article) {
      setSelectedArticle(article);
      setIsFormOpen(true);
    }
  };

  const handleDelete = (articleId: number) => {
    const article = articles?.find((a) => a.id === articleId);
    if (article) {
      setSelectedArticle(article);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleFormSubmit = (data: Partial<OkucArticle>) => {
    if (selectedArticle) {
      updateMutation.mutate({ id: selectedArticle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteConfirm = (id: number) => {
    deleteMutation.mutate(id);
  };

  // === RENDER ===
  return (
    <div className="flex flex-col h-full">
      <Header title="Artykuły okuć" />

      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb
            items={[
              { label: 'Magazyn', href: '/magazyn' },
              { label: 'OKUC', href: '/magazyn/okuc' },
              { label: 'Artykuły', icon: <Package className="h-4 w-4" /> },
            ]}
          />
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nowy artykuł
          </Button>
        </div>

        {/* Filtry */}
        <div className="bg-card border rounded-lg p-4 mb-4 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Filtry</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Szukaj</Label>
              <Input
                id="search"
                placeholder="Numer, nazwa lub opis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* PVC */}
            <div className="space-y-2">
              <Label htmlFor="filterPvc">PVC</Label>
              <Select value={filterPvc} onValueChange={(v) => setFilterPvc(v as 'all' | 'yes' | 'no')}>
                <SelectTrigger id="filterPvc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="yes">Tak</SelectItem>
                  <SelectItem value="no">Nie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ALU */}
            <div className="space-y-2">
              <Label htmlFor="filterAlu">ALU</Label>
              <Select value={filterAlu} onValueChange={(v) => setFilterAlu(v as 'all' | 'yes' | 'no')}>
                <SelectTrigger id="filterAlu">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="yes">Tak</SelectItem>
                  <SelectItem value="no">Nie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* OrderClass */}
            <div className="space-y-2">
              <Label htmlFor="filterOrderClass">Klasa zamówienia</Label>
              <Select
                value={filterOrderClass}
                onValueChange={(v) => setFilterOrderClass(v as OrderClass | 'all')}
              >
                <SelectTrigger id="filterOrderClass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="typical">Typowy</SelectItem>
                  <SelectItem value="atypical">Atypowy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SizeClass */}
            <div className="space-y-2">
              <Label htmlFor="filterSizeClass">Klasa wielkości</Label>
              <Select
                value={filterSizeClass}
                onValueChange={(v) => setFilterSizeClass(v as SizeClass | 'all')}
              >
                <SelectTrigger id="filterSizeClass">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="gabarat">Gabarat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Znaleziono: <strong>{filteredArticles.length}</strong> artykułów (z{' '}
              <strong>{articles.length}</strong> wszystkich)
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Ładowanie artykułów...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive">
              <strong>Błąd:</strong> {(error as Error).message}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <ArticlesTable
            articles={filteredArticles}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeletingId={deleteMutation.isPending ? selectedArticle?.id : undefined}
          />
        )}
      </div>

      {/* Dialogs */}
      <ArticleForm
        article={selectedArticle}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteArticleDialog
        article={selectedArticle}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedArticle(null);
        }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

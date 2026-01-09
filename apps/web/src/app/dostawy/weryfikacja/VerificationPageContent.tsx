'use client';

/**
 * VerificationPageContent - Główny komponent strony weryfikacji
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  VerificationListForm,
  VerificationItemsInput,
  VerificationItemsList,
  VerificationResults,
  useVerificationLists,
  useVerificationList,
  useCreateVerificationList,
  useUpdateVerificationList,
  useDeleteVerificationList,
  useAddItemsToList,
  useDeleteItemFromList,
  useClearListItems,
  useVerifyList,
  useApplyChanges,
} from '@/features/akrobud-verification';

import type { VerificationResult, CreateVerificationListData, UpdateVerificationListData, AkrobudVerificationList } from '@/types';

export const VerificationPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const dateFromUrl = searchParams.get('date');
  const hasProcessedUrlDate = useRef(false);

  // Stan UI
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [pendingDateForCreate, setPendingDateForCreate] = useState<string | null>(null);

  // Pobierz listy
  const { data: lists = [], isLoading: isLoadingLists } = useVerificationLists();

  // Pobierz wybraną listę
  const { data: selectedList, isLoading: isLoadingList } = useVerificationList(selectedListId);

  // Efekt: obsługa daty z URL
  // Gdy strona jest otwierana z ?date=YYYY-MM-DD, znajdź istniejącą listę lub otwórz dialog tworzenia
  useEffect(() => {
    if (hasProcessedUrlDate.current || isLoadingLists || !dateFromUrl) return;

    // Oznacz że już przetworzyliśmy datę z URL
    hasProcessedUrlDate.current = true;

    // Szukaj listy dla danej daty
    const targetDate = new Date(dateFromUrl);
    const existingList = lists.find((list: AkrobudVerificationList) => {
      const listDate = new Date(list.deliveryDate);
      return (
        listDate.getFullYear() === targetDate.getFullYear() &&
        listDate.getMonth() === targetDate.getMonth() &&
        listDate.getDate() === targetDate.getDate()
      );
    });

    if (existingList) {
      // Znaleziono istniejącą listę - wybierz ją
      setSelectedListId(existingList.id);
    } else {
      // Nie ma listy dla tej daty - otwórz dialog tworzenia z wypełnioną datą
      setPendingDateForCreate(dateFromUrl);
      setIsCreateDialogOpen(true);
    }
  }, [dateFromUrl, lists, isLoadingLists]);

  // Mutacje
  const createList = useCreateVerificationList({
    onSuccess: (id) => {
      setIsCreateDialogOpen(false);
      setSelectedListId(id);
    },
  });

  const updateList = useUpdateVerificationList({
    onSuccess: () => {
      setIsEditDialogOpen(false);
    },
  });

  const deleteList = useDeleteVerificationList({
    onSuccess: () => {
      setSelectedListId(null);
      setVerificationResult(null);
    },
  });

  const addItems = useAddItemsToList();
  const deleteItem = useDeleteItemFromList();
  const clearItems = useClearListItems();

  const verifyList = useVerifyList({
    onSuccess: () => {
      // Wynik będzie w mutation.data
    },
  });

  const applyChanges = useApplyChanges({
    onSuccess: () => {
      // Po zastosowaniu zmian odśwież weryfikację
      if (selectedListId) {
        verifyList.mutate({ listId: selectedListId });
      }
    },
  });

  // Handlers
  const handleCreateList = (data: CreateVerificationListData | UpdateVerificationListData) => {
    // W trybie create zawsze otrzymujemy CreateVerificationListData
    createList.mutate(data as CreateVerificationListData);
  };

  const handleVerify = () => {
    if (!selectedListId) return;

    verifyList.mutate(
      { listId: selectedListId, params: { createDeliveryIfMissing: true } },
      {
        onSuccess: (result) => {
          setVerificationResult(result);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Szkic</Badge>;
      case 'verified':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Zweryfikowana</Badge>;
      case 'applied':
        return <Badge variant="default" className="bg-green-100 text-green-800">Zastosowana</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dostawy">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Weryfikacja list Akrobud</h1>
            <p className="text-muted-foreground">
              Porównaj listę od klienta z tym co jest w dostawie
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nowa lista
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolumna 1: Lista list weryfikacyjnych */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Listy weryfikacyjne</CardTitle>
            <CardDescription>Wybierz listę do edycji</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLists ? (
              <div className="text-center py-4 text-muted-foreground">
                Ładowanie...
              </div>
            ) : lists.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Brak list. Utwórz nową listę.
              </div>
            ) : (
              <div className="space-y-2">
                {lists.map((list: AkrobudVerificationList) => (
                  <div
                    key={list.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedListId === list.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedListId(list.id);
                      setVerificationResult(null);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {format(new Date(list.deliveryDate), 'PPP', { locale: pl })}
                      </span>
                      {getStatusBadge(list.status)}
                    </div>
                    {list.title && (
                      <p className="text-sm text-muted-foreground">{list.title}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {list._count?.items ?? list.items?.length ?? 0} elementów
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kolumna 2-3: Szczegóły listy */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedListId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Wybierz listę z lewej strony lub utwórz nową
              </CardContent>
            </Card>
          ) : isLoadingList ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Ładowanie...
              </CardContent>
            </Card>
          ) : selectedList ? (
            <>
              {/* Nagłówek listy */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {format(new Date(selectedList.deliveryDate), 'PPP', { locale: pl })}
                        {getStatusBadge(selectedList.status)}
                      </CardTitle>
                      {selectedList.title && (
                        <CardDescription>{selectedList.title}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć listę?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ta operacja usunie listę weryfikacyjną. Nie wpłynie to na
                              istniejące dostawy i zlecenia.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteList.mutate(selectedListId)}
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Dodawanie elementów */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dodaj zlecenia</CardTitle>
                  <CardDescription>
                    Wklej listę numerów zleceń od klienta Akrobud
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VerificationItemsInput
                    onAddItems={(data) =>
                      addItems.mutate({ listId: selectedListId, data })
                    }
                    isPending={addItems.isPending}
                    existingItems={selectedList.items}
                  />
                </CardContent>
              </Card>

              {/* Lista elementów */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Elementy listy ({selectedList.items.length})
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      {selectedList.items.length > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Wyczyść
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Wyczyścić listę?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Usunie wszystkie elementy z listy weryfikacyjnej.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => clearItems.mutate(selectedListId)}
                              >
                                Wyczyść
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button
                        onClick={handleVerify}
                        disabled={selectedList.items.length === 0 || verifyList.isPending}
                      >
                        {verifyList.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Weryfikuję...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Weryfikuj
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <VerificationItemsList
                    items={selectedList.items}
                    onDeleteItem={(itemId) =>
                      deleteItem.mutate({ listId: selectedListId, itemId })
                    }
                    isPending={deleteItem.isPending}
                  />
                </CardContent>
              </Card>

              {/* Wyniki weryfikacji */}
              {verificationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Wyniki weryfikacji</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VerificationResults
                      result={verificationResult}
                      onApplyChanges={(params) =>
                        applyChanges.mutate({ listId: selectedListId, params })
                      }
                      isPending={applyChanges.isPending}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Dialog tworzenia listy */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            // Wyczyść pendingDateForCreate gdy dialog jest zamykany
            setPendingDateForCreate(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowa lista weryfikacyjna</DialogTitle>
            <DialogDescription>
              Utwórz nową listę dla danego dnia dostawy
            </DialogDescription>
          </DialogHeader>
          <VerificationListForm
            mode="create"
            initialData={
              pendingDateForCreate
                ? { deliveryDate: pendingDateForCreate }
                : undefined
            }
            onSubmit={handleCreateList}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setPendingDateForCreate(null);
            }}
            isPending={createList.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog edycji listy */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj listę</DialogTitle>
            <DialogDescription>Zmień datę lub tytuł listy</DialogDescription>
          </DialogHeader>
          {selectedList && (
            <VerificationListForm
              mode="edit"
              initialData={{
                deliveryDate: selectedList.deliveryDate,
                title: selectedList.title,
                notes: selectedList.notes,
              }}
              onSubmit={(data) =>
                updateList.mutate({ id: selectedListId!, data })
              }
              onCancel={() => setIsEditDialogOpen(false)}
              isPending={updateList.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationPageContent;

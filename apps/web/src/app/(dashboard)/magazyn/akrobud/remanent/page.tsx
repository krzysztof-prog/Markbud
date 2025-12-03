'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Archive, History } from 'lucide-react';
import Link from 'next/link';
import { useWarehouseData } from '@/features/warehouse/hooks/useWarehouseData';
import { useRemanentSubmit, useFinalizeMonth } from '@/features/warehouse/remanent/hooks/useRemanent';
import { RemanentTable } from '@/features/warehouse/remanent/components/RemanentTable';
import { RemanentConfirmModal } from '@/features/warehouse/remanent/components/RemanentConfirmModal';
import { FinalizeMonthModal } from '@/features/warehouse/remanent/components/FinalizeMonthModal';
import { ColorSidebar } from '@/features/warehouse/components/ColorSidebar';
import type { RemanentFormEntry, FinalizeMonthResponse } from '@/types/warehouse';

export default function RemanentPage() {
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [entries, setEntries] = useState<RemanentFormEntry[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizePreview, setFinalizePreview] = useState<FinalizeMonthResponse | null>(null);

  const { data: warehouseData, isLoading } = useWarehouseData(selectedColorId);
  const remanentMutation = useRemanentSubmit();
  const finalizeMutation = useFinalizeMonth();

  const selectedColor = warehouseData?.color;

  const handleSaveClick = useCallback(() => {
    // Validate that at least one entry has actualStock filled
    const hasFilledEntries = entries.some((e) => e.actualStock !== '');
    if (!hasFilledEntries) {
      return;
    }
    setShowConfirmModal(true);
  }, [entries]);

  const handleConfirmSave = useCallback(async () => {
    if (!selectedColorId) return;

    // Filter out empty entries and convert to API format
    const updates = entries
      .filter((e) => e.actualStock !== '')
      .map((e) => ({
        profileId: e.profileId,
        actualStock: Number(e.actualStock),
      }));

    await remanentMutation.mutateAsync({
      colorId: selectedColorId,
      updates,
    });

    setShowConfirmModal(false);
    setEntries([]);
  }, [selectedColorId, entries, remanentMutation]);

  const handleFinalize = useCallback(async (month: string, archive: boolean) => {
    const result = await finalizeMutation.mutateAsync({ month, archive });

    if (archive) {
      setShowFinalizeModal(false);
      setFinalizePreview(null);
    } else {
      // Store preview data
      setFinalizePreview(result);
    }
  }, [finalizeMutation]);

  const hasUnsavedChanges = entries.some((e) => e.actualStock !== '');

  return (
    <div className="flex h-full">
      {/* Color Sidebar */}
      <ColorSidebar
        selectedColorId={selectedColorId}
        onColorSelect={setSelectedColorId}
        className="w-64 border-r"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/magazyn/akrobud">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Powrót do magazynu
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Remanent magazynu</h1>
                <p className="text-slate-600 mt-1">
                  Porównaj stan obliczony ze stanem rzeczywistym
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowFinalizeModal(true)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Finalizuj miesiąc
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/magazyn/akrobud/remanent/historia">
                    <History className="h-4 w-4 mr-2" />
                    Historia
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          {!selectedColorId ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-slate-500">
                  <p className="text-lg font-medium">Wybierz kolor z listy</p>
                  <p className="text-sm mt-2">
                    Aby wykonać remanent, wybierz kolor z panelu po lewej stronie
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-slate-500">Ładowanie danych...</div>
              </CardContent>
            </Card>
          ) : !warehouseData?.data || warehouseData.data.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-slate-500">
                  Brak danych magazynowych dla tego koloru
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 border-slate-300"
                      style={{ backgroundColor: selectedColor?.hexColor || '#ccc' }}
                      title={selectedColor?.code}
                    />
                    <div>
                      <CardTitle>{selectedColor?.name}</CardTitle>
                      <CardDescription>{selectedColor?.code}</CardDescription>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleSaveClick}
                    disabled={!hasUnsavedChanges || remanentMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {remanentMutation.isPending ? 'Zapisywanie...' : 'Zapisz remanent'}
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <RemanentTable
                  warehouseData={warehouseData.data}
                  entries={entries}
                  onChange={setEntries}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedColor && (
        <RemanentConfirmModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          onConfirm={handleConfirmSave}
          colorCode={selectedColor.hexColor || '#ccc'}
          colorName={selectedColor.name}
          colorCodeText={selectedColor.code}
          entries={entries}
          isPending={remanentMutation.isPending}
        />
      )}

      <FinalizeMonthModal
        open={showFinalizeModal}
        onOpenChange={(open) => {
          setShowFinalizeModal(open);
          if (!open) setFinalizePreview(null);
        }}
        onFinalize={handleFinalize}
        isPending={finalizeMutation.isPending}
        previewData={finalizePreview}
      />
    </div>
  );
}

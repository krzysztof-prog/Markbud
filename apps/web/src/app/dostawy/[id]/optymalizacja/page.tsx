'use client';

import { Suspense, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  usePalletOptimization,
  useOptimizePallet,
  useDeleteOptimization,
  useDownloadPdf,
} from '@/features/pallets/hooks/usePalletOptimization';
import { ArrowLeft, Download, Trash2, RefreshCw, Package } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OptymalizacjaPage({ params }: PageProps) {
  const { id } = use(params);
  const deliveryId = parseInt(id, 10);

  return (
    <>
      <Header title="Optymalizacja Palet" />

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Dostawy', href: '/dostawy' },
            { label: `Dostawa #${deliveryId}`, href: `/dostawy/${deliveryId}` },
            { label: 'Optymalizacja' },
          ]}
        />
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <OptimizationContent deliveryId={deliveryId} />
        </Suspense>
      </div>
    </>
  );
}

function OptimizationContent({ deliveryId }: { deliveryId: number }) {
  const router = useRouter();
  const { data: optimization, error, isLoading } = usePalletOptimization(deliveryId);
  const optimizeMutation = useOptimizePallet();
  const deleteMutation = useDeleteOptimization();
  const downloadPdf = useDownloadPdf();

  const handleOptimize = async () => {
    try {
      await optimizeMutation.mutateAsync(deliveryId);
      showSuccessToast('Optymalizacja zakończona pomyślnie');
    } catch (error) {
      showErrorToast('Błąd podczas optymalizacji', getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć optymalizację?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deliveryId);
      showSuccessToast('Optymalizacja została usunięta');
      router.push('/dostawy');
    } catch (error) {
      showErrorToast('Błąd podczas usuwania optymalizacji', getErrorMessage(error));
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadPdf.mutateAsync(deliveryId);
      showSuccessToast('PDF został pobrany');
    } catch (error) {
      showErrorToast('Błąd podczas pobierania PDF', getErrorMessage(error));
    }
  };

  // Show loading state
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  // Handle errors other than 404
  if (error && (error as any).status !== 404) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Błąd</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {getErrorMessage(error)}
          </p>
          <Button variant="outline" onClick={() => router.push('/dostawy')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do dostaw
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Jeśli brak optymalizacji (404) lub brak danych
  if (!optimization || (error && (error as any).status === 404)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Brak optymalizacji
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Dla tej dostawy nie ma jeszcze utworzonej optymalizacji pakowania palet.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleOptimize} disabled={optimizeMutation.isPending}>
              {optimizeMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Optymalizacja...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Uruchom optymalizację
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => router.push('/dostawy')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do dostaw
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Akcje */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/dostawy')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do dostaw
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleOptimize} disabled={optimizeMutation.isPending}>
                {optimizeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Ponowna optymalizacja...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Ponowna optymalizacja
                  </>
                )}
              </Button>
              <Button onClick={handleDownloadPdf} disabled={downloadPdf.isPending}>
                {downloadPdf.isPending ? (
                  <>
                    <Download className="mr-2 h-4 w-4 animate-spin" />
                    Pobieranie...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Pobierz PDF
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń optymalizację
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Podsumowanie */}
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie Optymalizacji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Liczba palet</p>
              <p className="text-2xl font-bold">{optimization.totalPallets}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Liczba okien</p>
              <p className="text-2xl font-bold">{optimization.summary.totalWindows}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Średnie wykorzystanie</p>
              <p className="text-2xl font-bold">
                {optimization.summary.averageUtilization.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Szczegóły palet */}
      <div className="space-y-4">
        {optimization.pallets.map((pallet, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span>
                    Paleta {pallet.palletNumber}: {pallet.palletType}
                  </span>
                  <Badge variant="outline">{pallet.palletWidthMm}mm</Badge>
                </div>
                <Badge
                  variant={
                    pallet.utilizationPercent >= 80
                      ? 'default'
                      : pallet.utilizationPercent >= 50
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {pallet.utilizationPercent.toFixed(1)}% wykorzystania
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-muted-foreground">
                Głębokość: {pallet.usedDepthMm}mm / {pallet.maxDepthMm}mm
              </div>

              {/* Tabela okien */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left text-sm font-medium">Lp</th>
                      <th className="p-2 text-left text-sm font-medium">Szerokość</th>
                      <th className="p-2 text-left text-sm font-medium">Wysokość</th>
                      <th className="p-2 text-left text-sm font-medium">Profil</th>
                      <th className="p-2 text-left text-sm font-medium">Głębokość</th>
                      <th className="p-2 text-left text-sm font-medium">Ilość</th>
                      <th className="p-2 text-left text-sm font-medium">Zlecenie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pallet.windows.map((window, windowIndex) => (
                      <tr key={windowIndex} className="border-b hover:bg-muted/20">
                        <td className="p-2 text-sm">{windowIndex + 1}</td>
                        <td className="p-2 text-sm">{window.widthMm} mm</td>
                        <td className="p-2 text-sm">{window.heightMm} mm</td>
                        <td className="p-2 text-sm">
                          <Badge variant="outline">{window.profileType}</Badge>
                        </td>
                        <td className="p-2 text-sm">{window.depthMm} mm</td>
                        <td className="p-2 text-sm">{window.quantity}</td>
                        <td className="p-2 text-sm font-mono">{window.orderNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Liczba okien w palecie */}
              <div className="mt-4 text-sm text-muted-foreground">
                Łącznie {pallet.windows.length} okien w tej palecie
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

'use client';

import { Suspense, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  usePalletOptimization,
  useOptimizePallet,
  useDeleteOptimization,
  useDownloadPdf,
} from '@/features/pallets/hooks/usePalletOptimization';
import { deliveriesApi } from '@/lib/api';
import { ArrowLeft, Download, Trash2, RefreshCw, Package, Settings2, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { DEFAULT_OPTIMIZATION_OPTIONS, type OptimizationOptions } from '@/types/pallet';
import { PalletVisualization, PalletVisualizationLegend } from '@/features/pallets/components';
import type { ApiError } from '@/types/common';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OptymalizacjaPage({ params }: PageProps) {
  const { id } = use(params);
  const deliveryId = parseInt(id, 10);

  // Pobierz dane dostawy żeby pokazać nazwę w breadcrumb
  const { data: delivery } = useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: () => deliveriesApi.getById(deliveryId),
  });

  const deliveryLabel = delivery?.deliveryNumber || `#${deliveryId}`;

  return (
    <>
      <Header title={`Optymalizacja Palet - ${deliveryLabel}`} />

      <div className="px-6 pt-4">
        <Breadcrumb
          items={[
            { label: 'Dostawy', href: '/dostawy' },
            { label: deliveryLabel, href: `/dostawy/${deliveryId}` },
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

  // Stan opcji optymalizacji
  const [options, setOptions] = useState<OptimizationOptions>(
    optimization?.options || DEFAULT_OPTIMIZATION_OPTIONS
  );
  const [showOptions, setShowOptions] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);

  const handleOptimize = async () => {
    try {
      await optimizeMutation.mutateAsync({ deliveryId, options });
      showSuccessToast('Optymalizacja zakończona pomyślnie');
    } catch (error) {
      showErrorToast('Błąd podczas optymalizacji', getErrorMessage(error));
    }
  };

  const updateOption = <K extends keyof OptimizationOptions>(
    key: K,
    value: OptimizationOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
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

  // Spójny wrapper dla loading state - zapobiega layout shift
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle errors other than 404
  const apiError = error ? (error as unknown as ApiError) : undefined;
  if (error && apiError?.status !== 404) {
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

  // Panel opcji optymalizacji (używany w obu przypadkach)
  const optionsPanel = (
    <Collapsible open={showOptions} onOpenChange={setShowOptions}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" />
                Opcje optymalizacji
              </CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CardDescription>
            Dostosuj parametry algorytmu pakowania
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Sekcja: Sortowanie */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Sortowanie</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sortByHeight"
                  checked={options.sortByHeightWhenWidthSimilar}
                  onCheckedChange={(checked) => updateOption('sortByHeightWhenWidthSimilar', checked === true)}
                />
                <Label htmlFor="sortByHeight" className="text-sm font-normal">
                  Sortuj po wysokości gdy szerokości podobne (±{Math.round(options.widthSimilarityThreshold * 100)}%)
                </Label>
              </div>
              <div className="pl-6 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Próg podobieństwa szerokości: {Math.round(options.widthSimilarityThreshold * 100)}%
                </Label>
                <Slider
                  value={[options.widthSimilarityThreshold * 100]}
                  onValueChange={([val]: number[]) => updateOption('widthSimilarityThreshold', val / 100)}
                  min={5}
                  max={30}
                  step={1}
                  className="w-48"
                  disabled={!options.sortByHeightWhenWidthSimilar}
                />
              </div>
            </div>

            {/* Sekcja: Palety */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Palety</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preferStandard"
                  checked={options.preferStandardPallets}
                  onCheckedChange={(checked) => updateOption('preferStandardPallets', checked === true)}
                />
                <Label htmlFor="preferStandard" className="text-sm font-normal">
                  Preferuj standardowe (większe) palety nad małe
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maximizeUtilization"
                  checked={options.maximizeUtilization}
                  onCheckedChange={(checked) => updateOption('maximizeUtilization', checked === true)}
                />
                <Label htmlFor="maximizeUtilization" className="text-sm font-normal">
                  Preferuj jak najmniej wolnego miejsca na paletach
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="minimizeOverhang"
                  checked={options.minimizeOverhang}
                  onCheckedChange={(checked) => updateOption('minimizeOverhang', checked === true)}
                />
                <Label htmlFor="minimizeOverhang" className="text-sm font-normal">
                  Minimalizuj wystawanie okien poza paletę
                </Label>
              </div>
              <div className="pl-6 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Maksymalne wystawanie: {options.maxOverhangMm}mm
                </Label>
                <Slider
                  value={[options.maxOverhangMm]}
                  onValueChange={([val]: number[]) => updateOption('maxOverhangMm', val)}
                  min={0}
                  max={1000}
                  step={50}
                  className="w-48"
                />
              </div>
            </div>

            {/* Sekcja: Układanie */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Układanie</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowSideBySide"
                  checked={options.allowSideBySide}
                  onCheckedChange={(checked) => updateOption('allowSideBySide', checked === true)}
                />
                <Label htmlFor="allowSideBySide" className="text-sm font-normal">
                  Pozwól układać dwa okna obok siebie
                </Label>
              </div>
              <div className="pl-6 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Maksymalny odstęp między oknami: {options.sideBySideMaxGap}mm
                </Label>
                <Slider
                  value={[options.sideBySideMaxGap]}
                  onValueChange={([val]: number[]) => updateOption('sideBySideMaxGap', val)}
                  min={0}
                  max={300}
                  step={10}
                  className="w-48"
                  disabled={!options.allowSideBySide}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  // Jeśli brak optymalizacji (404) lub brak danych
  if (!optimization || (error && apiError?.status === 404)) {
    return (
      <div className="space-y-4">
        {optionsPanel}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opcje */}
      {optionsPanel}

      {/* Akcje */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <Button variant="outline" onClick={() => router.push('/dostawy')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do dostaw
            </Button>
            <div className="flex gap-2 flex-wrap">
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
          <div className="flex items-center justify-between">
            <CardTitle>Podsumowanie Optymalizacji</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisualization(!showVisualization)}
            >
              {showVisualization ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Ukryj wizualizację
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Pokaż wizualizację
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
          {/* Legenda wizualizacji */}
          {showVisualization && (
            <div className="pt-4 border-t">
              <PalletVisualizationLegend />
            </div>
          )}
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
                  <Badge variant="outline">{pallet.palletLengthMm}mm</Badge>
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

              {/* Wizualizacja palety */}
              {showVisualization && (
                <div className="mb-6">
                  <PalletVisualization pallet={pallet} />
                </div>
              )}

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

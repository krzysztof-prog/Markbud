'use client';

/**
 * VerificationResults - Wyświetla wyniki weryfikacji
 * Obsługuje dwa tryby:
 * - Legacy: wyświetlanie zleceń (matched/missing/excess/notFound)
 * - Nowy: wyświetlanie projektów z powiązanymi zleceniami (projectResults)
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type {
  VerificationResult,
  ApplyChangesParams,
  ProjectDeliveryStatus,
} from '@/types';

interface VerificationResultsProps {
  result: VerificationResult;
  onApplyChanges: (params: ApplyChangesParams) => void;
  isPending?: boolean;
}

export const VerificationResults: React.FC<VerificationResultsProps> = ({
  result,
  onApplyChanges,
  isPending = false,
}) => {
  // Sprawdź czy używamy trybu projektów
  const useProjectMode = Boolean(
    result.projectResults && result.projectResults.length > 0
  );

  if (useProjectMode) {
    return (
      <ProjectVerificationView
        result={result}
        onApplyChanges={onApplyChanges}
        isPending={isPending}
      />
    );
  }

  // Legacy mode - wyświetlanie zleceń
  return (
    <LegacyVerificationView
      result={result}
      onApplyChanges={onApplyChanges}
      isPending={isPending}
    />
  );
};

// ==================================
// NOWY WIDOK - PROJEKTY
// ==================================

interface ProjectVerificationViewProps {
  result: VerificationResult;
  onApplyChanges: (params: ApplyChangesParams) => void;
  isPending: boolean;
}

const ProjectVerificationView: React.FC<ProjectVerificationViewProps> = ({
  result,
  onApplyChanges,
  isPending,
}) => {
  const projectResults = result.projectResults || [];

  // Grupowanie projektów po statusie
  const groupedProjects = useMemo(() => {
    const groups = {
      all: [] as ProjectDeliveryStatus[], // wszystkie zlecenia w dostawie
      partial: [] as ProjectDeliveryStatus[], // część zleceń w dostawie
      none: [] as ProjectDeliveryStatus[], // żadne zlecenie w dostawie
      not_found: [] as ProjectDeliveryStatus[], // projekt bez zleceń w systemie
    };

    for (const project of projectResults) {
      groups[project.deliveryStatus].push(project);
    }

    return groups;
  }, [projectResults]);

  // Stan zaznaczonych zleceń do dodania/usunięcia
  const [selectedToAdd, setSelectedToAdd] = useState<Set<number>>(() => {
    // Domyślnie zaznacz wszystkie brakujące zlecenia
    const ids = new Set<number>();
    for (const project of projectResults) {
      for (const order of project.ordersNotInDelivery) {
        ids.add(order.id);
      }
    }
    return ids;
  });

  const [selectedToRemove, setSelectedToRemove] = useState<Set<number>>(
    new Set()
  );

  // Zlecenia nadmiarowe (w dostawie, ale nie na liście projektów)
  const excessOrders = result.excess || [];

  // Stan rozwinięcia projektów
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  const toggleProject = (projectNumber: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectNumber)) {
      newSet.delete(projectNumber);
    } else {
      newSet.add(projectNumber);
    }
    setExpandedProjects(newSet);
  };

  const toggleAdd = (orderId: number) => {
    const newSet = new Set(selectedToAdd);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedToAdd(newSet);
  };

  const toggleRemove = (orderId: number) => {
    const newSet = new Set(selectedToRemove);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedToRemove(newSet);
  };

  const handleApply = () => {
    onApplyChanges({
      addMissing: Array.from(selectedToAdd),
      removeExcess: Array.from(selectedToRemove),
    });
  };

  // Dodaj wszystkie zlecenia projektu do dostawy
  const addAllFromProject = (project: ProjectDeliveryStatus) => {
    const newSet = new Set(selectedToAdd);
    for (const order of project.ordersNotInDelivery) {
      newSet.add(order.id);
    }
    setSelectedToAdd(newSet);
  };

  // Statystyki
  const stats = {
    all: groupedProjects.all.length,
    partial: groupedProjects.partial.length,
    none: groupedProjects.none.length,
    notFound: groupedProjects.not_found.length,
    excess: excessOrders.length,
  };

  const hasChanges = selectedToAdd.size > 0 || selectedToRemove.size > 0;

  return (
    <div className="space-y-6">
      {/* Podsumowanie - karty statystyk */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.all}</p>
                <p className="text-sm text-muted-foreground">Zgodne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.partial}</p>
                <p className="text-sm text-muted-foreground">Częściowe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.none}</p>
                <p className="text-sm text-muted-foreground">Brakujące</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{stats.excess}</p>
                <p className="text-sm text-muted-foreground">Nadmiarowe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.notFound}</p>
                <p className="text-sm text-muted-foreground">Nieznalezione</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informacja o dostawie */}
      {result.delivery ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-medium">Dostawa:</span>{' '}
              {result.delivery.deliveryNumber ?? `ID ${result.delivery.id}`}
              <Badge variant="outline" className="ml-2">
                {result.delivery.status}
              </Badge>
            </p>
          </CardContent>
        </Card>
      ) : result.needsDeliveryCreation ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">
                Brak dostawy na ten dzień. Zostanie utworzona automatycznie przy
                aplikowaniu zmian.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Sekcja: Zgodne projekty (wszystkie zlecenia w dostawie) */}
      {groupedProjects.all.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Zgodne projekty ({groupedProjects.all.length})
              <span className="text-sm font-normal text-muted-foreground">
                - wszystkie zlecenia są w dostawie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {groupedProjects.all.map((project) => (
                  <ProjectItem
                    key={project.projectNumber}
                    project={project}
                    variant="success"
                    isExpanded={expandedProjects.has(project.projectNumber)}
                    onToggle={() => toggleProject(project.projectNumber)}
                    selectedToAdd={selectedToAdd}
                    onToggleAdd={toggleAdd}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sekcja: Częściowe projekty */}
      {groupedProjects.partial.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Częściowe ({groupedProjects.partial.length})
              <span className="text-sm font-normal text-muted-foreground">
                - część zleceń w dostawie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {groupedProjects.partial.map((project) => (
                  <ProjectItem
                    key={project.projectNumber}
                    project={project}
                    variant="warning"
                    isExpanded={expandedProjects.has(project.projectNumber)}
                    onToggle={() => toggleProject(project.projectNumber)}
                    selectedToAdd={selectedToAdd}
                    onToggleAdd={toggleAdd}
                    onAddAll={() => addAllFromProject(project)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sekcja: Brakujące projekty */}
      {groupedProjects.none.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Brakujące ({groupedProjects.none.length})
              <span className="text-sm font-normal text-muted-foreground">
                - żadne zlecenie nie jest w dostawie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {groupedProjects.none.map((project) => (
                  <ProjectItem
                    key={project.projectNumber}
                    project={project}
                    variant="error"
                    isExpanded={expandedProjects.has(project.projectNumber)}
                    onToggle={() => toggleProject(project.projectNumber)}
                    selectedToAdd={selectedToAdd}
                    onToggleAdd={toggleAdd}
                    onAddAll={() => addAllFromProject(project)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sekcja: Nadmiarowe zlecenia */}
      {excessOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              Nadmiarowe w dostawie ({excessOrders.length})
              <span className="text-sm font-normal text-muted-foreground">
                - zlecenia w dostawie spoza listy projektów
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedToRemove(
                    new Set(excessOrders.map((e) => e.orderId))
                  )
                }
              >
                Zaznacz wszystkie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedToRemove(new Set())}
              >
                Odznacz wszystkie
              </Button>
            </div>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {excessOrders.map((item) => (
                  <div
                    key={item.orderId}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedToRemove.has(item.orderId)}
                      onCheckedChange={() => toggleRemove(item.orderId)}
                    />
                    <span className="font-mono font-medium">
                      {item.orderNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.client}
                      {item.project && ` - ${item.project}`}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      <Minus className="h-3 w-3 mr-1" />
                      Usuń
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Sekcja: Nieznalezione projekty */}
      {groupedProjects.not_found.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Nieznalezione ({groupedProjects.not_found.length})
              <span className="text-sm font-normal text-muted-foreground">
                - projekty bez zleceń w systemie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[150px]">
              <div className="space-y-2">
                {groupedProjects.not_found.map((project) => (
                  <div
                    key={project.projectNumber}
                    className="flex items-center gap-3 p-2 rounded bg-orange-50"
                  >
                    <FolderOpen className="h-4 w-4 text-orange-600" />
                    <span className="font-mono font-medium">
                      {project.projectNumber}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      Brak zleceń w systemie
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Przyciski akcji */}
      <div className="flex flex-col sm:flex-row gap-3">
        {selectedToAdd.size > 0 && (
          <Button
            variant="outline"
            onClick={() => onApplyChanges({ addMissing: Array.from(selectedToAdd) })}
            disabled={isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zaznaczone ({selectedToAdd.size})
          </Button>
        )}

        {selectedToRemove.size > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              onApplyChanges({ removeExcess: Array.from(selectedToRemove) })
            }
            disabled={isPending}
          >
            <Minus className="h-4 w-4 mr-2" />
            Usuń zaznaczone ({selectedToRemove.size})
          </Button>
        )}

        {hasChanges && (
          <Button onClick={handleApply} disabled={isPending} className="ml-auto">
            {isPending ? 'Aplikowanie...' : 'Zastosuj wszystkie zmiany'}
          </Button>
        )}
      </div>
    </div>
  );
};

// ==================================
// KOMPONENT PROJEKTU
// ==================================

interface ProjectItemProps {
  project: ProjectDeliveryStatus;
  variant: 'success' | 'warning' | 'error';
  isExpanded: boolean;
  onToggle: () => void;
  selectedToAdd: Set<number>;
  onToggleAdd: (orderId: number) => void;
  onAddAll?: () => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  variant,
  isExpanded,
  onToggle,
  selectedToAdd,
  onToggleAdd,
  onAddAll,
}) => {
  const variantStyles = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  };

  const iconColor = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          'rounded-lg border p-2',
          variantStyles[variant]
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <FolderOpen className={cn('h-4 w-4', iconColor[variant])} />
            <span className="font-mono font-medium">
              {project.projectNumber}
            </span>
            <span className="text-sm text-muted-foreground">
              {project.statusText}
            </span>
            {onAddAll && project.ordersNotInDelivery.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAll();
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Dodaj wszystkie
              </Button>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 pl-6 space-y-1 border-t pt-2">
            {/* Zlecenia w dostawie */}
            {project.ordersInDelivery.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-2 text-sm py-1"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-mono">{order.orderNumber}</span>
                <span className="text-muted-foreground">- w dostawie</span>
              </div>
            ))}

            {/* Zlecenia NIE w dostawie */}
            {project.ordersNotInDelivery.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-2 text-sm py-1"
              >
                <Checkbox
                  checked={selectedToAdd.has(order.id)}
                  onCheckedChange={() => onToggleAdd(order.id)}
                />
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-mono">{order.orderNumber}</span>
                <span className="text-muted-foreground">
                  - brak w dostawie
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto cursor-pointer"
                  onClick={() => onToggleAdd(order.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj
                </Badge>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ==================================
// LEGACY VIEW - ZLECENIA
// ==================================

interface LegacyVerificationViewProps {
  result: VerificationResult;
  onApplyChanges: (params: ApplyChangesParams) => void;
  isPending: boolean;
}

const LegacyVerificationView: React.FC<LegacyVerificationViewProps> = ({
  result,
  onApplyChanges,
  isPending,
}) => {
  // Stan zaznaczonych elementów do dodania/usunięcia
  const [selectedToAdd, setSelectedToAdd] = useState<Set<number>>(
    new Set(result.missing.map((m) => m.orderId))
  );
  const [selectedToRemove, setSelectedToRemove] = useState<Set<number>>(
    new Set(result.excess.map((e) => e.orderId))
  );

  const toggleAdd = (orderId: number) => {
    const newSet = new Set(selectedToAdd);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedToAdd(newSet);
  };

  const toggleRemove = (orderId: number) => {
    const newSet = new Set(selectedToRemove);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedToRemove(newSet);
  };

  const handleApply = () => {
    onApplyChanges({
      addMissing: Array.from(selectedToAdd),
      removeExcess: Array.from(selectedToRemove),
    });
  };

  const { summary } = result;
  const hasChanges = selectedToAdd.size > 0 || selectedToRemove.size > 0;

  return (
    <div className="space-y-6">
      {/* Podsumowanie */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{summary.matchedCount}</p>
                <p className="text-sm text-muted-foreground">Zgodne</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{summary.missingCount}</p>
                <p className="text-sm text-muted-foreground">Brakujące</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{summary.excessCount}</p>
                <p className="text-sm text-muted-foreground">Nadmiarowe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{summary.notFoundCount}</p>
                <p className="text-sm text-muted-foreground">Nieznane</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informacja o dostawie */}
      {result.delivery ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-medium">Dostawa:</span>{' '}
              {result.delivery.deliveryNumber ?? `ID ${result.delivery.id}`}
              <Badge variant="outline" className="ml-2">
                {result.delivery.status}
              </Badge>
            </p>
          </CardContent>
        </Card>
      ) : result.needsDeliveryCreation ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">
                Brak dostawy na ten dzień. Zostanie utworzona automatycznie przy
                aplikowaniu zmian.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Brakujące w dostawie */}
      {result.missing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Brakujące w dostawie ({result.missing.length})
              <span className="text-sm font-normal text-muted-foreground">
                - są na liście klienta, ale nie w dostawie
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedToAdd(new Set(result.missing.map((m) => m.orderId)))
                }
              >
                Zaznacz wszystkie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedToAdd(new Set())}
              >
                Odznacz wszystkie
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {result.missing.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedToAdd.has(item.orderId)}
                      onCheckedChange={() => toggleAdd(item.orderId)}
                    />
                    <span className="font-mono font-medium">
                      {toRoman(item.position)}. {item.orderNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.client}
                      {item.project && ` - ${item.project}`}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      <Plus className="h-3 w-3 mr-1" />
                      Dodaj
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Nadmiarowe w dostawie */}
      {result.excess.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Nadmiarowe w dostawie ({result.excess.length})
              <span className="text-sm font-normal text-muted-foreground">
                - są w dostawie, ale nie na liście klienta
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedToRemove(new Set(result.excess.map((e) => e.orderId)))
                }
              >
                Zaznacz wszystkie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedToRemove(new Set())}
              >
                Odznacz wszystkie
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {result.excess.map((item) => (
                  <div
                    key={item.orderId}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedToRemove.has(item.orderId)}
                      onCheckedChange={() => toggleRemove(item.orderId)}
                    />
                    <span className="font-mono font-medium">{item.orderNumber}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.client}
                      {item.project && ` - ${item.project}`}
                    </span>
                    <Badge variant="destructive" className="ml-auto">
                      <Minus className="h-3 w-3 mr-1" />
                      Usuń
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Nieznane w systemie */}
      {result.notFound.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Nieznane w systemie ({result.notFound.length})
              <span className="text-sm font-normal text-muted-foreground">
                - nie istnieją w bazie - zaimportuj najpierw
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {result.notFound.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-3 p-2 rounded bg-red-50"
                  >
                    <span className="font-mono font-medium">
                      {toRoman(item.position)}. {item.orderNumberInput}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      Brak w systemie
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Duplikaty na liście */}
      {result.duplicates.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              Duplikaty na liście ({result.duplicates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {result.duplicates.map((dup, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="font-mono font-medium">{dup.orderNumber}</span>
                  <span className="text-muted-foreground">
                    na pozycjach: {dup.positions.map(toRoman).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Przyciski akcji */}
      <div className="flex flex-col sm:flex-row gap-3">
        {result.missing.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              onApplyChanges({ addMissing: Array.from(selectedToAdd) })
            }
            disabled={selectedToAdd.size === 0 || isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zaznaczone ({selectedToAdd.size})
          </Button>
        )}

        {result.excess.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              onApplyChanges({ removeExcess: Array.from(selectedToRemove) })
            }
            disabled={selectedToRemove.size === 0 || isPending}
          >
            <Minus className="h-4 w-4 mr-2" />
            Usuń zaznaczone ({selectedToRemove.size})
          </Button>
        )}

        {hasChanges && (
          <Button onClick={handleApply} disabled={isPending} className="ml-auto">
            {isPending ? 'Aplikowanie...' : 'Zastosuj wszystkie zmiany'}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Konwersja liczby na cyfrę rzymską
 */
function toRoman(num: number): string {
  if (num <= 0 || num > 100) return num.toString();

  const romanNumerals: [number, string][] = [
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

export default VerificationResults;

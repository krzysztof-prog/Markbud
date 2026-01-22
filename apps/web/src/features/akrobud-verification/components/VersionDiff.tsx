'use client';

/**
 * VersionDiff - Wyświetla różnice między dwoma wersjami listy weryfikacyjnej
 */

import React, { useState } from 'react';
import { Plus, Minus, Equal, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface VersionDiffProps {
  diff: {
    oldVersion: number;
    newVersion: number;
    addedProjects: string[];
    removedProjects: string[];
    unchangedProjects: string[];
    summary: {
      added: number;
      removed: number;
      unchanged: number;
    };
  };
  onClose?: () => void;
}

export const VersionDiff: React.FC<VersionDiffProps> = ({ diff, onClose }) => {
  const [unchangedOpen, setUnchangedOpen] = useState(false);

  const { oldVersion, newVersion, addedProjects, removedProjects, unchangedProjects, summary } =
    diff;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Porównanie wersji {oldVersion} → {newVersion}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
              <span className="sr-only">Zamknij</span>
            </Button>
          )}
        </div>

        {/* Podsumowanie liczbowe */}
        <div className="flex flex-wrap gap-3 mt-3">
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200 px-3 py-1"
          >
            <Plus className="h-3 w-3 mr-1" />+{summary.added} dodane
          </Badge>
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-200 px-3 py-1"
          >
            <Minus className="h-3 w-3 mr-1" />-{summary.removed} usunięte
          </Badge>
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-600 border-gray-200 px-3 py-1"
          >
            <Equal className="h-3 w-3 mr-1" />
            {summary.unchanged} bez zmian
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dodane projekty */}
        {addedProjects.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-800">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Dodane projekty ({addedProjects.length})</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {addedProjects.map((project) => (
                  <Badge
                    key={project}
                    variant="outline"
                    className="bg-green-100 text-green-800 border-green-300"
                  >
                    {project}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Usunięte projekty */}
        {removedProjects.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-800">
              <Minus className="h-4 w-4" />
              <span className="font-medium">Usunięte projekty ({removedProjects.length})</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {removedProjects.map((project) => (
                  <Badge
                    key={project}
                    variant="outline"
                    className="bg-red-100 text-red-800 border-red-300"
                  >
                    {project}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bez zmian - collapsible */}
        {unchangedProjects.length > 0 && (
          <Collapsible open={unchangedOpen} onOpenChange={setUnchangedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors w-full text-left"
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    unchangedOpen && 'rotate-90'
                  )}
                />
                <Equal className="h-4 w-4" />
                <span className="font-medium">Bez zmian ({unchangedProjects.length})</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <div className="flex flex-wrap gap-2">
                  {unchangedProjects.map((project) => (
                    <Badge
                      key={project}
                      variant="outline"
                      className="bg-gray-100 text-gray-600 border-gray-300"
                    >
                      {project}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Brak zmian - komunikat */}
        {addedProjects.length === 0 &&
          removedProjects.length === 0 &&
          unchangedProjects.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Brak danych do porównania
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default VersionDiff;

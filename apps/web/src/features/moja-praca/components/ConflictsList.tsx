'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConflicts } from '../api/mojaPracaApi';
import type { ImportConflict } from '../types';

interface ConflictsListProps {
  onSelectConflict: (conflict: ImportConflict) => void;
  status?: 'pending' | 'resolved' | 'all';
}

export const ConflictsList: React.FC<ConflictsListProps> = ({
  onSelectConflict,
  status = 'pending',
}) => {
  const { data: conflicts, isLoading, error } = useConflicts(status);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        Błąd ładowania konfliktów: {error.message}
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
        <p className="text-lg font-medium">Brak konfliktów do rozwiązania</p>
        <p className="text-sm">Wszystkie importy zostały przetworzone automatycznie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <ConflictCard
          key={conflict.id}
          conflict={conflict}
          onClick={() => onSelectConflict(conflict)}
        />
      ))}
    </div>
  );
};

interface ConflictCardProps {
  conflict: ImportConflict;
  onClick: () => void;
}

const ConflictCard: React.FC<ConflictCardProps> = ({ conflict, onClick }) => {
  const getSuggestionBadge = () => {
    switch (conflict.systemSuggestion) {
      case 'replace_base':
        return <Badge variant="default" className="bg-blue-500">Sugestia: Zastąp bazowe</Badge>;
      case 'keep_both':
        return <Badge variant="secondary">Sugestia: Zachowaj oba</Badge>;
      default:
        return <Badge variant="outline">Wymaga decyzji</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (conflict.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <span className="font-semibold text-lg">{conflict.orderNumber}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-muted-foreground">{conflict.baseOrderNumber}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {getSuggestionBadge()}
              {conflict.documentAuthor && (
                <Badge variant="outline">{conflict.documentAuthor}</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="mr-4">
                Istniejące: {conflict.existingWindowsCount ?? '?'} okien, {conflict.existingGlassCount ?? '?'} szyb
              </span>
              <span>
                Nowe: {conflict.newWindowsCount ?? '?'} okien, {conflict.newGlassCount ?? '?'} szyb
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              Plik: {conflict.filename}
            </div>
          </div>

          <Button variant="outline" size="sm">
            Rozwiąż
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConflictsList;

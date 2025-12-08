'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface UploadStatusProps {
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  progress: number;
}

export function UploadStatus({ isPending, isError, errorMessage, progress }: UploadStatusProps) {
  if (!isPending && !isError) return null;

  if (isPending) {
    return (
      <Card className="border-blue-300 bg-blue-50">
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-700 font-medium">
                  Przesylanie pliku...
                </p>
              </div>
              <span className="text-sm font-semibold text-blue-700">
                {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="py-4">
          <p className="text-sm text-red-700">
            Blad podczas przesylania: {errorMessage || 'Nieznany blad'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}

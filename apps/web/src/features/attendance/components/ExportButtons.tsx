'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { attendanceApi } from '../api/attendanceApi';

interface ExportButtonsProps {
  year: number;
  month: number;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ year, month }) => {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { toast } = useToast();

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await attendanceApi.exportAttendance(year, month, 'xlsx');
      toast({
        title: 'Eksport zakończony',
        description: 'Plik Excel został pobrany.',
      });
    } catch {
      toast({
        title: 'Błąd eksportu',
        description: 'Nie udało się wyeksportować danych do Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await attendanceApi.exportAttendance(year, month, 'pdf');
      toast({
        title: 'Eksport zakończony',
        description: 'Plik PDF został pobrany.',
      });
    } catch {
      toast({
        title: 'Błąd eksportu',
        description: 'Nie udało się wyeksportować danych do PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={isExportingExcel || isExportingPdf}
      >
        {isExportingExcel ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 mr-2" />
        )}
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPdf}
        disabled={isExportingExcel || isExportingPdf}
      >
        {isExportingPdf ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        PDF
      </Button>
    </div>
  );
};

export default ExportButtons;

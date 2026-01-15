'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, User, Link as LinkIcon, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BugReportsResponse {
  success: boolean;
  content: string;
}

interface ParsedBugReport {
  id: number;
  timestamp: string;
  user: string;
  url: string;
  userAgent: string;
  description: string;
  hasScreenshot: boolean;
}

/**
 * Parsuj zawartość pliku bug-reports.log
 */
function parseBugReports(content: string): ParsedBugReport[] {
  const reports: ParsedBugReport[] = [];

  // Debug: sprawdź czy content jest pusty
  console.log('[BugReports] Content length:', content?.length, 'First 100 chars:', content?.substring(0, 100));

  if (!content || content === 'Brak zgłoszeń.') {
    return [];
  }

  // Rozdziel po separatorze (linia z kreskami)
  const entries = content.split(/━+/);

  console.log('[BugReports] Found entries:', entries.length);

  let id = 0;

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed || !trimmed.includes('ZGŁOSZENIE BŁĘDU')) {
      continue;
    }

    id++;

    // Parsuj dane z entry - bardziej elastyczne regexy
    const timestampMatch = entry.match(/Data:\s*(.+)/);
    const userMatch = entry.match(/Użytkownik:\s*(.+)/);
    const urlMatch = entry.match(/URL:\s*(.+)/);
    const userAgentMatch = entry.match(/UserAgent:\s*(.+)/);
    // Bardziej elastyczny regex dla opisu - akceptuje różne formaty
    const descriptionMatch = entry.match(/Opis:\s*\n?([\s\S]+?)(?:\n\s*Screenshot:|$)/);
    const screenshotMatch = entry.match(/Screenshot:\s*(.+)/);

    console.log('[BugReports] Entry', id, '- timestamp:', !!timestampMatch, 'user:', !!userMatch, 'url:', !!urlMatch, 'desc:', !!descriptionMatch);

    if (!timestampMatch || !userMatch || !urlMatch) {
      console.log('[BugReports] Skipping entry - missing required fields');
      continue;
    }

    reports.push({
      id,
      timestamp: timestampMatch[1].trim(),
      user: userMatch[1].trim(),
      url: urlMatch[1].trim(),
      userAgent: userAgentMatch ? userAgentMatch[1].trim() : 'Nieznany',
      description: descriptionMatch ? descriptionMatch[1].trim() : '(brak opisu)',
      hasScreenshot: screenshotMatch ? screenshotMatch[1].includes('TAK') : false,
    });
  }

  console.log('[BugReports] Parsed reports:', reports.length);

  // Odwróć kolejność (najnowsze na górze)
  return reports.reverse();
}

export function BugReportsList() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<BugReportsResponse>({
    queryKey: ['bug-reports'],
    queryFn: () => fetchApi<BugReportsResponse>('/api/bug-reports'),
    refetchInterval: 60000, // Odświeżaj co 60s
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : 'Nie udało się pobrać zgłoszeń'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  // DEBUG: Sprawdź co zwraca API
  console.log('[BugReportsList] API response:', data);
  console.log('[BugReportsList] content type:', typeof data.content);
  console.log('[BugReportsList] content preview:', data.content?.substring(0, 200));

  const reports = parseBugReports(data.content);

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Brak zgłoszeń</p>
          <p className="text-gray-500 text-sm mt-1">
            Użytkownicy nie zgłosili jeszcze żadnych problemów
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header z przyciskiem odświeżania */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Znaleziono <strong>{reports.length}</strong> zgłoszeń
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {/* Lista zgłoszeń */}
      <div className="space-y-4">
        {reports.map((report) => (
          <BugReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}

interface BugReportCardProps {
  report: ParsedBugReport;
}

function BugReportCard({ report }: BugReportCardProps) {
  const [_expanded, _setExpanded] = React.useState(false);

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Zgłoszenie #{report.id}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(report.timestamp).toLocaleString('pl-PL')}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {report.user}
              </div>
              {report.hasScreenshot && (
                <Badge variant="secondary" className="text-xs">
                  📸 Screenshot
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* URL */}
        <div className="flex items-start gap-2 text-sm">
          <LinkIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <a
            href={report.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {report.url}
          </a>
        </div>

        {/* Opis */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Opis problemu:</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {report.description}
          </p>
        </div>

        {/* User Agent (opcjonalnie rozwinięty) */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Szczegóły techniczne
          </summary>
          <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs break-all">
            {report.userAgent}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export default BugReportsList;

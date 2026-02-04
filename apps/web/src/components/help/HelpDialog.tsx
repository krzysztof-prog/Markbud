'use client';

/**
 * HelpDialog - Modal z instrukcją obsługi
 *
 * Zawiera 4 zakładki:
 * - Przegląd - co za co odpowiada
 * - Jak to zrobić - instrukcje krok po kroku
 * - Skutki - co się zmieni po akcji
 * - FAQ - najczęściej zadawane pytania
 */

import { useState } from 'react';
import { Download, Book, HelpCircle, AlertCircle, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { helpApi } from '@/features/help/api/helpApi';
import type { HelpContent, HelpSection } from '@/features/help/types';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: HelpContent;
}

function HelpSectionComponent({ section }: { section: HelpSection }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-base mb-2 text-gray-900">{section.title}</h3>
      <div className="text-sm text-gray-600 prose prose-sm max-w-none">
        {section.content}
      </div>
    </div>
  );
}

export default function HelpDialog({ open, onOpenChange, content }: HelpDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await helpApi.downloadPdf(content.pageId);
      toast({
        title: 'Sukces',
        description: 'PDF został pobrany',
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać PDF. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Book className="h-5 w-5 text-blue-600" />
            {content.pageTitle}
          </DialogTitle>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <HelpCircle className="h-4 w-4 mr-1 hidden sm:inline" />
              Przegląd
            </TabsTrigger>
            <TabsTrigger value="howto" className="text-xs sm:text-sm">
              <Book className="h-4 w-4 mr-1 hidden sm:inline" />
              Jak to zrobić
            </TabsTrigger>
            <TabsTrigger value="consequences" className="text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 mr-1 hidden sm:inline" />
              Skutki
            </TabsTrigger>
            <TabsTrigger value="faq" className="text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />
              FAQ
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              {content.sections.overview.length > 0 ? (
                content.sections.overview.map((section) => (
                  <HelpSectionComponent key={section.id} section={section} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Brak treści w tej sekcji</p>
              )}
            </TabsContent>

            <TabsContent value="howto" className="mt-0 space-y-4">
              {content.sections.howTo.length > 0 ? (
                content.sections.howTo.map((section) => (
                  <HelpSectionComponent key={section.id} section={section} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Brak treści w tej sekcji</p>
              )}
            </TabsContent>

            <TabsContent value="consequences" className="mt-0 space-y-4">
              {content.sections.consequences.length > 0 ? (
                content.sections.consequences.map((section) => (
                  <HelpSectionComponent key={section.id} section={section} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Brak treści w tej sekcji</p>
              )}
            </TabsContent>

            <TabsContent value="faq" className="mt-0 space-y-4">
              {content.sections.faq.length > 0 ? (
                content.sections.faq.map((section) => (
                  <HelpSectionComponent key={section.id} section={section} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">Brak treści w tej sekcji</p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Pobieranie...' : 'Pobierz PDF'}
          </Button>

          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

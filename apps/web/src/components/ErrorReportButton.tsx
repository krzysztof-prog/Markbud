"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { fetchApi } from "@/lib/api-client";

export function ErrorReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description || description.length < 10) {
      toast({
        title: "Błąd",
        description: "Opis musi mieć minimum 10 znaków",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Zbierz kontekst
      const context = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        description,
      };

      await fetchApi("/api/bug-reports", {
        method: "POST",
        body: JSON.stringify(context),
      });

      toast({
        title: "Sukces",
        description: "Zgłoszenie wysłane. Dziękujemy!",
      });
      setOpen(false);
      setDescription("");
    } catch (error: unknown) {
      console.error("Failed to submit bug report:", error);
      const errorMessage = error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia";
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="shadow-lg border-2 hover:border-red-500 hover:bg-red-50"
        title="Zgłoś problem"
      >
        🐛 Zgłoś problem
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Zgłoś problem</DialogTitle>
            <DialogDescription>
              Opisz problem, który napotkałeś. Twoje zgłoszenie pomoże nam
              poprawić aplikację.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Co się stało? <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="Przykład: Kliknąłem 'Zapisz' przy edycji zlecenia i aplikacja się zawiesza..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="mt-2"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 znaków (aktualnie: {description.length})
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || description.length < 10}
              >
                {isSubmitting ? "Wysyłanie..." : "Wyślij zgłoszenie"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

// Wymuszenie dynamicznego renderowania - strona używa AuthContext
export const dynamic = 'force-dynamic';

/**
 * Admin Dashboard
 * Główna strona panelu administracyjnego
 * Pokazuje szybkie linki do zarządzania systemem
 */

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, FileText } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Panel Administracyjny" alertsCount={0} />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Witaj w panelu administracyjnym</CardTitle>
              <CardDescription>
                Zarządzaj użytkownikami, ustawieniami i konfiguracją systemu
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Użytkownicy</p>
                      <p className="text-sm text-muted-foreground">
                        Zarządzaj kontami użytkowników
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/settings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <Settings className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Ustawienia</p>
                      <p className="text-sm text-muted-foreground">
                        Konfiguracja systemu
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/document-authors">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Dokumenty autorów</p>
                      <p className="text-sm text-muted-foreground">
                        Mapowanie autorów dokumentów
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

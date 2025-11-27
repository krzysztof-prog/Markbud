'use client';

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProfileDeliveryTable } from '@/components/profile-delivery-table/ProfileDeliveryTable';

export default function ProfileNaDostawyPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Profile na dostawy">
        <Link href="/magazyn">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do menu
          </Button>
        </Link>
      </Header>

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <ProfileDeliveryTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

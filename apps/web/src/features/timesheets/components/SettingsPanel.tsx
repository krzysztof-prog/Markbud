'use client';

import React, { useState } from 'react';
import { Settings, Users, Briefcase, Clock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkersManagement } from './WorkersManagement';
import { PositionsManagement } from './PositionsManagement';
import { TaskTypesManagement } from './TaskTypesManagement';
import { SpecialWorkTypesManagement } from './SpecialWorkTypesManagement';

interface SettingsPanelProps {
  trigger?: React.ReactNode;
}

/**
 * Panel ustawień modułu godzinówek
 * Zarządzanie: Pracownicy, Stanowiska, Typy zadań nieprodukcyjnych, Nietypówki
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workers');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1">
            <Settings className="h-4 w-4" />
            Ustawienia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ustawienia godzinówek
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pracownicy
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Stanowiska
            </TabsTrigger>
            <TabsTrigger value="taskTypes" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Nieprodukcja
            </TabsTrigger>
            <TabsTrigger value="specialTypes" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Nietypówki
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="workers" className="m-0 h-full">
              <WorkersManagement />
            </TabsContent>
            <TabsContent value="positions" className="m-0 h-full">
              <PositionsManagement />
            </TabsContent>
            <TabsContent value="taskTypes" className="m-0 h-full">
              <TaskTypesManagement />
            </TabsContent>
            <TabsContent value="specialTypes" className="m-0 h-full">
              <SpecialWorkTypesManagement />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsPanel;

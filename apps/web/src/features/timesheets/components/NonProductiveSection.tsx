'use client';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTaskTypes } from '../hooks/useTimesheets';
import type { NonProductiveTaskInput } from '../types';
import { roundToHalfHour, formatHours } from '../helpers/dateHelpers';

interface NonProductiveSectionProps {
  tasks: NonProductiveTaskInput[];
  onChange: (tasks: NonProductiveTaskInput[]) => void;
}

export const NonProductiveSection: React.FC<NonProductiveSectionProps> = ({
  tasks,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(tasks.length > 0);

  // Pobieranie typów zadań
  const { data: taskTypes = [] } = useTaskTypes(true);

  // Suma godzin nieprodukcyjnych
  const totalHours = useMemo(
    () => tasks.reduce((sum, t) => sum + t.hours, 0),
    [tasks]
  );

  // Automatycznie otwórz gdy są zadania
  useEffect(() => {
    if (tasks.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [tasks.length, isOpen]);

  // Dodaj nowe zadanie
  const handleAddTask = useCallback(() => {
    const defaultType = taskTypes[0];
    if (!defaultType) return;

    onChange([
      ...tasks,
      {
        taskTypeId: defaultType.id,
        hours: 1,
        notes: null,
      },
    ]);
    // Otwórz sekcję gdy dodajemy zadanie
    setIsOpen(true);
  }, [tasks, taskTypes, onChange]);

  // Usuń zadanie
  const handleRemoveTask = useCallback(
    (index: number) => {
      onChange(tasks.filter((_, i) => i !== index));
    },
    [tasks, onChange]
  );

  // Zmień typ zadania
  const handleTypeChange = useCallback(
    (index: number, taskTypeId: number) => {
      const newTasks = [...tasks];
      newTasks[index] = { ...newTasks[index], taskTypeId };
      onChange(newTasks);
    },
    [tasks, onChange]
  );

  // Zmień godziny
  const handleHoursChange = useCallback(
    (index: number, value: string) => {
      const hours = parseFloat(value) || 0;
      const newTasks = [...tasks];
      newTasks[index] = {
        ...newTasks[index],
        hours: roundToHalfHour(Math.max(0, Math.min(24, hours))),
      };
      onChange(newTasks);
    },
    [tasks, onChange]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      {/* Nagłówek z triggerem */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Godziny nieprodukcyjne</span>
            {totalHours > 0 && (
              <Badge variant="secondary" className="ml-1 text-orange-600">
                {formatHours(totalHours)}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddTask}
          disabled={taskTypes.length === 0}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Dodaj
        </Button>
      </div>

      {/* Zawartość zwijana */}
      <CollapsibleContent className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Brak zadań nieprodukcyjnych
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                {/* Typ zadania */}
                <Select
                  value={task.taskTypeId.toString()}
                  onValueChange={(val) => handleTypeChange(index, parseInt(val))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Godziny */}
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={task.hours}
                  onChange={(e) => handleHoursChange(index, e.target.value)}
                  className="w-20"
                />

                {/* Usuń */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTask(index)}
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

      </CollapsibleContent>
    </Collapsible>
  );
};

export default NonProductiveSection;

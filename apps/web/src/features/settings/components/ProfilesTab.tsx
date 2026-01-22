'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Profile {
  id: number;
  number: string;
  name: string;
  description?: string | null;
  articleNumber?: string | null;
  isAkrobud?: boolean;
  isLiving?: boolean;
  isBlok?: boolean;
  isVlak?: boolean;
  isCt70?: boolean;
  isFocusing?: boolean;
}

interface ProfilesTabProps {
  profiles: Profile[] | undefined;
  onAdd: () => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onToggleAkrobud?: (profile: Profile, isAkrobud: boolean) => void;
  onUpdateProfile?: (profile: Profile, data: Partial<Profile>) => void;
}

// Inline editable cell component
function EditableCell({
  value,
  onSave,
  placeholder = '-',
}: {
  value: string | null | undefined;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed !== (value || '')) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-sm py-0 px-2"
        />
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-slate-100 px-2 py-1 rounded -mx-2 -my-1 min-h-[28px] flex items-center"
      onClick={() => {
        setEditValue(value || '');
        setIsEditing(true);
      }}
      title="Kliknij aby edytować"
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </div>
  );
}

export function ProfilesTab({ profiles, onAdd, onEdit, onDelete, onToggleAkrobud, onUpdateProfile }: ProfilesTabProps) {
  // Handler do aktualizacji pól tekstowych
  const handleFieldUpdate = (profile: Profile, field: keyof Profile, value: string) => {
    if (onUpdateProfile) {
      onUpdateProfile(profile, { [field]: value || null });
    }
  };

  // Handler do aktualizacji checkboxów systemów
  const handleSystemToggle = (profile: Profile, field: keyof Profile, checked: boolean) => {
    console.log('handleSystemToggle called:', { profileId: profile.id, field, checked, hasHandler: !!onUpdateProfile });
    if (onUpdateProfile) {
      onUpdateProfile(profile, { [field]: checked });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Profile PVC</CardTitle>
          <CardDescription>Lista wszystkich profili</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Dodaj profil
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Numer</th>
                <th className="px-4 py-3 text-left">Nazwa</th>
                <th className="px-4 py-3 text-left">Opis</th>
                <th className="px-2 py-3 text-center" title="Living">Living</th>
                <th className="px-2 py-3 text-center" title="BLOK">BLOK</th>
                <th className="px-2 py-3 text-center" title="VLAK">VLAK</th>
                <th className="px-2 py-3 text-center" title="CT70">CT70</th>
                <th className="px-2 py-3 text-center" title="FOCUSING">FOCUS</th>
                <th className="px-2 py-3 text-center" title="Akrobud">Akro</th>
                <th className="px-4 py-3 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((profile, index: number) => (
                <tr
                  key={profile.id}
                  className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                >
                  <td className="px-4 py-3 font-mono font-medium">{profile.number}</td>
                  <td className="px-4 py-3">
                    <EditableCell
                      value={profile.name}
                      onSave={(value) => handleFieldUpdate(profile, 'name', value)}
                      placeholder="(brak nazwy)"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <EditableCell
                      value={profile.description}
                      onSave={(value) => handleFieldUpdate(profile, 'description', value)}
                      placeholder="-"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Checkbox
                      checked={profile.isLiving ?? false}
                      onCheckedChange={(checked) => handleSystemToggle(profile, 'isLiving', checked === true)}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Checkbox
                      checked={profile.isBlok ?? false}
                      onCheckedChange={(checked) => handleSystemToggle(profile, 'isBlok', checked === true)}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Checkbox
                      checked={profile.isVlak ?? false}
                      onCheckedChange={(checked) => handleSystemToggle(profile, 'isVlak', checked === true)}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Checkbox
                      checked={profile.isCt70 ?? false}
                      onCheckedChange={(checked) => handleSystemToggle(profile, 'isCt70', checked === true)}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Checkbox
                      checked={profile.isFocusing ?? false}
                      onCheckedChange={(checked) => handleSystemToggle(profile, 'isFocusing', checked === true)}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <Checkbox
                      checked={profile.isAkrobud ?? false}
                      onCheckedChange={(checked) => {
                        if (onToggleAkrobud) {
                          onToggleAkrobud(profile, checked === true);
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(profile)}>
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(profile)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Brak profili
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

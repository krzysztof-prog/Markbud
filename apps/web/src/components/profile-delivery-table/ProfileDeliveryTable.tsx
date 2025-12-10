'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { deliveriesApi, profilesApi, colorsApi, ordersApi } from '@/lib/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Funkcja do obliczenia numeru tygodnia
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface DeliveryData {
  deliveryId: number;
  deliveryNumber: string; // "I", "II", etc.
  week: number;
  day: string;
  date: string;
  quantity: number;
}

interface ProfileRow {
  id: string;
  name: string;
  sortOrder: number; // Kolejność profilu
  magValue: number;
  deliveries: DeliveryData[];
  requirementTotal: number; // Całkowite zapotrzebowanie dla tego profilu w tej grupie kolorów
}

interface ColorGroup {
  id: string;
  name: string;
  profiles: ProfileRow[];
}

// Komponent wiersza z drag-and-drop
interface SortableRowProps {
  profile: ProfileRow;
  idx: number;
  colorGroupId: string;
  deliveries: DeliveryData[];
  sumColumns: number;
  getSumForColumns: (deliveries: DeliveryData[], columns: number) => number;
  handleMagValueChange: (colorId: string, profileId: string, value: string) => void;
  handleQuantityChange: (colorId: string, profileId: string, dateIndex: number, value: string) => void;
}

function SortableRow({
  profile,
  idx,
  colorGroupId,
  deliveries,
  sumColumns,
  getSumForColumns,
  handleMagValueChange,
  handleQuantityChange,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: profile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-100';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-200 transition-colors hover:bg-slate-100 ${rowBg}`}
    >
      <td className={`px-3 py-2.5 font-medium text-sm text-slate-900 border-r border-slate-200 sticky left-0 z-10 ${rowBg}`} style={{ width: '140px' }}>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 rounded"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-slate-400" />
          </button>
          <span>{profile.name}</span>
        </div>
      </td>
      <td className={`px-2 py-2 border-r border-slate-200 sticky left-[140px] z-10 ${rowBg}`} style={{ width: '100px' }}>
        <Input
          type="number"
          value={profile.magValue}
          onChange={(e) => handleMagValueChange(colorGroupId, profile.id, e.target.value)}
          className="text-center h-8 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          min="0"
        />
      </td>
      <td className={`px-3 py-2.5 text-center font-semibold text-sm text-slate-900 border-r border-slate-200 sticky left-[240px] z-10 ${rowBg}`} style={{ width: '100px' }}>
        {profile.deliveries.reduce((sum, d) => sum + d.quantity, 0)}
      </td>
      <td className={`px-3 py-2.5 text-center font-bold text-sm text-slate-900 border-r border-slate-200 sticky left-[340px] z-10 ${rowBg}`} style={{ width: '100px' }}>
        {getSumForColumns(profile.deliveries, sumColumns)}
      </td>
      {profile.deliveries.map((delivery, dateIdx) => (
        <td key={`${profile.id}-${delivery.deliveryId}`} className="px-2 py-2 border-r border-slate-200 relative" style={{ width: '100px', zIndex: 1 }}>
          <Input
            type="number"
            value={delivery.quantity}
            onChange={(e) => handleQuantityChange(colorGroupId, profile.id, dateIdx, e.target.value)}
            className="text-center h-8 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            min="0"
          />
        </td>
      ))}
    </tr>
  );
}

export function ProfileDeliveryTable() {
  // Wczytaj domyślną liczbę kolumn z localStorage (tylko po stronie klienta)
  const [sumColumns, setSumColumns] = useState(() => {
    if (typeof window === 'undefined') return 3;
    const saved = localStorage.getItem('profileDeliveryTable.sumColumns');
    return saved ? parseInt(saved) : 3;
  });

  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Zapisz liczbę kolumn do localStorage przy każdej zmianie (tylko po stronie klienta)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('profileDeliveryTable.sumColumns', sumColumns.toString());
    }
  }, [sumColumns]);

  // Sensory dla drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Pobierz wszystkie dostawy do danych o datach
  const { data: deliveriesData } = useQuery({
    queryKey: ['all-deliveries', 'v3'],
    queryFn: () => deliveriesApi.getAll(),
  });

  // Typy dla danych z API
  type ProfileRequirement = { deliveryId: number; deliveryDate: string; profileId: number; colorCode: string; totalBeams: number };
  type RequirementTotal = { profileId: number; total: number };
  type ProfileData = { id: number; number?: string; name: string; sortOrder?: number; articleNumber?: string };
  type ColorData = { id: number; code: string; name: string };
  type DeliveryBasic = { id: number; deliveryDate: string; deliveryNumber?: string | null };

  // Pobierz profile requirements z dostaw
  const { data: deliveryProfileReqs } = useQuery<ProfileRequirement[]>({
    queryKey: ['delivery-profile-requirements', 'v7', startDate],
    queryFn: () => deliveriesApi.getProfileRequirements({ from: startDate }),
    enabled: !!startDate, // Only run query when startDate exists
  });

  // Pobierz wszystkie profile
  const { data: allProfiles, isLoading: profilesLoading } = useQuery<ProfileData[]>({
    queryKey: ['all-profiles', 'v2'],
    queryFn: () => profilesApi.getAll(),
  });

  // Pobierz wszystkie kolory
  const { data: allColors, isLoading: colorsLoading } = useQuery<ColorData[]>({
    queryKey: ['all-colors', 'v2'],
    queryFn: () => colorsApi.getAll(),
  });

  // Pobierz sumy zapotrzebowań z zlecen
  const { data: requirementsTotals } = useQuery<RequirementTotal[]>({
    queryKey: ['requirements-totals', 'v2'],
    queryFn: () => ordersApi.getRequirementsTotals(),
  });

  // Inicjalizuj dane gdy są dostępne
  useEffect(() => {
    if (allProfiles && allColors && deliveryProfileReqs) {
      // Stwórz mapę kolorów po kodzie
      const colorsByCode = new Map<string, ColorData>();
      allColors.forEach((color) => {
        colorsByCode.set(color.code, color);
      });

      // Stwórz mapę dostaw (każda dostawa to osobna kolumna, nawet jeśli tego samego dnia)
      const deliveryMap = new Map<number, DeliveryData>();

      if (deliveriesData && Array.isArray(deliveriesData)) {
        deliveriesData.forEach((delivery: DeliveryBasic) => {
          const deliveryDate = new Date(delivery.deliveryDate);

          // Filtruj po dacie jeśli ustawiono startDate
          if (startDate && deliveryDate < new Date(startDate)) {
            return;
          }

          const dateStr = deliveryDate.toLocaleDateString('pl-PL', {
            month: '2-digit',
            day: '2-digit',
          });
          const dayName = deliveryDate.toLocaleDateString('pl-PL', { weekday: 'short' }).slice(0, 4) + '.';
          const weekNum = getWeekNumber(deliveryDate);

          deliveryMap.set(delivery.id, {
            deliveryId: delivery.id,
            deliveryNumber: delivery.deliveryNumber || '',
            week: weekNum,
            day: dayName,
            date: dateStr,
            quantity: 0,
          });
        });
      }

      // Stwórz mapę delivery requirements: `profileId-colorCode-deliveryId` -> totalBeams
      const deliveryReqMap = new Map<string, number>();
      if (deliveryProfileReqs && Array.isArray(deliveryProfileReqs)) {
        deliveryProfileReqs.forEach((req) => {
          const key = `${req.profileId}-${req.colorCode}-${req.deliveryId}`;
          deliveryReqMap.set(key, req.totalBeams);
        });
      }

      // Stwórz mapę zapotrzebowań z deliveryProfileReqs (profileId-colorCode -> totalBeams)
      const requirementsMap = new Map<string, number>();
      if (deliveryProfileReqs && Array.isArray(deliveryProfileReqs)) {
        deliveryProfileReqs.forEach((req) => {
          const key = `${req.profileId}-${req.colorCode}`;
          const currentTotal = requirementsMap.get(key) || 0;
          requirementsMap.set(key, currentTotal + req.totalBeams);
        });
      }

      // Pogrupuj profile po kodzie koloru
      const groupMap = new Map<string, { colorName: string; profiles: ProfileRow[] }>();

      // Najpierw dodaj profile z zapotrzebowaniem z deliveryProfileReqs
      if (deliveryProfileReqs && Array.isArray(deliveryProfileReqs)) {
        // Grupuj zapotrzebowania po profileId-colorCode
        const groupedReqs = new Map<string, ProfileRequirement>();
        deliveryProfileReqs.forEach((req) => {
          const key = `${req.profileId}-${req.colorCode}`;
          if (!groupedReqs.has(key)) {
            groupedReqs.set(key, req);
          }
        });

        // Dodaj profile do grupy
        groupedReqs.forEach((req) => {
          const profile = allProfiles.find((p) => p.id === req.profileId);
          if (!profile) return;

          const colorCode = req.colorCode;
          const color = colorsByCode.get(colorCode);
          const colorName = color?.name || colorCode;

          if (!groupMap.has(colorCode)) {
            groupMap.set(colorCode, {
              colorName: colorName,
              profiles: [],
            });
          }

          // Sprawdź czy profil już nie został dodany do tej grupy
          const profileRow = groupMap.get(colorCode)!.profiles.find((p) => p.id === profile.id.toString());
          if (!profileRow) {
            const reqKey = `${profile.id}-${colorCode}`;
            groupMap.get(colorCode)!.profiles.push({
              id: profile.id.toString(),
              name: profile.number || profile.name,
              sortOrder: profile.sortOrder || 0,
              magValue: 0,
              requirementTotal: requirementsMap.get(reqKey) || 0,
              deliveries: Array.from(deliveryMap.values()).map(d => {
                const key = `${profile.id}-${colorCode}-${d.deliveryId}`;
                return {
                  ...d,
                  quantity: deliveryReqMap.get(key) || 0,
                };
              }),
            });
          }
        });
      }

      // Następnie dodaj profile bez zapotrzebowania (jeśli mają articleNumber)
      allProfiles.forEach((profile) => {
        const articleNumber = profile.articleNumber;
        if (!articleNumber) return;

        const colorCode = articleNumber.slice(-3);
        const color = colorsByCode.get(colorCode);
        const colorName = color?.name || colorCode;

        if (!groupMap.has(colorCode)) {
          groupMap.set(colorCode, {
            colorName: colorName,
            profiles: [],
          });
        }

        // Sprawdź czy profil już został dodany
        const profileRow = groupMap.get(colorCode)!.profiles.find((p) => p.id === profile.id.toString());
        if (!profileRow) {
          groupMap.get(colorCode)!.profiles.push({
            id: profile.id.toString(),
            name: profile.number || profile.name,
            sortOrder: profile.sortOrder || 0,
            magValue: 0,
            requirementTotal: 0,
            deliveries: Array.from(deliveryMap.values()).map(d => {
              const key = `${profile.id}-${colorCode}-${d.deliveryId}`;
              return {
                ...d,
                quantity: deliveryReqMap.get(key) || 0,
              };
            }),
          });
        }
      });

      // Konwertuj mapę na tablicę ColorGroup
      const groups: ColorGroup[] = Array.from(groupMap.entries())
        .map(([colorCode, { colorName, profiles }]) => ({
          id: colorCode,
          name: colorName,
          profiles: profiles.sort((a, b) => {
            // Sortuj po sortOrder (zapisanym w bazie)
            return a.sortOrder - b.sortOrder;
          }),
        }))
        .sort((a, b) => {
          return parseInt(a.id) - parseInt(b.id);
        });

      setColorGroups(groups);
    }
  }, [allProfiles, allColors, requirementsTotals, startDate, deliveriesData, deliveryProfileReqs]);

  const getSumForColumns = (deliveries: DeliveryData[], columns: number) => {
    return deliveries.slice(0, columns).reduce((sum, d) => sum + d.quantity, 0);
  };

  const getAllDeliveries = useMemo(() => {
    // Pobierz wszystkie dostawy z pierwszego profilu pierwszej grupy (wszystkie profile mają te same dostawy)
    if (colorGroups.length === 0 || colorGroups[0].profiles.length === 0) {
      return [];
    }
    return colorGroups[0].profiles[0].deliveries;
  }, [colorGroups]);

  const handleQuantityChange = useCallback((colorId: string, profileId: string, dateIndex: number, value: string) => {
    setColorGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === colorId) {
          return {
            ...group,
            profiles: group.profiles.map((profile) => {
              if (profile.id === profileId) {
                const newDeliveries = [...profile.deliveries];
                if (newDeliveries[dateIndex]) {
                  newDeliveries[dateIndex].quantity = parseInt(value) || 0;
                }
                return { ...profile, deliveries: newDeliveries, requirementTotal: profile.requirementTotal };
              }
              return profile;
            }),
          };
        }
        return group;
      })
    );
  }, []);

  const handleMagValueChange = useCallback((colorId: string, profileId: string, value: string) => {
    setColorGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === colorId) {
          return {
            ...group,
            profiles: group.profiles.map((profile) => {
              if (profile.id === profileId) {
                return { ...profile, magValue: parseInt(value) || 0, requirementTotal: profile.requirementTotal };
              }
              return profile;
            }),
          };
        }
        return group;
      })
    );
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent, colorId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setColorGroups((prevGroups) => {
      // Znajdź grupę, która została zmieniona
      const changedGroup = prevGroups.find((g) => g.id === colorId);
      if (!changedGroup) return prevGroups;

      const oldIndex = changedGroup.profiles.findIndex((p) => p.id === active.id);
      const newIndex = changedGroup.profiles.findIndex((p) => p.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return prevGroups;

      // Oblicz nową kolejność profili dla tej grupy
      const reorderedProfiles = arrayMove(changedGroup.profiles, oldIndex, newIndex);

      // Stwórz mapę: profileId -> nowy sortOrder
      const newOrderMap = new Map<string, number>();
      reorderedProfiles.forEach((profile, index) => {
        newOrderMap.set(profile.id, index);
      });

      // Zastosuj tę samą kolejność do WSZYSTKICH grup kolorów
      const newGroups = prevGroups.map((group) => {
        // Zaktualizuj sortOrder dla każdego profilu w tej grupie
        const updatedProfiles = group.profiles.map((profile) => {
          const newSortOrder = newOrderMap.get(profile.id);
          if (newSortOrder !== undefined) {
            return { ...profile, sortOrder: newSortOrder };
          }
          return profile;
        });

        // Posortuj profile według nowego sortOrder
        const sortedProfiles = [...updatedProfiles].sort((a, b) => a.sortOrder - b.sortOrder);

        return { ...group, profiles: sortedProfiles };
      });

      // Zbierz wszystkie unikalne profile i zapisz ich nową kolejność do backendu
      const profileOrders = Array.from(newOrderMap.entries()).map(([id, sortOrder]) => ({
        id: parseInt(id),
        sortOrder,
      }));

      // Zapisz do backendu
      profilesApi.updateOrders(profileOrders).catch((error) => {
        console.error('Failed to update profile order:', error);
      });

      return newGroups;
    });
  }, []);

  const deliveries = getAllDeliveries; // Już posortowane według kolejności z bazy

  if (profilesLoading || colorsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (colorGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Brak dostaw lub profili do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium">Od daty:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </label>
      </div>

      <div className="space-y-6">
        {colorGroups.map((colorGroup) => (
          <div key={colorGroup.id} className="border border-slate-300 rounded-lg overflow-hidden shadow-sm">
            {/* Nagłówek grupy kolorów */}
            <div className="bg-slate-100 px-4 py-3 font-semibold text-sm border-b border-slate-300">
              {colorGroup.name}
            </div>

            {colorGroup.profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="bg-white" style={{ tableLayout: 'fixed', width: `${440 + deliveries.length * 100}px` }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300">
                      <th className="px-3 py-2 text-left font-semibold text-xs text-slate-700 border-r border-slate-200 sticky left-0 bg-slate-50 z-20" style={{ width: '140px' }}></th>
                      <th className="px-3 py-2 text-center font-semibold text-xs text-slate-700 border-r border-slate-200 sticky left-[140px] bg-slate-50 z-20" style={{ width: '100px' }}></th>
                      <th className="px-3 py-2 text-center font-semibold text-xs text-slate-700 border-r border-slate-200 sticky left-[240px] bg-slate-50 z-20" style={{ width: '100px' }}></th>
                      <th className="px-2 py-2 text-center border-r border-slate-200 sticky left-[340px] bg-slate-50 z-20" style={{ width: '100px' }}>
                        <Input
                          type="number"
                          min="1"
                          value={sumColumns}
                          onChange={(e) => setSumColumns(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 h-7 text-center text-sm font-semibold border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500"
                        />
                      </th>
                      {deliveries.map((delivery) => (
                        <th key={`header-date-${delivery.deliveryId}`} className="px-2 py-2 text-center font-semibold text-xs text-slate-700 border-r border-slate-200 whitespace-nowrap relative" style={{ width: '100px', zIndex: 1 }}>
                          <div>{delivery.date}</div>
                          {delivery.deliveryNumber && <div className="text-[10px] text-slate-500">({delivery.deliveryNumber})</div>}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs text-slate-600 uppercase tracking-wide border-r border-slate-200 sticky left-0 bg-slate-50/50 z-20" style={{ width: '140px' }}>
                        PROFIL
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-slate-600 uppercase tracking-wide border-r border-slate-200 sticky left-[140px] bg-slate-50/50 z-20" style={{ width: '100px' }}>
                        MAG
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-slate-600 uppercase tracking-wide border-r border-slate-200 sticky left-[240px] bg-slate-50/50 z-20" style={{ width: '100px' }}>
                        SUM
                      </th>
                      <th className="px-3 py-2 text-center text-xs text-slate-600 uppercase tracking-wide border-r border-slate-200 sticky left-[340px] bg-slate-50/50 z-20" style={{ width: '100px' }}>
                        <div className="text-xs font-semibold text-slate-700">SUMA {sumColumns}</div>
                      </th>
                      {deliveries.map((delivery) => (
                        <th key={`header-week-${delivery.deliveryId}`} className="px-2 py-2 text-center border-r border-slate-200 whitespace-nowrap relative" style={{ width: '100px', zIndex: 1 }}>
                          <div className="text-xs text-slate-600">tyg. {delivery.week}</div>
                          <div className="text-xs text-slate-500">{delivery.day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, colorGroup.id)}
                  >
                    <SortableContext
                      items={colorGroup.profiles.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {colorGroup.profiles
                          .filter((profile) => profile.deliveries.reduce((sum, d) => sum + d.quantity, 0) > 0)
                          .map((profile, idx) => (
                            <SortableRow
                              key={profile.id}
                              profile={profile}
                              idx={idx}
                              colorGroupId={colorGroup.id}
                              deliveries={deliveries}
                              sumColumns={sumColumns}
                              getSumForColumns={getSumForColumns}
                              handleMagValueChange={handleMagValueChange}
                              handleQuantityChange={handleQuantityChange}
                            />
                          ))}
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-500 text-center">
                Brak profili dla tego koloru
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

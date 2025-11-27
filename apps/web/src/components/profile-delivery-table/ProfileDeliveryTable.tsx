'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { deliveriesApi, profilesApi, colorsApi, ordersApi } from '@/lib/api';

// Funkcja do obliczenia numeru tygodnia
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface DeliveryData {
  week: number;
  day: string;
  date: string;
  quantity: number;
}

interface ProfileRow {
  id: string;
  name: string;
  magValue: number;
  deliveries: DeliveryData[];
}

interface ColorGroup {
  id: string;
  name: string;
  profiles: ProfileRow[];
}

export function ProfileDeliveryTable() {
  const [sumColumns, setSumColumns] = useState(3);
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  // Pobierz wszystkie dostawy do danych o datach
  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['all-deliveries'],
    queryFn: () => deliveriesApi.getAll(),
  });

  // Pobierz wszystkie profile
  const { data: allProfiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => profilesApi.getAll(),
  });

  // Pobierz wszystkie kolory
  const { data: allColors, isLoading: colorsLoading } = useQuery({
    queryKey: ['all-colors'],
    queryFn: () => colorsApi.getAll(),
  });

  // Pobierz sumy zapotrzebowań z zlecen
  const { data: requirementsTotals, isLoading: requirementsLoading } = useQuery({
    queryKey: ['requirements-totals'],
    queryFn: () => ordersApi.getRequirementsTotals(),
  });

  // Load column widths from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('profileDeliveryTableWidths');
    if (saved) {
      try {
        setColumnWidths(JSON.parse(saved));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Inicjalizuj dane gdy są dostępne
  useEffect(() => {
    if (deliveriesData && allProfiles && allColors && requirementsTotals) {
      // Stwórz mapę kolorów po kodzie
      const colorsByCode = new Map<string, any>();
      allColors.forEach((color: any) => {
        colorsByCode.set(color.code, color);
      });

      // Stwórz mapę dat dostaw
      const dateMap = new Map<string, DeliveryData>();

      if (deliveriesData && Array.isArray(deliveriesData)) {
        deliveriesData.forEach((delivery: any) => {
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

          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, {
              week: weekNum,
              day: dayName,
              date: dateStr,
              quantity: 0,
            });
          }
        });
      }

      // Stwórz mapę zapotrzebowań (profileId-colorCode -> totalBeams)
      const requirementsMap = new Map<string, number>();
      if (requirementsTotals && Array.isArray(requirementsTotals)) {
        requirementsTotals.forEach((req: any) => {
          const key = `${req.profileId}-${req.colorCode}`;
          requirementsMap.set(key, req.totalBeams);
        });
      }

      // Pogrupuj profile po kodzie koloru
      const groupMap = new Map<string, { colorName: string; profiles: ProfileRow[] }>();

      // Najpierw dodaj profile z zapotrzebowaniem
      if (requirementsTotals && Array.isArray(requirementsTotals)) {
        requirementsTotals.forEach((req: any) => {
          const profile = allProfiles.find((p: any) => p.id === req.profileId);
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
            groupMap.get(colorCode)!.profiles.push({
              id: profile.id.toString(),
              name: profile.number || profile.name,
              magValue: 0,
              deliveries: Array.from(dateMap.values()).map(d => ({
                ...d,
                quantity: req.totalBeams, // Ustaw ilość z zapotrzebowania
              })),
            });
          }
        });
      }

      // Następnie dodaj profile bez zapotrzebowania (jeśli mają articleNumber)
      allProfiles.forEach((profile: any) => {
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
            magValue: 0,
            deliveries: Array.from(dateMap.values()).map(d => ({
              ...d,
              quantity: 0, // Brak zapotrzebowania
            })),
          });
        }
      });

      // Konwertuj mapę na tablicę ColorGroup
      const groups: ColorGroup[] = Array.from(groupMap.entries())
        .map(([colorCode, { colorName, profiles }]) => ({
          id: colorCode,
          name: colorName,
          profiles: profiles.sort((a, b) => {
            const aNum = parseInt(a.name) || 0;
            const bNum = parseInt(b.name) || 0;
            return aNum - bNum;
          }),
        }))
        .sort((a, b) => {
          return parseInt(a.id) - parseInt(b.id);
        });

      setColorGroups(groups);
    }
  }, [deliveriesData, allProfiles, allColors, requirementsTotals, startDate]);

  const getTotalSum = (deliveries: DeliveryData[]) => {
    return deliveries.reduce((sum, d) => sum + d.quantity, 0);
  };

  const getSumForColumns = (deliveries: DeliveryData[], columns: number) => {
    return deliveries.slice(0, columns).reduce((sum, d) => sum + d.quantity, 0);
  };

  const getAllDates = () => {
    const allDates = new Set<string>();
    colorGroups.forEach((group) => {
      group.profiles.forEach((profile) => {
        profile.deliveries.forEach((delivery) => {
          allDates.add(delivery.date);
        });
      });
    });
    return Array.from(allDates);
  };

  const getAllWeeks = () => {
    const allWeeks = new Set<number>();
    colorGroups.forEach((group) => {
      group.profiles.forEach((profile) => {
        profile.deliveries.forEach((delivery) => {
          allWeeks.add(delivery.week);
        });
      });
    });
    return Array.from(allWeeks).sort((a, b) => a - b);
  };

  const handleQuantityChange = (colorId: string, profileId: string, dateIndex: number, value: string) => {
    setColorGroups(
      colorGroups.map((group) => {
        if (group.id === colorId) {
          return {
            ...group,
            profiles: group.profiles.map((profile) => {
              if (profile.id === profileId) {
                const newDeliveries = [...profile.deliveries];
                if (newDeliveries[dateIndex]) {
                  newDeliveries[dateIndex].quantity = parseInt(value) || 0;
                }
                return { ...profile, deliveries: newDeliveries };
              }
              return profile;
            }),
          };
        }
        return group;
      })
    );
  };

  const handleMagValueChange = (colorId: string, profileId: string, value: string) => {
    setColorGroups(
      colorGroups.map((group) => {
        if (group.id === colorId) {
          return {
            ...group,
            profiles: group.profiles.map((profile) => {
              if (profile.id === profileId) {
                return { ...profile, magValue: parseInt(value) || 0 };
              }
              return profile;
            }),
          };
        }
        return group;
      })
    );
  };

  const handleDeleteProfile = (colorId: string, profileId: string) => {
    setColorGroups(
      colorGroups.map((group) => {
        if (group.id === colorId) {
          return {
            ...group,
            profiles: group.profiles.filter((p) => p.id !== profileId),
          };
        }
        return group;
      })
    );
  };

  const handleColumnWidthChange = (key: string, width: number) => {
    const newWidths = { ...columnWidths, [key]: width };
    setColumnWidths(newWidths);
    localStorage.setItem('profileDeliveryTableWidths', JSON.stringify(newWidths));
  };

  const getColumnWidth = (key: string, defaultWidth: string) => {
    const saved = columnWidths[key];
    return saved ? `${saved}px` : defaultWidth;
  };

  const dates = getAllDates().sort(
    (a, b) => new Date(a.split('.').reverse().join('-')).getTime() - new Date(b.split('.').reverse().join('-')).getTime()
  );

  if (deliveriesLoading || profilesLoading || colorsLoading || requirementsLoading) {
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
          <span className="text-sm font-medium">Sumuj kolumny:</span>
          <Input
            type="number"
            min="1"
            value={sumColumns}
            onChange={(e) => setSumColumns(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-sm font-medium">Od daty:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </label>

        {startDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDate('')}
          >
            Wyczyść filtr
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {colorGroups.map((colorGroup) => (
          <div key={colorGroup.id} className="border rounded-lg overflow-hidden">
            {/* Nagłówek grupy kolorów */}
            <div className="bg-slate-200 px-4 py-2 font-semibold text-sm">
              {colorGroup.name}
            </div>

            {colorGroup.profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="border-collapse bg-white" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: getColumnWidth('profil', '96px') }} />
                    <col style={{ width: getColumnWidth('mag', '64px') }} />
                    <col style={{ width: getColumnWidth('sum', '64px') }} />
                    <col style={{ width: getColumnWidth('sumColumns', '64px') }} />
                    {dates.map((date) => (
                      <col key={`col-${date}`} style={{ width: getColumnWidth(`date-${date}`, '80px') }} />
                    ))}
                    <col style={{ width: getColumnWidth('delete', '40px') }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100 border-b">
                      <th
                        className="px-4 py-2 text-left font-semibold text-sm border-r sticky left-0 bg-slate-100 z-10 relative group"
                        onMouseLeave={() => {}}
                      >
                        <div className="flex items-center justify-between">
                          <span>PROFIL</span>
                          <input
                            type="range"
                            min="60"
                            max="200"
                            defaultValue={columnWidths['profil'] || 96}
                            onChange={(e) => handleColumnWidthChange('profil', parseInt(e.target.value))}
                            className="w-12 opacity-0 group-hover:opacity-100 cursor-col-resize"
                            title="Powiększ kolumnę"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center font-semibold text-sm border-r relative group">
                        <div className="flex items-center justify-between">
                          <span>MAG</span>
                          <input
                            type="range"
                            min="40"
                            max="150"
                            defaultValue={columnWidths['mag'] || 64}
                            onChange={(e) => handleColumnWidthChange('mag', parseInt(e.target.value))}
                            className="w-12 opacity-0 group-hover:opacity-100 cursor-col-resize"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center font-semibold text-sm border-r relative group">
                        <div className="flex items-center justify-between">
                          <span>SUM</span>
                          <input
                            type="range"
                            min="40"
                            max="150"
                            defaultValue={columnWidths['sum'] || 64}
                            onChange={(e) => handleColumnWidthChange('sum', parseInt(e.target.value))}
                            className="w-12 opacity-0 group-hover:opacity-100 cursor-col-resize"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2 text-center font-semibold text-sm border-r bg-orange-100 relative group">
                        <div className="flex items-center justify-between">
                          <span>{sumColumns}</span>
                          <input
                            type="range"
                            min="40"
                            max="150"
                            defaultValue={columnWidths['sumColumns'] || 64}
                            onChange={(e) => handleColumnWidthChange('sumColumns', parseInt(e.target.value))}
                            className="w-12 opacity-0 group-hover:opacity-100 cursor-col-resize"
                          />
                        </div>
                      </th>
                      {dates.map((date) => (
                        <th key={date} className="px-4 py-2 text-center font-semibold text-sm border-r relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs">{date}</span>
                            <input
                              type="range"
                              min="50"
                              max="200"
                              defaultValue={columnWidths[`date-${date}`] || 80}
                              onChange={(e) => handleColumnWidthChange(`date-${date}`, parseInt(e.target.value))}
                              className="w-12 opacity-0 group-hover:opacity-100 cursor-col-resize"
                            />
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-2 text-center font-semibold text-sm relative group">
                        <input
                          type="range"
                          min="30"
                          max="100"
                          defaultValue={columnWidths['delete'] || 40}
                          onChange={(e) => handleColumnWidthChange('delete', parseInt(e.target.value))}
                          className="w-12 opacity-0 group-hover:opacity-100 cursor-col-resize"
                        />
                      </th>
                    </tr>
                    {dates.length > 0 && (
                      <tr className="bg-slate-50 border-b">
                        <th className="px-4 py-2 text-left text-xs text-slate-600 border-r sticky left-0 bg-slate-50 z-10">
                          TYG/DZIEŃ
                        </th>
                        <th className="px-4 py-2 border-r"></th>
                        <th className="px-4 py-2 border-r"></th>
                        <th className="px-4 py-2 border-r"></th>
                        {dates.map((date) => {
                          const delivery = colorGroup.profiles[0]?.deliveries.find((d) => d.date === date);
                          return (
                            <th key={`header-${date}`} className="px-4 py-2 text-center text-xs text-slate-600 border-r">
                              <div>tyg. {delivery?.week || ''}</div>
                              <div>{delivery?.day || ''}</div>
                            </th>
                          );
                        })}
                        <th className="px-4 py-2"></th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {colorGroup.profiles.map((profile, idx) => (
                      <tr key={profile.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-4 py-2 font-medium text-sm border-r sticky left-0 bg-inherit z-10">
                          {profile.name}
                        </td>
                        <td className="px-4 py-2 border-r">
                          <Input
                            type="number"
                            value={profile.magValue}
                            onChange={(e) => handleMagValueChange(colorGroup.id, profile.id, e.target.value)}
                            className="text-center h-8"
                          />
                        </td>
                        <td className="px-4 py-2 text-center font-semibold border-r">
                          {getTotalSum(profile.deliveries)}
                        </td>
                        <td className="px-4 py-2 text-center font-semibold border-r bg-orange-50">
                          {getSumForColumns(profile.deliveries, sumColumns)}
                        </td>
                        {profile.deliveries.map((delivery, dateIdx) => (
                          <td key={`${profile.id}-${dateIdx}`} className="px-4 py-2 text-center border-r">
                            <Input
                              type="number"
                              value={delivery.quantity}
                              onChange={(e) => handleQuantityChange(colorGroup.id, profile.id, dateIdx, e.target.value)}
                              className="text-center h-8"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProfile(colorGroup.id, profile.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-slate-500">
                Brak profili dla tego koloru
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

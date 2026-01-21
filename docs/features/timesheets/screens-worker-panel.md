# Timesheets - Panel Edycji Pracownika

## Cel panelu

- Edycja WSZYSTKICH danych pracownika na dany dzień
- Widoczność struktury czasu pracy
- Możliwość dodania wielu zadań nieprodukcyjnych
- Możliwość dodania wielu nietypówek

---

## Struktura layoutu

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PANEL BOCZNY (szerokość: 400px, fixed right)                            │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  HEADER                                                             │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ← Zamknij                              Jan Kowalski          │  │ │
│  │  │                                          3 stycznia 2026      │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 1: STANOWISKO                                               │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Stanowisko                                                   │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐│  │ │
│  │  │  │  Produkcja ▼ (domyślne)                                  ││  │ │
│  │  │  └──────────────────────────────────────────────────────────┘│  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 2: CZAS PRODUKCYJNY                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Godziny produkcyjne                                          │  │ │
│  │  │  ┌─────────────┐                                              │  │ │
│  │  │  │    8      h │  ← input numeryczny                          │  │ │
│  │  │  └─────────────┘                                              │  │ │
│  │  │  Czas pracy przy standardowych oknach                         │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 3: CZAS NIEPRODUKCYJNY (collapsible)                        │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ▼ Godziny nieprodukcyjne (2h)                    [+ Dodaj]  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐│  │ │
│  │  │  │  Pakowanie          │   1h   │  [usun]                   ││  │ │
│  │  │  │  Przygotowanie prof.│   1h   │  [usun]                   ││  │ │
│  │  │  └──────────────────────────────────────────────────────────┘│  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  SEKCJA 4: NIETYPÓWKI (collapsible)                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  ▼ Nietypówki (4h)                                [+ Dodaj]  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐│  │ │
│  │  │  │  Drzwi              │   2h   │  [usun]                   ││  │ │
│  │  │  │  HS                 │   2h   │  [usun]                   ││  │ │
│  │  │  └──────────────────────────────────────────────────────────┘│  │ │
│  │  │                                                               │  │ │
│  │  │  Info: Nietypówki nie wliczają się do standardowej wydajności │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  PODSUMOWANIE                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Produkcyjne:      8h  ████████████░░░░░░░░                  │  │ │
│  │  │  Nieprodukcyjne:   2h  ██░░░░░░░░░░░░░░░░░░                  │  │ │
│  │  │  Nietypówki:       4h  ████░░░░░░░░░░░░░░░░                  │  │ │
│  │  │  ─────────────────────────────────────────                   │  │ │
│  │  │  RAZEM:           14h                                        │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  FOOTER                                                             │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │                [Anuluj]        [Zapisz zmiany]               │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sekcje szczegółowo

### SEKCJA 1: Stanowisko

```tsx
<FormField label="Stanowisko">
  <Select
    value={position}
    onChange={setPosition}
    options={[
      { value: 'production', label: 'Produkcja', isDefault: true },
      { value: 'montaz', label: 'Montaż' },
      { value: 'szklarnia', label: 'Szklarnia' },
      // ... lista ze słownika
    ]}
  />
  {position !== defaultPosition && (
    <span className="text-amber-600 text-sm">
      ⚠ Zmienione z domyślnego
    </span>
  )}
</FormField>
```

### SEKCJA 2: Czas produkcyjny

```tsx
<FormField label="Godziny produkcyjne" hint="Czas pracy przy standardowych oknach">
  <div className="flex items-center gap-2">
    <Input
      type="number"
      value={productiveHours}
      onChange={(e) => setProductiveHours(Number(e.target.value))}
      min={0}
      max={24}
      step={0.5}
      className="w-20"
    />
    <span className="text-gray-500">h</span>
  </div>
</FormField>
```

**Uwaga:** Brak limitu 8h - pracownik może mieć 12h produkcyjnych.

### SEKCJA 3: Czas nieprodukcyjny

```tsx
<Collapsible open={nonProductiveOpen} onOpenChange={setNonProductiveOpen}>
  <CollapsibleTrigger className="flex items-center justify-between w-full">
    <span>
      Godziny nieprodukcyjne
      {totalNonProductive > 0 && (
        <Badge variant="secondary" className="ml-2">{totalNonProductive}h</Badge>
      )}
    </span>
    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); addTask(); }}>
      + Dodaj
    </Button>
  </CollapsibleTrigger>

  <CollapsibleContent>
    {nonProductiveTasks.map((task, index) => (
      <div key={index} className="flex items-center gap-2 py-2 border-b">
        <Select
          value={task.type}
          onChange={(value) => updateTask(index, 'type', value)}
          options={nonProductiveTypes}
          className="flex-1"
        />
        <Input
          type="number"
          value={task.hours}
          onChange={(e) => updateTask(index, 'hours', Number(e.target.value))}
          className="w-16"
          min={0}
          step={0.5}
        />
        <span className="text-gray-500">h</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeTask(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </CollapsibleContent>
</Collapsible>
```

**Lista zadań nieprodukcyjnych (ze słownika):**
- Pakowanie
- Przygotowanie profili
- Serwis
- Palety
- Inne

### SEKCJA 4: Nietypówki

Identyczna struktura jak nieprodukcyjne, ale z inną listą typów:
- Drzwi
- HS
- PSK
- Szprosy
- Trapez

**Uwaga w UI:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
  Info: Nietypówki są rejestrowane do przyszłej analizy wydajności.
</div>
```

---

## Wizualizacja podsumowania

```tsx
<div className="bg-gray-50 rounded-lg p-4">
  <h4 className="font-medium mb-3">Struktura dnia pracy</h4>

  <div className="space-y-2">
    <ProgressBar
      label="Produkcyjne"
      value={productiveHours}
      max={14}
      color="green"
    />
    <ProgressBar
      label="Nieprodukcyjne"
      value={totalNonProductive}
      max={14}
      color="amber"
    />
    <ProgressBar
      label="Nietypówki"
      value={totalSpecial}
      max={14}
      color="blue"
    />
  </div>

  <div className="border-t mt-3 pt-3 flex justify-between font-medium">
    <span>RAZEM:</span>
    <span>{totalHours}h</span>
  </div>
</div>
```

---

## Zobacz też

- [Filozofia projektowa](design-philosophy.md)
- [Kalendarz miesięczny](screens-calendar.md)
- [Widok dnia](screens-day-view.md)
- [Słowniki Admin](admin-dictionaries.md)

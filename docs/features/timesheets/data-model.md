# Timesheets - Model Danych (Prisma)

## Schemat bazy danych

```prisma
// Pracownik
model Worker {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  defaultPosition String   // ID pozycji domyślnej
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  timeEntries     TimeEntry[]
}

// Stanowisko
model Position {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// Zadanie nieprodukcyjne (typ)
model NonProductiveTaskType {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// Typ nietypówki
model SpecialWorkType {
  id        String   @id @default(cuid())
  name      String   @unique  // np. "Drzwi", "HS", "PSK"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// Główny wpis godzinówki (dzień + pracownik)
model TimeEntry {
  id               String   @id @default(cuid())
  date             DateTime @db.Date
  workerId         String
  worker           Worker   @relation(fields: [workerId], references: [id])

  positionId       String
  productiveHours  Decimal  @default(0) @db.Decimal(4, 1)  // np. 8.5

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  nonProductiveTasks NonProductiveTask[]
  specialWorks       SpecialWork[]

  @@unique([date, workerId])
}

// Zadanie nieprodukcyjne (wiele na jeden TimeEntry)
model NonProductiveTask {
  id           String   @id @default(cuid())
  timeEntryId  String
  timeEntry    TimeEntry @relation(fields: [timeEntryId], references: [id], onDelete: Cascade)

  taskTypeId   String
  hours        Decimal  @db.Decimal(4, 1)

  createdAt    DateTime @default(now())
}

// Nietypówka (wiele na jeden TimeEntry)
model SpecialWork {
  id           String   @id @default(cuid())
  timeEntryId  String
  timeEntry    TimeEntry @relation(fields: [timeEntryId], references: [id], onDelete: Cascade)

  specialTypeId String
  hours         Decimal  @db.Decimal(4, 1)

  createdAt     DateTime @default(now())
}

// Konfiguracja dni wolnych
model WorkingDay {
  id        String   @id @default(cuid())
  date      DateTime @db.Date @unique
  isHoliday Boolean  @default(false)
  note      String?  // np. "Boże Narodzenie"
}
```

---

## Relacje

```
Worker (1) ──────────── (N) TimeEntry
                              │
                              ├── (N) NonProductiveTask
                              │
                              └── (N) SpecialWork

Position (słownik)
NonProductiveTaskType (słownik)
SpecialWorkType (słownik)
WorkingDay (konfiguracja)
```

---

## Kluczowe decyzje

### Dlaczego `Decimal` dla godzin?

Godziny mogą być ułamkowe (0.5h, 1.5h). `Decimal(4, 1)` pozwala na wartości 0.0 - 999.9 z dokładnością do 0.1h.

### Dlaczego `@@unique([date, workerId])`?

Jeden pracownik może mieć tylko jeden wpis na jeden dzień. Zapobiega duplikatom.

### Dlaczego `onDelete: Cascade`?

Gdy usuwamy TimeEntry, automatycznie usuwamy powiązane NonProductiveTask i SpecialWork.

### Dlaczego słowniki mają `isActive`?

Soft delete - nie kasujemy typów zadań, tylko je dezaktywujemy. Historyczne dane zachowują odniesienie.

---

## Zobacz też

- [Filozofia projektowa](design-philosophy.md)
- [Słowniki Admin](admin-dictionaries.md)
- [Implementacja](implementation.md)

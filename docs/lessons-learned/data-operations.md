# Lessons Learned - Data Operations & UX

> Błędy związane z operacjami na danych (usuwanie, tworzenie) i UX buttonów.

---

## 2025-12-XX - Przypadkowe usunięcie dostawy z 50 zleceniami

**Co się stało:**
Użytkownik przypadkowo kliknął "Usuń" przy dostawie zawierającej 50 zleceń. Jeden klik - dostawa znikła NA ZAWSZE. Zlecenia pozostały ale nieprzypisane. Brak możliwości odzyskania.

**Root cause:**
```typescript
// Niebezpieczny kod
<Button onClick={() => deleteDelivery(id)}>
  <TrashIcon /> Usuń
</Button>

// Backend
async delete(id: number) {
  await prisma.delivery.delete({ where: { id } }); // <- HARD DELETE!
}
```

Brak:
- Confirmation dialog
- Soft delete (deletedAt)
- Audit log
- Możliwości undo

**Impact:**
- Poważny: 4 godziny ręcznego przypisywania zleceń z powrotem
- Część zleceń była przypisana do złej dostawy
- Użytkownik stracił zaufanie do systemu
- Ryzyko ponownego wystąpienia (każde kliknięcie = katastrofa)

**Fix:**

1. **Soft delete** (schema):
```prisma
model Delivery {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")
  @@index([deletedAt])
}
```

2. **Confirmation dialog** (frontend):
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">
      <TrashIcon /> Usuń
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Czy na pewno usunąć?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna. Dostawa #{delivery.id}
        zostanie trwale usunięta. {delivery.ordersCount} zleceń
        stanie się nieprzypisanych.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Usuń trwale
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

3. **Soft delete** (backend):
```typescript
async delete(id: number) {
  await prisma.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
}

// W queries
findMany({ where: { deletedAt: null } })
```

**Prevention:**
1. Soft delete dla WSZYSTKICH modeli (43/44 modeli!)
2. Confirmation dla destructive actions
3. Wyjaśnienie konsekwencji w dialogu
4. "Kosz" z możliwością restore (opcjonalnie)
5. Audit log (kto, kiedy, co usunął)

**Lekcja:** **Jeden klik użytkownika NIGDY nie powinien być nieodwracalny**. Zawsze: confirmation + soft delete + możliwość undo (przez admin).

---

## 2025-12-XX - Double-submit utworzył 3 duplikaty dostawy

**Co się stało:**
Użytkownik kliknął "Utwórz dostawę" 3 razy (bo przycisk nie reagował natychmiast). W bazie utworzyły się 3 identyczne dostawy.

**Root cause:**
```typescript
// Problematyczny kod
const { mutate: createDelivery } = useMutation(...);

<Button onClick={() => createDelivery(data)}>
  Utwórz dostawę
</Button>
```

Brak:
- `disabled` podczas mutacji
- Wizualnego feedbacku (loading)
- Debounce/throttle

**Impact:**
- Niski-Średni: Duplikaty w bazie (łatwe do usunięcia)
- Confusion użytkownika ("dlaczego 3 dostawy?")
- Race condition w backend (możliwe większe problemy)

**Fix:**
```typescript
// Poprawiony kod
const { mutate: createDelivery, isPending } = useMutation(...);

<Button
  onClick={() => createDelivery(data)}
  disabled={isPending} // <- KLUCZOWE!
>
  {isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Tworzenie...
    </>
  ) : (
    'Utwórz dostawę'
  )}
</Button>
```

**Prevention:**
1. WSZYSTKIE mutacje: `disabled={isPending}`
2. Visual feedback podczas operacji
3. Opcjonalnie: debounce dla submit buttons
4. Backend: idempotency tokens (advanced)

**Lekcja:** Użytkownik ZAWSZE kliknie więcej razy niż myślisz. Buttony muszą być disabled podczas operacji.

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)

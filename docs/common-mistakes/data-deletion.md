# Usuwanie danych

[< Powrot do spisu tresci](README.md)

---

## DON'T - Hard delete bez confirmation

```typescript
// NIEBEZPIECZNE - dane znikaja NA ZAWSZE
await prisma.delivery.delete({ where: { id } });
```

**Dlaczego:** Uzytkownik moze przypadkowo kliknac. Brak undo. Brak audytu.

---

## DO - Soft delete + confirmation dialog

```typescript
// POPRAWNIE

// 1. Frontend: Pokaz confirmation dialog
const handleDelete = async () => {
  const confirmed = await showConfirmDialog({
    title: 'Czy na pewno usunac?',
    description: 'Ta operacja jest nieodwracalna. Dostawa zostanie trwale usunieta.',
    confirmText: 'Usun',
    cancelText: 'Anuluj'
  });

  if (!confirmed) return;

  // 2. Backend: Soft delete
  await prisma.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};

// 3. Queries: Filtruj usuniete
const deliveries = await prisma.delivery.findMany({
  where: { deletedAt: null } // wykluczamy usuniete
});
```

---

## Gdzie sprawdzic

- Schema: [apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma) - `deletedAt DateTime?`
- Przyklad: Order model ma `archivedAt`

---

## Kluczowe zasady

1. **Zawsze soft delete** - ustawiaj `deletedAt` zamiast usuwac rekord
2. **Zawsze confirmation dialog** - przed kazdym usunieciem
3. **Filtruj w queries** - `where: { deletedAt: null }`
4. **Wyjasniaj konsekwencje** - w dialogu opisz co sie stanie

---

[< Powrot do spisu tresci](README.md)

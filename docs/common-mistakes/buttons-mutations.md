# Buttony i mutacje

[< Powrot do spisu tresci](README.md)

---

## DON'T - Buttony bez disabled podczas operacji

```typescript
// ZLE - uzytkownik moze kliknac 5x -> 5 requestow
const { mutate: deleteOrder } = useMutation(...);

<Button onClick={() => deleteOrder(id)}>
  Usun zlecenie
</Button>
```

**Konsekwencja:** Double-submit, race conditions, duplikaty w bazie!

---

## DO - Disabled + loading state

```typescript
// POPRAWNIE
const { mutate: deleteOrder, isPending } = useMutation(...);

<Button
  onClick={() => deleteOrder(id)}
  disabled={isPending} // <- KLUCZOWE!
>
  {isPending ? 'Usuwanie...' : 'Usun zlecenie'}
</Button>
```

---

## Pelny przyklad z React Query

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function DeleteOrderButton({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => ordersApi.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Zlecenie usuniete' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Blad',
        description: error.message
      });
    }
  });

  return (
    <Button
      variant="destructive"
      onClick={() => mutate()}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Usuwanie...
        </>
      ) : (
        'Usun zlecenie'
      )}
    </Button>
  );
}
```

---

## Kluczowe zasady

1. **Zawsze `disabled={isPending}`** - zapobiega wielokrotnym kliknieciem
2. **Zawsze loading state** - uzytkownik wie ze cos sie dzieje
3. **Rozważ spinner** - ikona `Loader2` z lucide-react
4. **Rozważ toast** - feedback po zakonczeniu operacji

---

[< Powrot do spisu tresci](README.md)

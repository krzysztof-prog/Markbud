# OKUC Components

## ArticlesTable

Tabela artykułów okuć z funkcjami sortowania, edycji i usuwania.

### Props

```typescript
interface ArticlesTableProps {
  articles: OkucArticle[];          // Lista artykułów do wyświetlenia
  isLoading?: boolean;               // Opcjonalnie - dla spinnerów (obecnie nieużywane)
  onEdit: (articleId: number) => void;      // Callback wywoływany przy kliknięciu Edit
  onDelete: (articleId: number) => void;    // Callback wywoływany po potwierdzeniu Delete
  isDeletingId?: number;             // ID artykułu który jest aktualnie usuwany (dla disabled state)
}
```

### Funkcjonalności

1. **Sortowanie** - domyślnie po `articleId` (ascending):
   - articleId (Numer artykułu)
   - name (Nazwa)
   - orderClass (Typ zamówienia)
   - sizeClass (Rozmiar)

2. **Kolumny**:
   - Numer artykułu (font-mono)
   - Nazwa + opis (opcjonalnie)
   - PVC (Check/X - zielony/czerwony)
   - ALU (Check/X - zielony/czerwony)
   - Typ zamówienia (Badge niebieski)
   - Rozmiar (Badge niebieski)
   - Akcje (Edit + Delete)

3. **Confirmation Dialog** (inline):
   - Pojawia się przed usunięciem
   - Pokazuje numer i nazwę artykułu
   - Komunikat o nieodwracalności operacji
   - Przyciski: Anuluj + Usuń artykuł

4. **Empty State**:
   - "Brak artykułów spełniających kryteria"
   - "Kliknij 'Dodaj artykuł' aby utworzyć pierwszy."

5. **Horizontal Scroll** na mobile (overflow-auto)

6. **Disabled State**:
   - Wszystkie przyciski disabled gdy `isDeletingId !== undefined`
   - Delete button pokazuje "Usuwanie..." podczas operacji

### Przykład użycia

```tsx
import { ArticlesTable } from '@/features/okuc/components/ArticlesTable';
import { useQuery, useMutation } from '@tanstack/react-query';

function ArticlesPage() {
  const { data: articles } = useQuery({
    queryKey: ['okuc-articles'],
    queryFn: fetchArticles,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteArticle(id),
    onSuccess: () => {
      // Invalidate query, show toast, etc.
    },
  });

  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  const handleEdit = (articleId: number) => {
    // Znajdź artykuł i otwórz formularz edycji
    const article = articles?.find(a => a.id === articleId);
    if (article) {
      setSelectedArticle(article);
      setIsFormOpen(true);
    }
  };

  const handleDelete = (articleId: number) => {
    // Usuń artykuł - confirmation jest obsługiwany wewnątrz ArticlesTable
    setSelectedArticleId(articleId);
    deleteMutation.mutate(articleId);
  };

  return (
    <ArticlesTable
      articles={articles || []}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isDeletingId={deleteMutation.isPending ? selectedArticleId : undefined}
    />
  );
}
```

### Best Practices

1. **Mutation State**: Rodzic zarządza stanem `isPending` i przekazuje `isDeletingId`
2. **Toasts**: Rodzic pokazuje toasty po akcjach (success/error)
3. **Query Invalidation**: Rodzic invaliduje query po sukcesie
4. **Loading**: Rodzic pokazuje skeleton podczas ładowania danych
5. **Error Handling**: Rodzic pokazuje błędy wczytywania danych

### Styling

- TailwindCSS classes
- Shadcn/ui components (Table, Dialog, Button, Badge)
- Lucide icons (Check, X, Edit, Trash2)
- Blue badges dla orderClass/sizeClass
- Green Check / Red X dla PVC/ALU
- Hover states na sortowaniu i akcjach

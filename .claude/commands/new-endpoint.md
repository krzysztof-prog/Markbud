# Nowy Endpoint API

Kreator nowego endpointu zgodnie z architekturą projektu: Route → Handler → Service → Repository.

## Jak używać

Podaj:
1. **Nazwa zasobu** (np. "delivery", "pallet", "glass-order")
2. **Typ operacji**: GET (list), GET (one), POST, PUT, DELETE
3. **Opis** co endpoint ma robić

## Przykłady

```
/new-endpoint delivery POST - tworzenie nowej dostawy
/new-endpoint order GET list - lista zleceń z filtrowaniem
/new-endpoint pallet PUT - aktualizacja palety
```

## Co wygeneruję

### 1. Route (apps/api/src/routes/{resource}Routes.ts)
```typescript
// Nowy route z dokumentacją Swagger
fastify.post('/{resource}', {
  schema: {
    description: 'Opis operacji',
    tags: ['{Resource}'],
    body: Create{Resource}Schema,
    response: {
      200: {Resource}ResponseSchema,
      400: ErrorResponseSchema
    }
  }
}, {resource}Handler.create);
```

### 2. Handler (apps/api/src/handlers/{resource}Handler.ts)
```typescript
// Handler z walidacją Zod (BEZ try-catch - middleware obsługuje błędy)
export async function create(
  request: FastifyRequest<{ Body: Create{Resource}Input }>,
  reply: FastifyReply
) {
  const validated = Create{Resource}Schema.parse(request.body);
  const result = await {resource}Service.create(validated);
  return reply.send(result);
}
```

### 3. Service (apps/api/src/services/{resource}Service.ts)
```typescript
// Logika biznesowa
export async function create(data: Create{Resource}Input): Promise<{Resource}> {
  // Walidacja biznesowa
  // Wywołanie repository
  return {resource}Repository.create(data);
}
```

### 4. Repository (apps/api/src/repositories/{resource}Repository.ts)
```typescript
// Operacje na bazie danych
export async function create(data: Create{Resource}Input): Promise<{Resource}> {
  return prisma.{resource}.create({
    data: {
      ...data,
      createdAt: new Date()
    }
  });
}
```

### 5. Zod Schema (apps/api/src/validators/{resource}Validators.ts)
```typescript
import { z } from 'zod';

export const Create{Resource}Schema = z.object({
  // Pola z walidacją
});

export type Create{Resource}Input = z.infer<typeof Create{Resource}Schema>;
```

## Checklist generowania

- [ ] Sprawdzam czy model Prisma istnieje
- [ ] Sprawdzam istniejące pliki (nie nadpisuję)
- [ ] Dodaję do istniejących routes jeśli plik istnieje
- [ ] Używam money.ts dla kwot (valuePln, valueEur)
- [ ] Soft delete dla operacji DELETE
- [ ] Transakcje dla powiązanych operacji

## Teraz

Podaj nazwę zasobu i typ operacji, a wygeneruję kompletny endpoint:

```
Przykład: "delivery POST - tworzenie dostawy z przypisaniem zleceń"
```

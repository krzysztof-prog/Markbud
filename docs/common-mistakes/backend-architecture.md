# Architektura Backend

[< Powrot do spisu tresci](README.md)

---

## Handlery - bledy

### DON'T - Lokalne try-catch w handlerach

```typescript
// ZLE - handler obsluguje bledy lokalnie
async getCalendarBatch(request, reply) {
  try {
    const data = await this.service.getData();
    return reply.send(data);
  } catch (error) {
    // Manualna obsluga - niepotrzebna!
    return reply.status(500).send({ error: 'Failed' });
  }
}
```

**Dlaczego:** Middleware `error-handler.ts` obsluguje bledy globalnie!

### DO - Throwuj bledy, middleware je zlapie

```typescript
// POPRAWNIE
async getCalendarBatch(request, reply) {
  // Walidacja
  const validated = schema.parse(request.query); // ZodError -> middleware -> 400

  // Logika
  const data = await this.service.getData(); // AppError -> middleware -> 500

  // Response
  return reply.send(data);
}

// Middleware automatycznie obsluguje:
// - ZodError -> 400 + szczegoly walidacji
// - PrismaError -> 400/404/500 + przyczyna
// - AppError -> custom status + message
```

**Gdzie sprawdzic:** [apps/api/src/middleware/error-handler.ts](../../apps/api/src/middleware/error-handler.ts)

---

## Baza danych - Prisma

### DON'T - Uzywaj `db:push`

```powershell
# NIGDY! - kasuje dane bez ostrzezenia
pnpm db:push
```

**Konsekwencja:** Utrata wszystkich danych w bazie!

### DO - ZAWSZE uzywaj migracji

```powershell
# POPRAWNIE
pnpm db:migrate
```

**Dlaczego:** Migracje zachowuja dane + historia zmian + rollback mozliwy.

---

## Transakcje

### DON'T - Transakcje bez proper error handling

```typescript
// ZLE - co jesli failuje w polowie?
await prisma.order.create({ data: orderData });
await prisma.delivery.update({ where: { id }, data: { ... } });
// Jesli 2. failuje -> order utworzony ale delivery nie!
```

### DO - Uzywaj $transaction

```typescript
// POPRAWNIE
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.delivery.update({
    where: { id },
    data: { orderId: order.id }
  });
  // Albo oba sie udaja, albo zadne!
});
```

**Gdzie sprawdzic:** [docs/guides/transactions.md](../guides/transactions.md)

---

## API - Kompresja gzip

### DON'T - Wlaczaj kompresje gzip z CORS

```typescript
// ZLE - powoduje puste odpowiedzi w przegladarce!
import compress from '@fastify/compress';

await fastify.register(compress, {
  global: true,
  threshold: 1024,
  encodings: ['gzip', 'deflate'],
});
```

**Blad:** JSON parse error "Unexpected end of JSON input" - przegladarka otrzymuje `content-length: 0`

**Dlaczego:** Kompresja gzip w polaczeniu z CORS powoduje ze przegladarka otrzymuje pusta odpowiedz mimo statusu 200. curl dziala poprawnie, ale przegladarka nie.

### DO - Nie uzywaj kompresji dla malych odpowiedzi API

```typescript
// POPRAWNIE - dla 5-10 uzytkownikow kompresja nie jest potrzebna
// Odpowiedzi API sa male (kilka-kilkadziesiat KB), siec lokalna jest szybka

// Albo zwieksz threshold do bardzo duzych wartosci:
await fastify.register(compress, {
  global: true,
  threshold: 1024000, // 1MB - praktycznie wylacza dla JSON API
});
```

**Kiedy kompresja ma sens:**
- Duze pliki statyczne (JS bundles, CSS)
- Eksport duzych plikow (CSV, PDF)
- Aplikacje z tysiacami uzytkownikow przez internet

**Kiedy kompresja NIE ma sensu:**
- API zwracajace JSON (zazwyczaj <100KB)
- Aplikacje na lokalnej sieci (5-10 uzytkownikow)
- Gdy masz problemy z pustymi odpowiedziami

---

## Kluczowe zasady

1. **Nie try-catch w handlerach** - middleware obsluguje bledy
2. **Zawsze db:migrate** - nigdy db:push
3. **Transakcje dla powiazanych operacji** - $transaction
4. **Uwazaj z kompresja** - moze powodowac problemy z CORS

---

[< Powrot do spisu tresci](README.md)

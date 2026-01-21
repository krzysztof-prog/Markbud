# Lessons Learned - Testing

> Błędy związane z brakiem testów i regresjami.

---

## 2026-01-02 - Brak testów = regresja w deliveryService

**Co się stało:**
Zmiana w `deliveryService.ts` (dodanie nowego pola) złamała `importService.ts` który używał delivery API. Wykryto dopiero na produkcji - crash podczas importu.

**Root cause:**
```
Backend tests: 32 pliki (przy 200+ plikach kodu)
Frontend tests: 0 plików (!!)

Critical paths BEZ testów:
- importService.ts (1139 linii) - 0 testów
- deliveryService.ts - 0 testów
- orderService.ts - 0 testów
```

**Impact:**
- Średni-Poważny: Produkcja down przez 2 godziny
- Hotfix w środku dnia
- Utrata zaufania
- Ryzyko regresjii w każdym deploy

**Fix:**
```typescript
// Testy przynajmniej dla critical paths
describe('DeliveryService', () => {
  describe('create', () => {
    it('should create delivery with valid data', async () => {
      const delivery = await service.create(validDeliveryData);
      expect(delivery).toBeDefined();
      expect(delivery.status).toBe('planned');
    });

    it('should throw ValidationError for missing required fields', async () => {
      await expect(service.create({ /* brak deliveryDate */ }))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('addOrderToDelivery', () => {
    it('should add order successfully', async () => {
      const result = await service.addOrderToDelivery(deliveryId, orderId);
      expect(result.ordersCount).toBe(1);
    });

    it('should throw if order already in another delivery', async () => {
      // ... setup
      await expect(service.addOrderToDelivery(deliveryId2, orderId))
        .rejects.toThrow('Order already assigned');
    });
  });
});
```

**Prevention:**
1. MINIMUM: Happy path tests dla każdego service
2. Critical paths: Happy + sad path tests
3. CI/CD: Tests must pass before deploy
4. Coverage goal: 60% backend, 40% frontend (realistyczne)

**Lekcja:** "It works on my machine" nie znaczy "It works". **Tests są dokumentacją jak kod powinien działać** + safety net przed regresjami.

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)

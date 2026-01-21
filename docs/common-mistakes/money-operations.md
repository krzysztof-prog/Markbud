# Operacje na pieniadzach

[< Powrot do spisu tresci](README.md)

---

## DON'T - Uzywaj parseFloat/toFixed na wartosciach pienieznych

```typescript
// KATASTROFALNY BLAD
const total = parseFloat(order.valuePln); // wyswietli 10000 zamiast 100 PLN!
const formatted = order.valuePln.toFixed(2); // "10000.00" zamiast "100.00"
```

**Dlaczego:** Wartosci w bazie sa w **groszach (integer)**, nie zlotowkach!

---

## DO - ZAWSZE uzywaj funkcji z money.ts

```typescript
// POPRAWNIE
import { groszeToPln, plnToGrosze, formatGrosze } from './utils/money';

const totalPln = groszeToPln(order.valuePln as Grosze); // 10000 groszy -> 100 PLN
const formatted = formatGrosze(order.valuePln as Grosze); // "100,00 zl"

// Przy zapisie do bazy:
const grosze = plnToGrosze(100); // 100 PLN -> 10000 groszy
```

**Gdzie sprawdzic:** [apps/api/src/utils/money.ts](../../apps/api/src/utils/money.ts)

---

## Kluczowe zasady

1. **W bazie danych** - zawsze grosze (integer)
2. **Przy wyswietlaniu** - uzyj `groszeToPln()` lub `formatGrosze()`
3. **Przy zapisie** - uzyj `plnToGrosze()`
4. **Nigdy** - `parseFloat`, `toFixed`, dzielenie przez 100 recznie

---

[< Powrot do spisu tresci](README.md)
